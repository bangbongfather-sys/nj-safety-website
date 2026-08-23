/**
 * 관리자 계정 저장소 (D1).
 *
 * 계정을 Cloudflare 시크릿에 JSON 으로 넣어 두면 직원 한 명 추가하는
 * 데도 터미널을 열고 해시를 만들어 다시 배포해야 한다. 표로 옮겨서
 * 관리자 페이지 안에서 끝나게 한다.
 *
 * 사이트 내용(공지·제품·자료실)은 이 표와 아무 상관이 없다. 그쪽은
 * 예전 그대로 GitHub 저장소에 커밋된다. 여기 들어가는 건 로그인 정보뿐.
 */

import { hashNewPassword, randomSecret, type AdminUser } from './auth';

export type Role = 'owner' | 'staff';

export type AdminAccount = {
  id: string;
  displayName: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

/** D1Database 의 최소 형태 — @cloudflare/workers-types 를 끌어오지 않기 위해. */
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

type UserRow = {
  id: string;
  display_name: string;
  salt: string;
  hash: string;
  iterations: number;
  role: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

function normalizeId(id: string): string {
  return id.trim().toLowerCase();
}

/** 아이디로 쓸 수 있는 글자만. 공백·한글·기호를 막아 두면 나중에
 *  "로그인이 안 돼요" 의 절반이 사라진다. */
export function validateId(id: string): string | null {
  const v = normalizeId(id);
  if (v.length < 3) return '아이디는 3자 이상이어야 합니다.';
  if (v.length > 32) return '아이디는 32자 이하로 해주세요.';
  if (!/^[a-z0-9._-]+$/.test(v)) {
    return '아이디는 영문 소문자, 숫자, 점(.), 밑줄(_), 하이픈(-) 만 쓸 수 있습니다.';
  }
  return null;
}

export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return '비밀번호는 8자 이상이어야 합니다.';
  if (pw.length > 200) return '비밀번호가 너무 깁니다.';
  return null;
}

function toAccount(row: UserRow): AdminAccount {
  return {
    id: row.id,
    displayName: row.display_name ?? '',
    role: row.role === 'owner' ? 'owner' : 'staff',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}

export async function findUser(
  db: D1Database,
  id: string,
): Promise<{ credentials: AdminUser; account: AdminAccount } | null> {
  const row = await db
    .prepare('SELECT * FROM admin_users WHERE id = ?')
    .bind(normalizeId(id))
    .first<UserRow>();
  if (!row) return null;
  return {
    credentials: { id: row.id, salt: row.salt, hash: row.hash, iterations: row.iterations },
    account: toAccount(row),
  };
}

export async function listUsers(db: D1Database): Promise<AdminAccount[]> {
  const { results } = await db
    .prepare('SELECT * FROM admin_users ORDER BY role = \'owner\' DESC, id')
    .all<UserRow>();
  return results.map(toAccount);
}

export async function countUsers(db: D1Database): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM admin_users').first<{ n: number }>();
  return row?.n ?? 0;
}

export async function countOwners(db: D1Database): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM admin_users WHERE role = 'owner'")
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function createUser(
  db: D1Database,
  input: { id: string; password: string; displayName?: string; role: Role },
  now: string,
): Promise<AdminAccount> {
  const id = normalizeId(input.id);
  const { salt, hash, iterations } = await hashNewPassword(input.password);
  await db
    .prepare(
      `INSERT INTO admin_users
         (id, display_name, salt, hash, iterations, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, input.displayName?.trim() ?? '', salt, hash, iterations, input.role, now, now)
    .run();
  return {
    id,
    displayName: input.displayName?.trim() ?? '',
    role: input.role,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };
}

export async function setPassword(
  db: D1Database,
  id: string,
  password: string,
  now: string,
): Promise<void> {
  const { salt, hash, iterations } = await hashNewPassword(password);
  await db
    .prepare(
      'UPDATE admin_users SET salt = ?, hash = ?, iterations = ?, updated_at = ? WHERE id = ?',
    )
    .bind(salt, hash, iterations, now, normalizeId(id))
    .run();
}

export async function deleteUser(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM admin_users WHERE id = ?').bind(normalizeId(id)).run();
}

export async function touchLogin(db: D1Database, id: string, now: string): Promise<void> {
  await db
    .prepare('UPDATE admin_users SET last_login_at = ? WHERE id = ?')
    .bind(now, normalizeId(id))
    .run();
}

/**
 * 서버가 GitHub 에 저장할 때 쓸 토큰.
 *
 * ADMIN_GH_PAT 시크릿이 있으면 그쪽이 이긴다. 없으면 표에 넣어 둔
 * 값을 쓴다 — 관리자 페이지에서 한 번 저장해 두면 터미널을 열 일이
 * 아예 없어진다. 어느 쪽이든 브라우저로는 다시 내려가지 않는다.
 */
export async function getGitHubToken(
  db: D1Database,
  override?: string,
): Promise<string | null> {
  if (override) return override;
  const row = await db
    .prepare("SELECT value FROM admin_settings WHERE key = 'gh_token'")
    .first<{ value: string }>();
  return row?.value ?? null;
}

export async function setGitHubToken(db: D1Database, token: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO admin_settings (key, value) VALUES ('gh_token', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .bind(token)
    .run();
}

/**
 * 세션 서명키.
 *
 * 시크릿으로 두면 사람이 만들어 넣어야 하는 단계가 하나 더 생긴다.
 * 처음 필요할 때 Worker 가 스스로 만들어 표에 넣고, 그 뒤로는 그걸
 * 계속 쓴다. 이 값이 바뀌면 모두 로그아웃되므로 한 번 만들면 두지만,
 * SESSION_SECRET 환경변수가 있으면 그쪽이 이긴다 — 전부 강제
 * 로그아웃시키고 싶을 때 쓸 수 있는 손잡이로 남겨 둔다.
 */
export async function getSessionSecret(
  db: D1Database,
  override?: string,
): Promise<string> {
  if (override) return override;
  const row = await db
    .prepare("SELECT value FROM admin_settings WHERE key = 'session_secret'")
    .first<{ value: string }>();
  if (row?.value) return row.value;

  const created = randomSecret();
  // 두 요청이 동시에 들어와도 먼저 넣은 쪽이 이기도록 INSERT OR IGNORE
  // 후 다시 읽는다. 각자 만든 키로 서명해 서로를 못 알아보는 상황을
  // 피하기 위한 것.
  await db
    .prepare("INSERT OR IGNORE INTO admin_settings (key, value) VALUES ('session_secret', ?)")
    .bind(created)
    .run();
  const settled = await db
    .prepare("SELECT value FROM admin_settings WHERE key = 'session_secret'")
    .first<{ value: string }>();
  return settled?.value ?? created;
}
