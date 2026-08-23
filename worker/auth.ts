/**
 * Admin sign-in: 아이디 / 비밀번호 → 서명된 세션 토큰.
 *
 * Replaces pasting a GitHub PAT into every browser. Two things change:
 *
 *   · The GitHub token now lives only in the Worker (ADMIN_GH_PAT secret).
 *     Browsers never see it, so a shared iPad or a stolen laptop no longer
 *     carries repo write access around.
 *   · Operators authenticate with credentials they can remember, which is
 *     the whole point — a 40-character token is unusable on a tablet.
 *
 * Sessions are stateless: the token is `payload.signature`, signed with
 * HMAC-SHA256 over SESSION_SECRET. There is no session store to keep, and
 * revoking everyone at once is just rotating that one secret.
 *
 * Passwords are stored as PBKDF2-SHA256 hashes (per-user random salt) in
 * the ADMIN_USERS secret. Generate it with `node scripts/make-admin-user.mjs`
 * — the plaintext password never leaves the machine that runs it.
 */

export type AdminUser = {
  id: string;
  /** base64 salt */
  salt: string;
  /** base64 PBKDF2-SHA256 hash */
  hash: string;
  iterations?: number;
};

const DEFAULT_ITERATIONS = 100_000;
const SESSION_DAYS = 30;

const enc = new TextEncoder();

function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64ToBytes(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Length-independent compare so a wrong guess leaks no timing signal. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

export async function derivePasswordHash(
  password: string, saltB64: string, iterations = DEFAULT_ITERATIONS,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: b64ToBytes(saltB64), iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export function parseUsers(raw: string | undefined): AdminUser[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AdminUser[]) : [];
  } catch {
    return [];
  }
}

/** Returns the matching user id, or null. Never says which half was wrong. */
export async function verifyCredentials(
  users: AdminUser[], id: string, password: string,
): Promise<string | null> {
  const user = users.find((u) => u.id.toLowerCase() === id.trim().toLowerCase());
  if (!user) {
    // Still burn a derivation so a missing id and a wrong password take
    // roughly the same time.
    await derivePasswordHash(password, 'AAAAAAAAAAAAAAAAAAAAAA==');
    return null;
  }
  const got = await derivePasswordHash(password, user.salt, user.iterations ?? DEFAULT_ITERATIONS);
  return timingSafeEqual(got, b64ToBytes(user.hash)) ? user.id : null;
}

export async function issueSession(secret: string, id: string): Promise<string> {
  const payload = b64urlEncode(
    enc.encode(JSON.stringify({ id, exp: Date.now() + SESSION_DAYS * 86_400_000 })),
  );
  return `${payload}.${b64urlEncode(await hmac(secret, payload))}`;
}

/** Verified session id, or null when the token is forged or expired. */
export async function readSession(secret: string, token: string): Promise<string | null> {
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let expected: Uint8Array;
  try {
    expected = await hmac(secret, payload);
  } catch {
    return null;
  }
  let given: Uint8Array;
  try {
    given = b64urlDecode(sig);
  } catch {
    return null;
  }
  if (!timingSafeEqual(expected, given)) return null;
  try {
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as {
      id?: string; exp?: number;
    };
    if (!claims.id || !claims.exp || Date.now() > claims.exp) return null;
    return claims.id;
  } catch {
    return null;
  }
}

export const SESSION_TTL_DAYS = SESSION_DAYS;
