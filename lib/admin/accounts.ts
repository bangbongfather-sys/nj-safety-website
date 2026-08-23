/**
 * 계정 관리 API 호출부.
 *
 * 전부 같은 도메인의 Worker 로 간다. 비밀번호는 이 파일을 거쳐 서버로
 * 한 번 갈 뿐 어디에도 저장되지 않는다 — 서버도 해시만 남긴다.
 */

import { WORKER_ORIGIN } from './github';

export type Role = 'owner' | 'staff';

export type AdminAccount = {
  id: string;
  displayName: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export type AccountsView = {
  me: { id: string; role: Role; mode: 'session' | 'pat' };
  users: AdminAccount[];
};

async function call<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const r = await fetch(`${WORKER_ORIGIN}${path}`, {
      ...init,
      headers: {
        Authorization: `token ${token}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers ?? {}),
      },
    });
    const text = await r.text();
    let data: unknown = null;
    try {
      data = JSON.parse(text);
    } catch {
      // Worker 가 평문으로 답하는 경로(인증 실패 등)가 있다.
      return { ok: false, error: text.trim() || `요청 실패 (${r.status})` };
    }
    const body = data as { ok?: boolean; error?: string };
    if (!r.ok || body?.ok === false) {
      return { ok: false, error: body?.error ?? `요청 실패 (${r.status})` };
    }
    return { ok: true, data: data as T };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function fetchAccounts(token: string) {
  return call<AccountsView>('/api/admin/users', token);
}

export function createAccount(
  token: string,
  input: { id: string; password: string; displayName?: string; role?: Role },
) {
  return call<{ user: AdminAccount }>('/api/admin/users', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function changePassword(
  token: string,
  input: { id?: string; currentPassword?: string; password: string },
) {
  return call<Record<string, never>>('/api/admin/users/password', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteAccount(token: string, id: string) {
  return call<Record<string, never>>(
    `/api/admin/users?id=${encodeURIComponent(id)}`,
    token,
    { method: 'DELETE' },
  );
}

export function fetchTokenStatus(token: string) {
  return call<{ saved: boolean; source: 'secret' | 'database' | null }>(
    '/api/admin/gh-token',
    token,
  );
}

export function saveGitHubToken(token: string, ghToken: string) {
  return call<{ login: string }>('/api/admin/gh-token', token, {
    method: 'POST',
    body: JSON.stringify({ token: ghToken }),
  });
}
