/**
 * NJ SAFETY — Cloudflare Worker.
 *
 * Three jobs:
 *
 *   1. `PUT /api/admin/upload-image?key=<path>` — admin image uploads.
 *      Authenticates the caller against GitHub (the same PAT the admin
 *      already uses), writes the binary body to the IMAGES_R2 bucket
 *      under <key>, and returns the public URL the dict should reference.
 *      Side-steps the Cloudflare build/deploy cycle entirely — uploads
 *      go live the moment the R2 PUT acknowledges.
 *
 *   2. The 문의(inquiry) inbox. `POST /api/contact` stores each public
 *      submission as a JSON object in R2 under `inquiries/`; the
 *      `/api/admin/inquiries*` routes let the admin UI read, mark and
 *      delete them. There is deliberately NO email in this path — see
 *      the note on handleContact.
 *
 *   3. Everything else — passes through to env.ASSETS (the Workers
 *      Static Assets binding that serves `out/`). Same behaviour the
 *      site had before this Worker existed.
 */

interface R2ObjectMeta {
  key: string;
  size: number;
  uploaded: Date;
}
interface R2ObjectBody extends R2ObjectMeta {
  text(): Promise<string>;
}
interface R2Bucket {
  put(
    key: string,
    body: ArrayBuffer | ReadableStream | Blob | string,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
  list(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ objects: R2ObjectMeta[]; truncated: boolean; cursor?: string }>;
}

interface Env {
  /** Auto-bound by `[assets]` in wrangler.jsonc — serves the static export. */
  ASSETS: Fetcher;
  /** R2 bucket for admin-uploaded images + the 문의 inbox. Set via wrangler.jsonc r2_buckets. */
  IMAGES_R2: R2Bucket;
  /** Public base URL of the R2 bucket (R2.dev subdomain or custom domain). */
  R2_PUBLIC_BASE: string;
  /** GitHub login allowed to upload / read the inquiry inbox. Defaults to bangbongfather-sys. */
  ADMIN_GH_LOGIN?: string;
}

// Allow only safe path characters in R2 keys. Reject "..", absolute paths,
// query strings — anything that could be smuggled to escape the bucket
// or generate weird URLs.
const KEY_RE = /^[a-z0-9_\-./]+$/i;

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
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

/**
 * Gate for every `/api/admin/*` route. Reuses the GitHub PAT the admin
 * UI already holds, so there's no second credential to manage.
 * Resolves to null when the caller is allowed, or to the Response that
 * should be returned instead.
 */
async function requireAdmin(req: Request, env: Env): Promise<Response | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('token ')) {
    return new Response('Missing token (Authorization: token <PAT>)', {
      status: 401,
      headers: corsHeaders(),
    });
  }
  const verify = await verifyGitHubPat(auth.slice(6).trim());
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
  return null;
}

async function handleUpload(req: Request, env: Env): Promise<Response> {
  const denied = await requireAdmin(req, env);
  if (denied) return denied;

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

/* ─── Contact form submission ────────────────────────────────────── */

const INQUIRY_LABELS: Record<string, string> = {
  quote: '제품·견적 문의',
  b2b:   'B2B 단체 주문',
  oem:   'OEM·ODM 제작',
  cert:  '인증서·시험성적서',
  as:    'A/S·교환·반품',
};

const ALLOWED_EXTS = /\.(pdf|jpe?g|png|webp|gif|ai|eps|zip|svg|heic)$/i;
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB per file
const MAX_FILES = 5;

function sanitizeFilename(name: string): string {
  // Strip path separators + collapse to a safe shape. Korean characters
  // are kept (R2 supports UTF-8 keys); shell-hostile chars are dropped.
  return name
    .replace(/[\\/]/g, '-')
    .replace(/[\x00-\x1f<>:"|?*]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

/** R2 key prefix the inquiry inbox lives under. */
const INBOX_PREFIX = 'inquiries/';

/** One stored submission. Written by handleContact, read by the admin UI. */
type Inquiry = {
  /** R2 key without the prefix — the id the admin routes address it by. */
  id: string;
  receivedAt: string;
  status: 'new' | 'done';
  inquiryType: string;
  inquiryLabel: string;
  company: string;
  contactName: string;
  phone: string;
  email: string;
  message: string;
  attachments: { name: string; url: string; size: number }[];
};

/**
 * Public inquiry submission.
 *
 * Deliberately does NOT send email. Cloudflare's send_email binding
 * only accepts senders on a domain the account owns, and this account
 * has no zones — every send failed with "email from naver.com not
 * allowed because domain is not owned by the same account". Rather
 * than take on a third-party mail provider, submissions are stored in
 * R2 and read from /admin/inquiries.
 */
async function handleContact(req: Request, env: Env): Promise<Response> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid form data' }), {
      status: 400,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  // Pull + validate the text fields. Required ones reject early so we
  // don't spend R2 uploads on a malformed submission.
  const get = (k: string) => String(form.get(k) ?? '').trim();
  const data = {
    inquiry_type:    get('inquiry_type') || 'quote',
    company:         get('company'),
    contact_name:    get('contact_name'),
    phone:           get('phone'),
    email:           get('email'),
    message:         get('message'),
    agreed:          form.get('agreed') === 'on' || form.get('agreed') === 'true',
  };

  const required: Array<[keyof typeof data, string]> = [
    ['company',      '회사명'],
    ['contact_name', '담당자명'],
    ['phone',        '연락처'],
    ['email',        '이메일'],
    ['message',      '문의 내용'],
  ];
  const missing = required.filter(([k]) => !data[k]).map(([, label]) => label);
  if (missing.length > 0) {
    return new Response(
      JSON.stringify({ ok: false, error: `필수 항목 누락: ${missing.join(', ')}` }),
      { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } },
    );
  }
  if (!data.agreed) {
    return new Response(
      JSON.stringify({ ok: false, error: '개인정보 수집 약관에 동의해 주세요.' }),
      { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } },
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
    return new Response(
      JSON.stringify({ ok: false, error: '올바른 이메일 형식이 아닙니다.' }),
      { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } },
    );
  }

  // Upload attachments to R2 (under contact/ prefix). The inquiry
  // record stores their public URLs rather than the bytes, so the
  // admin list stays small and the files download on demand.
  const base = (env.R2_PUBLIC_BASE || '').replace(/\/+$/, '');
  const attachments: { name: string; url: string; size: number }[] = [];
  const files = form.getAll('attachments').filter((v): v is File => v instanceof File && v.size > 0);
  if (files.length > MAX_FILES) {
    return new Response(
      JSON.stringify({ ok: false, error: `첨부 파일은 최대 ${MAX_FILES}개까지 가능합니다.` }),
      { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } },
    );
  }
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) {
      return new Response(
        JSON.stringify({ ok: false, error: `파일 '${f.name}'이 20MB를 초과합니다.` }),
        { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } },
      );
    }
    if (!ALLOWED_EXTS.test(f.name)) {
      return new Response(
        JSON.stringify({ ok: false, error: `허용되지 않은 확장자: '${f.name}'` }),
        { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } },
      );
    }
    const ts = Date.now();
    const safe = sanitizeFilename(f.name);
    const dayKey = new Date().toISOString().slice(0, 10);
    const key = `contact/${dayKey}/${ts}-${safe}`;
    try {
      await env.IMAGES_R2.put(key, await f.arrayBuffer(), {
        httpMetadata: { contentType: f.type || 'application/octet-stream' },
      });
      attachments.push({ name: f.name, url: `${base}/${key}`, size: f.size });
    } catch (e: unknown) {
      return new Response(
        JSON.stringify({ ok: false, error: `R2 업로드 실패: ${e instanceof Error ? e.message : String(e)}` }),
        { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } },
      );
    }
  }

  // Store the submission. The R2 key is timestamp-first so a plain
  // lexicographic list() comes back in chronological order — the admin
  // UI just reverses it for newest-first.
  const receivedAt = new Date().toISOString();
  const id = `${receivedAt.replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 8)}`;
  const record: Inquiry = {
    id,
    receivedAt,
    status: 'new',
    inquiryType: data.inquiry_type,
    inquiryLabel: INQUIRY_LABELS[data.inquiry_type] ?? data.inquiry_type,
    company: data.company,
    contactName: data.contact_name,
    phone: data.phone,
    email: data.email,
    message: data.message,
    attachments,
  };

  try {
    await env.IMAGES_R2.put(`${INBOX_PREFIX}${id}.json`, JSON.stringify(record), {
      httpMetadata: { contentType: 'application/json; charset=utf-8' },
    });
    // The R2 key is the only handle on a stored inquiry — log it so a
    // submission can still be found from the Worker logs if the admin
    // list ever misbehaves.
    console.log('inquiry stored:', `${INBOX_PREFIX}${id}.json`);
  } catch (e: unknown) {
    // Unlike the old email path there is no other copy of the text
    // fields, so a failed write means the inquiry is genuinely lost —
    // tell the visitor instead of pretending it went through.
    console.error('inquiry store failed:', e);
    return new Response(
      JSON.stringify({
        ok: false,
        error: '문의 저장에 실패했습니다. 잠시 후 다시 시도하시거나 02-777-3079 로 연락 주세요.',
      }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, attachments: attachments.length }),
    { status: 200, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } },
  );
}

/* ─── Canonical host ─────────────────────────────────────────────── */

/**
 * One address is the real one; the rest send visitors there.
 *
 * `www` is the historical alternate and `m` was the old site's mobile
 * host — both are in Naver's index and on printed material, so they
 * redirect rather than 404. 301 so search engines consolidate onto the
 * apex instead of splitting the site's standing three ways.
 *
 * NOTE: the redirect that actually fires for most traffic is a
 * zone-level Cloudflare Redirect Rule ("www / m → apex (canonical)"),
 * not this function. Static assets are served before the Worker runs,
 * so a request for `/` on www never reaches this code. The rule runs
 * ahead of both. This stays as a backstop for paths with no matching
 * asset, and so the behaviour is visible in the repo rather than only
 * in the dashboard.
 *
 * workers.dev is deliberately NOT redirected: it stays reachable as a
 * fallback for the admin if the domain ever has trouble.
 */
const CANONICAL_HOST = 'njfashion.co.kr';
const ALIAS_HOSTS = new Set(['www.njfashion.co.kr', 'm.njfashion.co.kr']);

function canonicalHostRedirect(url: URL): Response | null {
  if (!ALIAS_HOSTS.has(url.hostname)) return null;
  const target = new URL(url.toString());
  target.hostname = CANONICAL_HOST;
  return Response.redirect(target.toString(), 301);
}

/* ─── Legacy URL redirects ───────────────────────────────────────── */

/**
 * The site njfashion.co.kr ran before this one was a hosted page
 * builder with a completely different URL shape (`/pages/about`,
 * `/categories/<numeric id>`). Those addresses are in Naver's and
 * Google's indexes and printed on old material; without these
 * redirects every one of them 404s the day the domain switches over.
 *
 * 301 (permanent) so search engines transfer the old pages' standing
 * to the new ones instead of treating them as dead.
 */
const LEGACY_REDIRECTS: Record<string, string> = {
  '/pages/about':   '/ko/about',
  '/pages/history': '/ko/about',
  '/pages/service': '/ko/products',
  '/pages/contact': '/ko/contact',
  '/pages/news':    '/ko/notices',
};

/**
 * Keyword fallback for the old addresses we never had an exact list of.
 *
 * The previous site's sitelinks are still in Naver (SERVICE · 회사소개 ·
 * 자료실 · 춘/하계 방염복 · 추/동계 방염복 · HISTORY) and those URLs
 * weren't all `/pages/<name>` — a visitor clicking them landed on a dead
 * page. Rather than guess every path shape, match on the words that
 * appear in it: old Korean site builders put the section name in the
 * path or the query (`/bbs/board.php?bo_table=data`, `/sub/company`,
 * percent-encoded Hangul, …), so a keyword hit is a reliable signal of
 * what the visitor was looking for.
 *
 * Ordered — first match wins, so the specific rules sit above the
 * general ones (사이즈 before 자료실, 하계 before 제품).
 */
const LEGACY_KEYWORD_RULES: Array<[RegExp, string]> = [
  [/size|사이즈|치수/i,                              '/ko/resources/size-guide'],
  [/test.?report|성적서|시험/i,                      '/ko/resources/test-reports'],
  [/dealer|agency|store|대리점|판매|매장/i,           '/ko/dealers'],
  // 자료실 before 공지사항: board builders route every board through the
  // same `/bbs/board.php`, so the generic word "board" says nothing —
  // the table name in the query (`bo_table=data`) is the real signal.
  [/data|pds|download|catalog|자료|다운로드|카탈로그/i, '/ko/resources'],
  [/notice|news|공지|소식|뉴스/i,                    '/ko/notices'],
  [/contact|inquir|estimate|qna|문의|견적|상담/i,     '/ko/contact'],
  [/histor|연혁/i,                                   '/ko/about'],
  [/about|company|intro|greeting|ceo|회사|소개|인사/i, '/ko/about'],
  // Season lines and every other product-ish word land on the catalogue.
  [/summer|winter|spring|하계|동계|춘추|방한|여름|겨울/i, '/ko/products'],
  [/product|item|goods|service|shop|제품|상품|방염|작업복|용접/i, '/ko/products'],
];

/**
 * Percent-encoded Hangul is the norm in these old URLs; decode before
 * matching so `%EC%9E%90%EB%A3%8C%EC%8B%A4` reads as `자료실`.
 */
function decodePath(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s; // malformed escape — match against the raw form instead
  }
}

function legacyRedirect(url: URL): Response | null {
  const p = url.pathname.replace(/\/+$/, '') || '/';
  // Never rewrite the new site's own pages, the API, or asset requests.
  if (p === '/' || p.startsWith('/ko') || p.startsWith('/en') || p.startsWith('/api')) {
    return null;
  }
  const mapped = LEGACY_REDIRECTS[p];
  // Old category pages used opaque numeric ids that don't map onto the
  // new catalogue, so they all land on the products index.
  let target = mapped ?? (/^\/categories\/\d+$/.test(p) ? '/ko/products' : null);
  if (!target) {
    const haystack = decodePath(p + url.search);
    for (const [re, dest] of LEGACY_KEYWORD_RULES) {
      if (re.test(haystack)) {
        target = dest;
        break;
      }
    }
  }
  if (!target) return null;
  return Response.redirect(`${url.origin}${target}/`, 301);
}

/**
 * True for requests that render a page (as opposed to fetching a script,
 * stylesheet or image). Used to decide whether an unmatched 404 should
 * bounce to the homepage: doing that to a missing `.js` would hand the
 * browser HTML where it expects code, so extension-bearing paths and
 * non-HTML Accept headers are left to 404 honestly.
 */
function isPageRequest(req: Request, url: URL): boolean {
  if (url.pathname.startsWith('/api/')) return false;
  if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) return false;
  return (req.headers.get('accept') ?? '').includes('text/html');
}

/* ─── Admin inbox ────────────────────────────────────────────────── */

/** Ids are generated by handleContact — reject anything else outright. */
const INQUIRY_ID_RE = /^[0-9TZa-z-]{1,80}$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

/**
 * `GET /api/admin/inquiries` — the whole inbox, newest first.
 *
 * Reads every object under `inquiries/`. Fine at this volume (a B2B
 * inquiry inbox, not a mail server); if it ever outgrows one page this
 * needs a cursor instead.
 */
async function handleInquiryList(req: Request, env: Env): Promise<Response> {
  const denied = await requireAdmin(req, env);
  if (denied) return denied;

  const items: Inquiry[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.IMAGES_R2.list({ prefix: INBOX_PREFIX, limit: 1000, cursor });
    const bodies = await Promise.all(page.objects.map((o) => env.IMAGES_R2.get(o.key)));
    for (const body of bodies) {
      if (!body) continue;
      try {
        items.push(JSON.parse(await body.text()) as Inquiry);
      } catch {
        // A corrupt object shouldn't blank the whole inbox — skip it.
        console.error('inquiry parse failed:', body.key);
      }
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  items.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
  return json({ ok: true, items });
}

/**
 * `POST /api/admin/inquiries/status` — flip one entry between
 * 신규(new) and 처리완료(done). Body: `{ id, status }`.
 */
async function handleInquiryStatus(req: Request, env: Env): Promise<Response> {
  const denied = await requireAdmin(req, env);
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as { id?: string; status?: string };
  const id = body.id ?? '';
  const status = body.status;
  if (!INQUIRY_ID_RE.test(id)) return json({ ok: false, error: 'invalid id' }, 400);
  if (status !== 'new' && status !== 'done') return json({ ok: false, error: 'invalid status' }, 400);

  const key = `${INBOX_PREFIX}${id}.json`;
  const existing = await env.IMAGES_R2.get(key);
  if (!existing) return json({ ok: false, error: 'not found' }, 404);

  const record = JSON.parse(await existing.text()) as Inquiry;
  record.status = status;
  await env.IMAGES_R2.put(key, JSON.stringify(record), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  });
  return json({ ok: true, item: record });
}

/**
 * `DELETE /api/admin/inquiries?id=<id>` — drop one entry.
 *
 * Only the inquiry record goes; any attachments stay in R2 under
 * `contact/`, matching how the 자료실 admin treats removed files.
 */
async function handleInquiryDelete(req: Request, env: Env): Promise<Response> {
  const denied = await requireAdmin(req, env);
  if (denied) return denied;

  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!INQUIRY_ID_RE.test(id)) return json({ ok: false, error: 'invalid id' }, 400);
  await env.IMAGES_R2.delete(`${INBOX_PREFIX}${id}.json`);
  return json({ ok: true });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // www / m → apex, before anything else so every other rule below
    // only ever sees the canonical host.
    if (req.method === 'GET' || req.method === 'HEAD') {
      const hostRedirect = canonicalHostRedirect(url);
      if (hostRedirect) return hostRedirect;
    }

    // Addresses from the previous njfashion.co.kr site. Checked before
    // the asset fallback so they never reach the 404 page.
    if (req.method === 'GET' || req.method === 'HEAD') {
      const redirect = legacyRedirect(url);
      if (redirect) return redirect;
    }

    if (url.pathname === '/api/admin/upload-image' && req.method === 'PUT') {
      return handleUpload(req, env);
    }

    if (url.pathname === '/api/admin/inquiries') {
      if (req.method === 'GET') return handleInquiryList(req, env);
      if (req.method === 'DELETE') return handleInquiryDelete(req, env);
    }

    if (url.pathname === '/api/admin/inquiries/status' && req.method === 'POST') {
      return handleInquiryStatus(req, env);
    }

    if (url.pathname === '/api/contact' && req.method === 'POST') {
      return handleContact(req, env);
    }

    // Machine-readable product directory (built by
    // scripts/build-products-index.mjs). The catalog-app editor fetches
    // this cross-origin to validate 웹사이트 연동 targets, so it needs an
    // explicit CORS allow — static assets don't get one by default.
    if (url.pathname === '/products-index.json' && req.method === 'GET') {
      const res = await env.ASSETS.fetch(req);
      const headers = new Headers(res.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Cache-Control', 'public, max-age=300');
      return new Response(res.body, { status: res.status, headers });
    }

    // Everything else — static assets passthrough.
    const res = await env.ASSETS.fetch(req);

    // Safety net for the old site's addresses that neither the exact
    // table nor the keyword rules recognise. Search engines still list
    // them, so a visitor clicking through would otherwise hit a dead
    // page on a domain that used to work. Send them to the homepage
    // instead — 302, not 301: this is a "we couldn't place you" bounce,
    // and caching it permanently in browsers would mask a page we may
    // add later at that same address.
    if (res.status === 404 && (req.method === 'GET' || req.method === 'HEAD') && isPageRequest(req, url)) {
      return Response.redirect(`${url.origin}/`, 302);
    }

    return res;
  },
};
