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

/**
 * Cloudflare's send_email binding. Activated when wrangler.jsonc has
 * a verified destination address. See the `send_email` block there
 * for one-time setup notes.
 */
interface SendEmailBinding {
  send(message: unknown): Promise<void>;
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
  /** Cloudflare Email Workers binding — see wrangler.jsonc. Optional
   *  so the rest of the Worker keeps running before the destination
   *  is verified. */
  CONTACT_EMAIL?: SendEmailBinding;
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
    industry:        get('industry'),
    contact_name:    get('contact_name'),
    position:        get('position'),
    phone:           get('phone'),
    email:           get('email'),
    quantity_range:  get('quantity_range'),
    delivery_date:   get('delivery_date'),
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

  // Upload attachments to R2 (under contact/ prefix) and collect URLs
  // for the email body. Sending the actual bytes inline would blow the
  // 25 MB raw-email cap fast; link-based delivery scales better.
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

  // Compose + send the notification email via Cloudflare's
  // send_email binding. The MIME message is built with `mimetext`,
  // which is the package Cloudflare's own docs recommend for this.
  if (env.CONTACT_EMAIL) {
    try {
      // Dynamic imports keep these out of the cold-start bundle when
      // the binding isn't configured yet (e.g. on a fresh deploy
      // before the destination address is verified).
      const { createMimeMessage } = await import('mimetext');
      const { EmailMessage } = await import('cloudflare:email');

      const submittedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
      const typeLabel = INQUIRY_LABELS[data.inquiry_type] ?? data.inquiry_type;

      const textBody = [
        `[NJ SAFETY 문의 접수] ${typeLabel}`,
        '',
        `접수 시각: ${submittedAt}`,
        '',
        '─── 담당자 정보 ────────────────────',
        `회사명     : ${data.company}`,
        `담당자     : ${data.contact_name}${data.position ? ` (${data.position})` : ''}`,
        `연락처     : ${data.phone}`,
        `이메일     : ${data.email}`,
        `산업군     : ${data.industry || '-'}`,
        '',
        '─── 견적 정보 ────────────────────',
        `문의 유형  : ${typeLabel}`,
        `예상 수량  : ${data.quantity_range || '-'}`,
        `희망 납기  : ${data.delivery_date || '-'}`,
        '',
        '─── 문의 내용 ────────────────────',
        data.message,
        '',
        '─── 첨부 파일 ────────────────────',
        attachments.length === 0
          ? '(없음)'
          : attachments.map((a) => `• ${a.name} (${Math.round(a.size / 1024)} KB)\n  ${a.url}`).join('\n'),
        '',
        '— 이 메일은 NJ SAFETY 문의 폼에서 자동 발송된 알림입니다.',
      ].join('\n');

      const htmlRows = (label: string, value: string) =>
        `<tr><td style="padding:6px 12px;color:#666;font-family:monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;width:120px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 12px;color:#111;font-size:14px">${escapeHtml(value || '-')}</td></tr>`;
      const htmlBody = `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Pretendard',sans-serif;background:#f5f5f5;margin:0;padding:24px">
<div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:32px">
  <div style="border-bottom:2px solid #ff6b1a;padding-bottom:16px;margin-bottom:24px">
    <div style="font-family:monospace;font-size:11px;letter-spacing:.2em;color:#ff6b1a;text-transform:uppercase">— NJ SAFETY · Inquiry Received</div>
    <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#0d0d0e">${escapeHtml(typeLabel)}</h1>
    <div style="margin-top:8px;font-size:12px;color:#888">${escapeHtml(submittedAt)} KST</div>
  </div>
  <h2 style="font-size:13px;color:#0d0d0e;margin:24px 0 8px;letter-spacing:.05em">담당자 정보</h2>
  <table style="width:100%;border-collapse:collapse;background:#fafafa;border:1px solid #eee">
    ${htmlRows('회사명', data.company)}
    ${htmlRows('담당자', `${data.contact_name}${data.position ? ` (${data.position})` : ''}`)}
    ${htmlRows('연락처', data.phone)}
    ${htmlRows('이메일', data.email)}
    ${htmlRows('산업군', data.industry)}
  </table>
  <h2 style="font-size:13px;color:#0d0d0e;margin:24px 0 8px;letter-spacing:.05em">견적 정보</h2>
  <table style="width:100%;border-collapse:collapse;background:#fafafa;border:1px solid #eee">
    ${htmlRows('예상 수량', data.quantity_range)}
    ${htmlRows('희망 납기', data.delivery_date)}
  </table>
  <h2 style="font-size:13px;color:#0d0d0e;margin:24px 0 8px;letter-spacing:.05em">문의 내용</h2>
  <div style="background:#fafafa;border:1px solid #eee;padding:16px;white-space:pre-wrap;font-size:14px;line-height:1.7;color:#222">${escapeHtml(data.message)}</div>
  ${attachments.length > 0 ? `
  <h2 style="font-size:13px;color:#0d0d0e;margin:24px 0 8px;letter-spacing:.05em">첨부 파일 (${attachments.length})</h2>
  <ul style="list-style:none;padding:0;margin:0">
    ${attachments.map((a) => `<li style="padding:10px 12px;border:1px solid #eee;margin-bottom:6px;font-size:13px"><a href="${escapeHtml(a.url)}" style="color:#ff6b1a;text-decoration:none">${escapeHtml(a.name)}</a> <span style="color:#888;font-size:11px">(${Math.round(a.size / 1024)} KB)</span></li>`).join('')}
  </ul>` : ''}
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#999;font-family:monospace;letter-spacing:.06em">© NJ SAFETY · 자동 발송 — 회신은 ${escapeHtml(data.email)}로</div>
</div></body></html>`;

      // Use the verified destination (njsafety91@naver.com) as both
      // sender and recipient — Cloudflare's send_email allows this when
      // the address is verified, and Naver's spam filter trusts it
      // because it's a self-delivery.
      const msg = createMimeMessage();
      msg.setSender({ name: 'NJ SAFETY · 문의 알림', addr: 'njsafety91@naver.com' });
      msg.setRecipient('njsafety91@naver.com');
      msg.setSubject(`[NJ SAFETY 문의] ${typeLabel} · ${data.company}`);
      msg.setHeader('Reply-To', `${data.contact_name} <${data.email}>`);
      msg.addMessage({ contentType: 'text/plain; charset=utf-8', data: textBody });
      msg.addMessage({ contentType: 'text/html;  charset=utf-8', data: htmlBody });

      const emailMessage = new EmailMessage(
        'njsafety91@naver.com',
        'njsafety91@naver.com',
        msg.asRaw(),
      );
      await env.CONTACT_EMAIL.send(emailMessage);
    } catch (e: unknown) {
      // Even if email fails, we already stored the attachments. Return
      // 502 so the client knows delivery itself didn't happen but the
      // data isn't lost — we log + the admin can recover from R2.
      console.error('contact email send failed:', e);
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            '메일 발송 실패. 곧 다시 시도하시거나 njsafety91@naver.com 으로 직접 보내주세요.',
        }),
        { status: 502, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } },
      );
    }
  }
  // (If env.CONTACT_EMAIL is undefined we still return 200 — the
  // submission is captured in R2/logs and the user gets a positive
  // UX; admin sets up the binding when ready.)

  return new Response(
    JSON.stringify({ ok: true, attachments: attachments.length }),
    { status: 200, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } },
  );
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
    return env.ASSETS.fetch(req);
  },
};
