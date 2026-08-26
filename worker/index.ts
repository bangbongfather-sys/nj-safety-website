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

import {
  SESSION_TTL_DAYS,
  issueSession,
  parseUsers,
  readSession,
  verifyCredentials,
} from './auth';
import {
  countOwners,
  countUsers,
  getGitHubToken,
  setGitHubToken,
  createUser,
  deleteUser,
  ensureSchema,
  findUser,
  getSessionSecret,
  listUsers,
  setPassword,
  touchLogin,
  validateId,
  validatePassword,
  type D1Database,
  type Role,
} from './users';
import {
  dailyStats,
  ensureAnalyticsSchema,
  isBot,
  kstDay,
  monthlyStats,
  pruneSeen,
  recordView,
  summary as viewSummary,
  visitorId,
} from './analytics';

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

  /* ── 아이디/비밀번호 로그인 ──────────────────────────────────────
   *
   * ADMIN_DB   관리자 계정 표 (D1). 계정 추가·비밀번호 변경이 전부
   *            관리자 페이지 안에서 끝나도록 여기에 둔다. 세션
   *            서명키도 처음 필요할 때 여기 만들어 넣는다.
   * ADMIN_GH_PAT  GitHub 토큰. 사람이 한 번 넣어 줘야 하는 유일한
   *            시크릿 — 사장님만 발급할 수 있는 값이라 어쩔 수 없다.
   *            아이디 로그인으로 저장할 때 이 토큰이 쓰인다.
   *
   * 아래 둘은 예전 방식의 잔재로 남겨 둔다. 있으면 그쪽이 이긴다.
   * ADMIN_USERS     계정을 시크릿에 JSON 으로 넣던 방식
   * SESSION_SECRET  세션 서명키를 손으로 넣던 방식 (모두 강제
   *                 로그아웃시키고 싶을 때 쓸 수 있다) */
  ADMIN_DB?: D1Database;
  ADMIN_GH_PAT?: string;
  ADMIN_USERS?: string;
  SESSION_SECRET?: string;

  /**
   * 문의 알림 메일 (선택). Set as a secret:
   * `wrangler secret put RESEND_API_KEY` — or via the dashboard.
   * Absent ⇒ no mail is sent and the inbox behaves exactly as before,
   * so the site keeps working untouched until a key is added.
   */
  RESEND_API_KEY?: string;
  /** Where notifications go. Defaults to the company address. */
  CONTACT_TO?: string;
  /**
   * Sender. Defaults to Resend's shared sandbox address, which needs no
   * DNS setup but only delivers to the address the Resend account was
   * registered with. Point this at an address on a domain verified in
   * Resend (e.g. noreply@njfashion.co.kr) for reliable delivery.
   */
  RESEND_FROM?: string;
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

/* ─── 관리자 인증 ────────────────────────────────────────────────────
 *
 * 두 가지 방식을 모두 받는다.
 *
 *   1. 세션 토큰 — /api/admin/login 에서 아이디·비밀번호로 받아온 것.
 *      직원이 쓰는 정상 경로. 이 경우 GitHub 토큰은 브라우저에 없고
 *      Worker 의 ADMIN_GH_PAT 시크릿에만 있다.
 *
 *   2. GitHub PAT — 예전 방식. ADMIN_USERS/SESSION_SECRET 를 아직
 *      설정하지 않았거나 세션에 문제가 생겼을 때를 위한 비상구.
 *
 * 어느 쪽이든 통과하면 GitHub 를 호출할 토큰(ghToken)을 함께 돌려준다.
 */

const GH_REPO_OWNER = 'bangbongfather-sys';
const GH_REPO_NAME = 'nj-safety-website';

type AdminAuth = {
  /** 로그인한 사람 (세션이면 아이디, PAT 이면 GitHub 로그인). */
  id: string;
  /** 이 요청에서 GitHub 를 호출할 때 쓸 토큰. */
  ghToken: string;
  mode: 'session' | 'pat';
  /** owner 만 다른 직원의 계정을 만들거나 지울 수 있다. */
  role: Role;
};

/** 계정 표가 없으면 아이디 로그인 자체가 성립하지 않는다. */
function requireDb(env: Env): D1Database | null {
  return env.ADMIN_DB ?? null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function bearerToken(req: Request): string | null {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('token ')) return null;
  const t = auth.slice(6).trim();
  return t || null;
}

/** 세션 토큰은 `payload.signature` 형태라 점이 들어 있다. GitHub PAT
 *  (ghp_…, github_pat_…) 에는 점이 없어서 이것만으로 구분된다. */
function looksLikeSession(token: string): boolean {
  return token.includes('.');
}

async function authenticate(
  req: Request,
  env: Env,
): Promise<{ ok: true; auth: AdminAuth } | { ok: false; res: Response }> {
  const token = bearerToken(req);
  if (!token) {
    return {
      ok: false,
      res: new Response('로그인이 필요합니다.', { status: 401, headers: corsHeaders() }),
    };
  }

  const db = requireDb(env);
  if (db && looksLikeSession(token)) {
    const secret = await getSessionSecret(db, env.SESSION_SECRET);
    const id = await readSession(secret, token);
    if (!id) {
      return {
        ok: false,
        res: new Response('세션이 만료되었습니다. 다시 로그인해 주세요.', {
          status: 401,
          headers: corsHeaders(),
        }),
      };
    }
    // 역할은 토큰에 넣지 않고 매번 표에서 읽는다. 계정을 지우거나
    // 권한을 내리면 그 즉시 반영되어야 하기 때문 — 토큰에 박아 두면
    // 30일 동안 살아 있는 세션이 예전 권한을 그대로 들고 다닌다.
    const found = await findUser(db, id);
    if (!found) {
      return {
        ok: false,
        res: new Response('계정을 찾을 수 없습니다. 다시 로그인해 주세요.', {
          status: 401,
          headers: corsHeaders(),
        }),
      };
    }
    const ghToken = await getGitHubToken(db, env.ADMIN_GH_PAT);
    if (!ghToken) {
      // 로그인은 맞는데 서버에 GitHub 토큰이 없다. 설정이 덜 된 것이지
      // 사용자 잘못이 아니므로 무엇을 해야 하는지까지 알려 준다.
      return {
        ok: false,
        res: new Response(
          '서버에 GitHub 토큰이 저장되어 있지 않아 수정 내용을 저장할 수 없습니다. 관리자 설정에서 토큰을 한 번 저장해 주세요.',
          { status: 500, headers: corsHeaders() },
        ),
      };
    }
    return {
      ok: true,
      auth: { id: found.account.id, ghToken, mode: 'session', role: found.account.role },
    };
  }

  const verify = await verifyGitHubPat(token);
  if (!verify.ok) {
    return {
      ok: false,
      res: new Response(`인증 실패: ${verify.reason}`, { status: 401, headers: corsHeaders() }),
    };
  }
  const allowed = env.ADMIN_GH_LOGIN || 'bangbongfather-sys';
  if (verify.login !== allowed) {
    return {
      ok: false,
      res: new Response(`권한 없음: ${verify.login} (필요: ${allowed})`, {
        status: 403,
        headers: corsHeaders(),
      }),
    };
  }
  // 예전 방식으로 들어온 사람은 곧 첫 계정을 만들어야 하므로 owner.
  return { ok: true, auth: { id: verify.login, ghToken: token, mode: 'pat', role: 'owner' } };
}

/**
 * Gate for every `/api/admin/*` route. Resolves to null when the caller
 * is allowed, or to the Response that should be returned instead.
 */
async function requireAdmin(req: Request, env: Env): Promise<Response | null> {
  const r = await authenticate(req, env);
  return r.ok ? null : r.res;
}

/** `POST /api/admin/login` — {id, password} → 세션 토큰. */
async function handleLogin(req: Request, env: Env): Promise<Response> {
  const db = requireDb(env);
  if (!db) {
    return json({ ok: false, error: '아이디 로그인이 아직 설정되지 않았습니다.' }, 503);
  }
  let body: { id?: string; password?: string };
  try {
    body = (await req.json()) as { id?: string; password?: string };
  } catch {
    return json({ ok: false, error: '잘못된 요청입니다.' }, 400);
  }
  const id = (body.id ?? '').trim();
  const password = body.password ?? '';
  if (!id || !password) {
    return json({ ok: false, error: '아이디와 비밀번호를 입력해 주세요.' }, 400);
  }

  // 표에서 찾고, 없으면 예전 ADMIN_USERS 시크릿도 본다. 시크릿으로
  // 쓰던 설정이 있으면 그대로 로그인되게 남겨 둔 것.
  const found = await findUser(db, id);
  const candidates = found ? [found.credentials] : parseUsers(env.ADMIN_USERS);
  const matched = await verifyCredentials(candidates, id, password);
  if (!matched) {
    // 아이디가 없는 것과 비밀번호가 틀린 것을 구분해서 알려주지 않는다.
    return json({ ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, 401);
  }

  const secret = await getSessionSecret(db, env.SESSION_SECRET);
  const token = await issueSession(secret, matched);
  if (found) await touchLogin(db, matched, nowIso());
  return json({
    ok: true,
    token,
    id: matched,
    role: found?.account.role ?? 'owner',
    days: SESSION_TTL_DAYS,
  });
}

/* ─── 계정 관리 ──────────────────────────────────────────────────────
 *
 * 예전에는 계정을 바꾸려면 터미널에서 해시를 만들어 시크릿에 다시
 * 넣어야 했다. 아래 라우트들이 그 일을 관리자 페이지 안으로 옮긴다.
 *
 * 권한은 두 가지뿐이다. owner 는 직원을 추가·삭제하고 아무 비밀번호나
 * 재설정할 수 있고, staff 는 자기 비밀번호만 바꿀 수 있다.
 */

async function handleUserList(req: Request, env: Env): Promise<Response> {
  const r = await authenticate(req, env);
  if (!r.ok) return r.res;
  const db = requireDb(env);
  if (!db) return json({ ok: false, error: '계정 저장소가 없습니다.' }, 503);
  return json({
    ok: true,
    me: { id: r.auth.id, role: r.auth.role, mode: r.auth.mode },
    users: await listUsers(db),
  });
}

async function handleUserCreate(req: Request, env: Env): Promise<Response> {
  const r = await authenticate(req, env);
  if (!r.ok) return r.res;
  const db = requireDb(env);
  if (!db) return json({ ok: false, error: '계정 저장소가 없습니다.' }, 503);

  let body: { id?: string; password?: string; displayName?: string; role?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ ok: false, error: '잘못된 요청입니다.' }, 400);
  }

  const id = (body.id ?? '').trim();
  const password = body.password ?? '';
  const idErr = validateId(id);
  if (idErr) return json({ ok: false, error: idErr }, 400);
  const pwErr = validatePassword(password);
  if (pwErr) return json({ ok: false, error: pwErr }, 400);

  const existing = await countUsers(db);
  // 표가 비어 있으면 첫 계정이다. 이때는 예전 GitHub 토큰으로 들어온
  // 사람도 만들 수 있어야 한다 — 그러지 않으면 첫 계정을 만들 방법이
  // 없어 다시 터미널로 돌아가야 한다.
  if (existing > 0 && r.auth.role !== 'owner') {
    return json({ ok: false, error: '직원 계정은 대표 계정만 추가할 수 있습니다.' }, 403);
  }
  if (await findUser(db, id)) {
    return json({ ok: false, error: '이미 있는 아이디입니다.' }, 409);
  }

  const role: Role = existing === 0 ? 'owner' : body.role === 'owner' ? 'owner' : 'staff';
  const account = await createUser(
    db,
    { id, password, displayName: body.displayName, role },
    nowIso(),
  );
  return json({ ok: true, user: account });
}

async function handleUserPassword(req: Request, env: Env): Promise<Response> {
  const r = await authenticate(req, env);
  if (!r.ok) return r.res;
  const db = requireDb(env);
  if (!db) return json({ ok: false, error: '계정 저장소가 없습니다.' }, 503);

  let body: { id?: string; currentPassword?: string; password?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ ok: false, error: '잘못된 요청입니다.' }, 400);
  }

  const target = (body.id ?? r.auth.id).trim();
  const password = body.password ?? '';
  const pwErr = validatePassword(password);
  if (pwErr) return json({ ok: false, error: pwErr }, 400);

  const isSelf = target.toLowerCase() === r.auth.id.toLowerCase();
  if (!isSelf && r.auth.role !== 'owner') {
    return json({ ok: false, error: '다른 사람의 비밀번호는 대표 계정만 바꿀 수 있습니다.' }, 403);
  }

  const found = await findUser(db, target);
  if (!found) return json({ ok: false, error: '없는 계정입니다.' }, 404);

  // 자기 비밀번호를 바꿀 때는 현재 비밀번호를 확인한다. 로그인한
  // 자리를 잠깐 비운 사이 누가 비밀번호를 바꿔 버리는 걸 막는다.
  // (GitHub 토큰으로 들어온 경우는 확인할 기존 비밀번호가 없다.)
  if (isSelf && r.auth.mode === 'session') {
    const ok = await verifyCredentials([found.credentials], target, body.currentPassword ?? '');
    if (!ok) return json({ ok: false, error: '현재 비밀번호가 올바르지 않습니다.' }, 401);
  }

  await setPassword(db, target, password, nowIso());
  return json({ ok: true });
}

/**
 * `POST /api/admin/gh-token` — 서버에 GitHub 토큰을 넣어 둔다.
 *
 * 이 한 번으로 터미널 작업이 사라진다. 저장 전에 GitHub 에 실제로
 * 물어봐서 쓸 수 있는 토큰인지 확인한다 — 오타난 값을 넣어 두고
 * 나중에 "저장이 안 돼요" 로 만나는 일이 없도록.
 */
async function handleGhTokenSave(req: Request, env: Env): Promise<Response> {
  const r = await authenticate(req, env);
  if (!r.ok) return r.res;
  const db = requireDb(env);
  if (!db) return json({ ok: false, error: '계정 저장소가 없습니다.' }, 503);
  if (r.auth.role !== 'owner') {
    return json({ ok: false, error: '대표 계정만 할 수 있습니다.' }, 403);
  }

  let body: { token?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ ok: false, error: '잘못된 요청입니다.' }, 400);
  }
  const token = (body.token ?? '').trim();
  if (!token) return json({ ok: false, error: '토큰을 입력해 주세요.' }, 400);

  const verify = await verifyGitHubPat(token);
  if (!verify.ok) {
    return json({ ok: false, error: `GitHub 이 이 토큰을 거부했습니다: ${verify.reason}` }, 400);
  }
  const allowed = env.ADMIN_GH_LOGIN || 'bangbongfather-sys';
  if (verify.login !== allowed) {
    return json({ ok: false, error: `이 저장소의 토큰이 아닙니다 (${verify.login}).` }, 400);
  }

  await setGitHubToken(db, token);
  return json({ ok: true, login: verify.login });
}

/** `GET /api/admin/gh-token` — 저장돼 있는지만 알려준다. 값은 안 준다. */
async function handleGhTokenStatus(req: Request, env: Env): Promise<Response> {
  const r = await authenticate(req, env);
  if (!r.ok) return r.res;
  const db = requireDb(env);
  if (!db) return json({ ok: false, error: '계정 저장소가 없습니다.' }, 503);
  const token = await getGitHubToken(db, env.ADMIN_GH_PAT);
  return json({
    ok: true,
    saved: Boolean(token),
    source: env.ADMIN_GH_PAT ? 'secret' : token ? 'database' : null,
  });
}

async function handleUserDelete(req: Request, env: Env, url: URL): Promise<Response> {
  const r = await authenticate(req, env);
  if (!r.ok) return r.res;
  const db = requireDb(env);
  if (!db) return json({ ok: false, error: '계정 저장소가 없습니다.' }, 503);
  if (r.auth.role !== 'owner') {
    return json({ ok: false, error: '계정 삭제는 대표 계정만 할 수 있습니다.' }, 403);
  }

  const target = (url.searchParams.get('id') ?? '').trim();
  if (!target) return json({ ok: false, error: '지울 계정을 지정해 주세요.' }, 400);
  if (target.toLowerCase() === r.auth.id.toLowerCase()) {
    return json({ ok: false, error: '자기 계정은 지울 수 없습니다.' }, 400);
  }

  const found = await findUser(db, target);
  if (!found) return json({ ok: false, error: '없는 계정입니다.' }, 404);
  // 대표가 하나도 없는 상태가 되면 아무도 계정을 관리할 수 없다.
  if (found.account.role === 'owner' && (await countOwners(db)) <= 1) {
    return json({ ok: false, error: '마지막 대표 계정은 지울 수 없습니다.' }, 400);
  }

  await deleteUser(db, target);
  return json({ ok: true });
}

/** `GET /api/admin/session` — 저장된 토큰이 아직 유효한지 확인. */
async function handleSession(req: Request, env: Env): Promise<Response> {
  const r = await authenticate(req, env);
  if (!r.ok) return r.res;
  return json({ ok: true, id: r.auth.id, mode: r.auth.mode, role: r.auth.role });
}

/**
 * `/api/admin/gh/*` — GitHub Contents API 대리 호출.
 *
 * 브라우저는 GitHub 토큰을 갖지 않고 이 경로로만 요청한다. Worker 가
 * 세션을 확인한 뒤 서버에 있는 토큰을 붙여 GitHub 로 넘긴다. 경로는
 * 이 저장소 안으로 고정되어 있어서, 세션이 있다고 다른 저장소를 건드릴
 * 수는 없다.
 */
async function handleGitHubProxy(req: Request, env: Env, url: URL): Promise<Response> {
  const r = await authenticate(req, env);
  if (!r.ok) return r.res;

  const rest = url.pathname.slice('/api/admin/gh'.length); // 앞에 / 포함
  if (rest.includes('..')) {
    return new Response('Invalid path', { status: 400, headers: corsHeaders() });
  }
  const target = `https://api.github.com/repos/${GH_REPO_OWNER}/${GH_REPO_NAME}${rest}${url.search}`;

  const headers = new Headers({
    Authorization: `token ${r.auth.ghToken}`,
    Accept: req.headers.get('Accept') || 'application/vnd.github+json',
    'User-Agent': 'nj-safety-admin',
  });
  const ct = req.headers.get('Content-Type');
  if (ct) headers.set('Content-Type', ct);

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? await req.arrayBuffer() : undefined,
  });

  const out = new Headers(corsHeaders());
  const upstreamCt = upstream.headers.get('Content-Type');
  if (upstreamCt) out.set('Content-Type', upstreamCt);
  // 브라우저·프록시가 오래된 파일 내용을 재사용하면 저장이 충돌하므로
  // 캐시를 명시적으로 끈다.
  out.set('Cache-Control', 'no-store');
  return new Response(upstream.body, { status: upstream.status, headers: out });
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

/* ─── 문의 알림 메일 ─────────────────────────────────────────────── */

const DEFAULT_CONTACT_TO = 'njsafety91@naver.com';
/** Resend's shared sandbox sender — no DNS setup, but it only delivers
 *  to the address the Resend account itself was registered with. */
const DEFAULT_RESEND_FROM = 'NJ SAFETY 문의 <onboarding@resend.dev>';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Best-effort notification that a new inquiry landed.
 *
 * The inbox in R2 stays the source of truth — this is a heads-up so the
 * operator doesn't have to poll /admin/inquiries. It therefore never
 * throws: a mail failure must not turn a stored submission into an
 * error for the visitor. Skipped entirely when RESEND_API_KEY is unset.
 */
async function notifyNewInquiry(env: Env, r: Inquiry): Promise<void> {
  if (!env.RESEND_API_KEY) return;

  const rows: Array<[string, string]> = [
    ['문의 유형', r.inquiryLabel],
    ['회사명', r.company],
    ['담당자', r.contactName],
    ['연락처', r.phone],
    ['이메일', r.email],
  ];
  const when = new Date(r.receivedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const inboxUrl = 'https://njfashion.co.kr/admin/inquiries/';

  const textBody = [
    `새 문의가 접수되었습니다 — ${r.inquiryLabel}`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    `접수 시각: ${when}`,
    '',
    '── 문의 내용 ──',
    r.message,
    ...(r.attachments.length
      ? ['', '── 첨부 ──', ...r.attachments.map((a) => `${a.name}: ${a.url}`)]
      : []),
    '',
    `접수함에서 보기: ${inboxUrl}`,
  ].join('\n');

  const htmlBody =
    `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f4f5;` +
    `font-family:-apple-system,BlinkMacSystemFont,'Pretendard',sans-serif;color:#1c1c1e">` +
    `<div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden">` +
    `<div style="background:#1c1c1e;color:#fff;padding:20px 24px">` +
    `<div style="font-size:12px;letter-spacing:.18em;color:#ff6b1a">NEW INQUIRY</div>` +
    `<div style="font-size:20px;font-weight:700;margin-top:6px">${escapeHtml(r.inquiryLabel)}</div>` +
    `</div><div style="padding:24px"><table style="width:100%;border-collapse:collapse;font-size:14px">` +
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:8px 0;color:#71717a;width:96px">${escapeHtml(k)}</td>` +
          `<td style="padding:8px 0;font-weight:600">${escapeHtml(v)}</td></tr>`,
      )
      .join('') +
    `<tr><td style="padding:8px 0;color:#71717a">접수 시각</td>` +
    `<td style="padding:8px 0">${escapeHtml(when)}</td></tr></table>` +
    `<div style="margin-top:20px;padding:16px;background:#fafafa;border:1px solid #e4e4e7;border-radius:6px;` +
    `white-space:pre-wrap;font-size:14px;line-height:1.6">${escapeHtml(r.message)}</div>` +
    (r.attachments.length
      ? `<div style="margin-top:16px;font-size:13px"><b>첨부</b><br>` +
        r.attachments
          .map(
            (a) =>
              `<a href="${escapeHtml(a.url)}" style="color:#ff6b1a">${escapeHtml(a.name)}</a>`,
          )
          .join('<br>') +
        `</div>`
      : '') +
    `<a href="${inboxUrl}" style="display:inline-block;margin-top:24px;background:#ff6b1a;color:#fff;` +
    `text-decoration:none;font-weight:700;padding:12px 20px;border-radius:4px">접수함에서 보기 →</a>` +
    `</div></div></body></html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM || DEFAULT_RESEND_FROM,
        to: [env.CONTACT_TO || DEFAULT_CONTACT_TO],
        subject: `[NJ SAFETY 문의] ${r.company} · ${r.inquiryLabel}`,
        text: textBody,
        html: htmlBody,
        // Replying in the mail client goes straight to the customer.
        reply_to: `${r.contactName} <${r.email}>`,
      }),
    });
    if (!res.ok) {
      console.error('inquiry mail failed:', res.status, (await res.text()).slice(0, 300));
    }
  } catch (e: unknown) {
    console.error('inquiry mail error:', e instanceof Error ? e.message : String(e));
  }
}

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
async function handleContact(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
    // Fire-and-forget: the visitor's response shouldn't wait on an
    // outbound API call, and a mail failure must not fail the
    // submission — it's already safely in the inbox.
    ctx.waitUntil(notifyNewInquiry(env, record));
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

/* ─── 방문자 통계 ────────────────────────────────────────────────── */

/**
 * `POST /api/pv` — 공개 페이지가 보내는 방문 기록.
 *
 * 공개 라우트다. 인증을 걸 수 없는 자리(방문자는 로그인하지 않는다)라
 * 대신 저장하는 내용을 최소로 둔다: 날짜와, 되돌릴 수 없는 방문자
 * 식별자뿐이다. 본문도 읽지 않는다.
 *
 * 실패하더라도 방문자 화면에는 아무 영향이 없어야 하므로 어떤 경우든
 * 204 로 답하고, 오류는 로그로만 남긴다.
 */
async function handlePageView(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const done = new Response(null, { status: 204, headers: corsHeaders() });
  const db = requireDb(env);
  if (!db) return done;

  const ua = req.headers.get('user-agent') ?? '';
  if (isBot(ua)) return done;

  // 관리자 화면을 우리가 들여다보는 것은 방문이 아니다. 비콘 쪽에서도
  // 막지만, 주소를 직접 불러 호출하는 경우까지 여기서 잘라낸다.
  const from = req.headers.get('referer') ?? '';
  if (/\/admin(\/|$|\?)/.test(from)) return done;

  const ip = req.headers.get('cf-connecting-ip') ?? '';
  const day = kstDay();

  ctx.waitUntil(
    (async () => {
      try {
        await ensureAnalyticsSchema(db);
        // 세션 서명키를 소금으로 재사용한다. 식별자만 보고 IP 를
        // 되짚어 보려는 시도를 막기 위한 것 — 서버만 아는 값이면 된다.
        const salt = await getSessionSecret(db, env.SESSION_SECRET);
        const vid = await visitorId(ip, ua, day, salt);
        await recordView(db, day, vid);
        // 오래된 식별자 정리는 가끔만. 매 방문마다 DELETE 를 돌릴
        // 이유가 없다.
        if (Math.random() < 0.01) await pruneSeen(db, day);
      } catch (e: unknown) {
        console.error('pageview record failed:', e);
      }
    })(),
  );
  return done;
}

/** `GET /api/admin/stats` — 관리자 화면이 그릴 숫자들. */
async function handleStats(req: Request, env: Env, url: URL): Promise<Response> {
  const r = await authenticate(req, env);
  if (!r.ok) return r.res;
  const db = requireDb(env);
  if (!db) return json({ ok: false, error: '통계 저장소가 없습니다.' }, 503);

  const days = Math.min(Math.max(Number(url.searchParams.get('days') ?? 30) || 30, 7), 365);
  const months = Math.min(Math.max(Number(url.searchParams.get('months') ?? 12) || 12, 3), 60);
  const today = kstDay();

  try {
    await ensureAnalyticsSchema(db);
    const [sum, daily, monthly] = await Promise.all([
      viewSummary(db, today),
      dailyStats(db, days, today),
      monthlyStats(db, months),
    ]);
    return json({ ok: true, today, summary: sum, daily, monthly });
  } catch (e: unknown) {
    return json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      500,
    );
  }
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
  // Named "news" by the page builder but titled 자료실 on the old site —
  // a board of 시험성적서 · 사이즈표 · E-카탈로그. The Naver sitelink for it
  // still reads 자료실, so it has to land on the resources page, not
  // 공지사항. (Verified against the pre-migration capture in
  // ~/클로드/njfashion-backup/screenshots/pages-news.png.)
  '/pages/news':    '/ko/resources',
  // The old builder's home. Not covered by any keyword rule below —
  // "main" says nothing about what the visitor wanted.
  '/main':          '/ko',
  // Shop/account pages that no longer exist. The footer linked the two
  // policy pages on every page, so they are the likeliest to be indexed;
  // privacy is the only equivalent the new site has.
  '/members/policy': '/ko/privacy',
  '/members/terms':  '/ko/privacy',
};

/**
 * Whole path families from the old shop that have no counterpart: login,
 * signup, mypage, cart. Nothing to map them onto, so they go home rather
 * than dead-end on a 404.
 */
const LEGACY_DEAD_PREFIXES = ['/members', '/mypages', '/cart'];

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
  if (!target && LEGACY_DEAD_PREFIXES.some((d) => p === d || p.startsWith(`${d}/`))) {
    target = '/ko';
  }
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
    // no-store: 로그인 응답과 접수함 목록 모두 캐시되면 곤란하다.
    headers: { ...corsHeaders(), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
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
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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

    // 계정 표는 Worker 가 스스로 만든다 — 그래야 D1 콘솔이나 wrangler
    // 없이 관리자 페이지만으로 첫 계정을 만들 수 있다. 이미 있으면
    // 아무 일도 하지 않고, isolate 당 한 번만 돈다.
    if (url.pathname.startsWith('/api/admin/') && env.ADMIN_DB) {
      try {
        await ensureSchema(env.ADMIN_DB);
      } catch (e: unknown) {
        console.error('admin schema init failed:', e);
      }
    }

    // 공개 — 방문자가 보내는 방문 기록. 인증 없음.
    if (url.pathname === '/api/pv' && req.method === 'POST') {
      return handlePageView(req, env, ctx);
    }

    if (url.pathname === '/api/admin/login' && req.method === 'POST') {
      return handleLogin(req, env);
    }

    if (url.pathname === '/api/admin/session' && req.method === 'GET') {
      return handleSession(req, env);
    }

    if (url.pathname === '/api/admin/users') {
      if (req.method === 'GET') return handleUserList(req, env);
      if (req.method === 'POST') return handleUserCreate(req, env);
      if (req.method === 'DELETE') return handleUserDelete(req, env, url);
    }

    if (url.pathname === '/api/admin/stats' && req.method === 'GET') {
      return handleStats(req, env, url);
    }

    if (url.pathname === '/api/admin/gh-token') {
      if (req.method === 'GET') return handleGhTokenStatus(req, env);
      if (req.method === 'POST') return handleGhTokenSave(req, env);
    }

    if (url.pathname === '/api/admin/users/password' && req.method === 'POST') {
      return handleUserPassword(req, env);
    }

    if (url.pathname.startsWith('/api/admin/gh/')) {
      return handleGitHubProxy(req, env, url);
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
      return handleContact(req, env, ctx);
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
