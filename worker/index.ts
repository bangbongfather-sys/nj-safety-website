/**
 * NJ SAFETY — Cloudflare Worker.
 *
 * Two jobs:
 *
 *   1. `PUT /api/admin/upload-image?key=<path>` — admin image uploads.
 *      Authenticates the caller against GitHub (the same PAT the admin
 *      already uses), writes the binary body to the IMAGES_R2 bucket
 *      under <key>, and returns the public URL the dict should reference.
 *      Side-steps the Cloudflare build/deploy cycle entirely — uploads
 *      go live the moment the R2 PUT acknowledges.
 *
 *   2. Everything else — passes through to env.ASSETS (the Workers
 *      Static Assets binding that serves `out/`). Same behaviour the
 *      site had before this Worker existed.
 */

interface R2Bucket {
  put(
    key: string,
    body: ArrayBuffer | ReadableStream | Blob,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<unknown>;
  delete(key: string): Promise<void>;
}

interface Env {
  /** Auto-bound by `[assets]` in wrangler.jsonc — serves the static export. */
  ASSETS: Fetcher;
  /** R2 bucket for admin-uploaded images. Set via wrangler.jsonc r2_buckets. */
  IMAGES_R2: R2Bucket;
  /** Public base URL of the R2 bucket (R2.dev subdomain or custom domain). */
  R2_PUBLIC_BASE: string;
  /** GitHub login allowed to upload. Defaults to bangbongfather-sys. */
  ADMIN_GH_LOGIN?: string;
}

// Allow only safe path characters in R2 keys. Reject "..", absolute paths,
// query strings — anything that could be smuggled to escape the bucket
// or generate weird URLs.
const KEY_RE = /^[a-z0-9_\-./]+$/i;

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

async function verifyGitHubPat(pat: string): Promise<{ ok: true; login: string } | { ok: false; reason: string }> {
  try {
    const r = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${pat}`,
        'User-Agent': 'nj-safety-uploader',
        Accept: 'application/vnd.github+json',
      },
    });
    if (!r.ok) return { ok: false, reason: `github ${r.status}` };
    const data = (await r.json()) as { login?: string };
    if (!data.login) return { ok: false, reason: 'no login on github response' };
    return { ok: true, login: data.login };
  } catch (e: unknown) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

async function handleUpload(req: Request, env: Env): Promise<Response> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('token ')) {
    return new Response('Missing token (Authorization: token <PAT>)', {
      status: 401,
      headers: corsHeaders(),
    });
  }
  const pat = auth.slice(6).trim();
  const verify = await verifyGitHubPat(pat);
  if (!verify.ok) {
    return new Response(`Auth failed: ${verify.reason}`, { status: 401, headers: corsHeaders() });
  }
  const allowed = env.ADMIN_GH_LOGIN || 'bangbongfather-sys';
  if (verify.login !== allowed) {
    return new Response(`Forbidden: ${verify.login} (need ${allowed})`, {
      status: 403,
      headers: corsHeaders(),
    });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (!key) {
    return new Response('Missing ?key=', { status: 400, headers: corsHeaders() });
  }
  if (!KEY_RE.test(key) || key.includes('..')) {
    return new Response(`Invalid key: ${key}`, { status: 400, headers: corsHeaders() });
  }

  const blob = await req.arrayBuffer();
  if (blob.byteLength === 0) {
    return new Response('Empty body', { status: 400, headers: corsHeaders() });
  }
  if (blob.byteLength > 20 * 1024 * 1024) {
    return new Response('File too large (max 20 MB)', { status: 413, headers: corsHeaders() });
  }

  const contentType = req.headers.get('Content-Type') ?? 'application/octet-stream';
  try {
    await env.IMAGES_R2.put(key, blob, { httpMetadata: { contentType } });
  } catch (e: unknown) {
    return new Response(`R2 put failed: ${e instanceof Error ? e.message : String(e)}`, {
      status: 500,
      headers: corsHeaders(),
    });
  }

  const base = (env.R2_PUBLIC_BASE || '').replace(/\/+$/, '');
  const publicUrl = `${base}/${key}`;
  return new Response(JSON.stringify({ ok: true, key, publicUrl, size: blob.byteLength }), {
    status: 200,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname === '/api/admin/upload-image' && req.method === 'PUT') {
      return handleUpload(req, env);
    }

    // Everything else — static assets passthrough.
    return env.ASSETS.fetch(req);
  },
};
