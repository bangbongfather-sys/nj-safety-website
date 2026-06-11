// Lightweight GitHub Contents API helper, used by the admin UI to commit
// product JSONs and locale dictionaries directly from the browser.
// All calls authenticate with a Personal Access Token kept in localStorage.
//
// Offline (비행기 모드) behaviour — see lib/admin/offline.ts:
//   · reads fall back to the last-synced local copy
//   · writes are queued locally and replayed when the connection returns
//   · callers can branch on GhFile.fromCache / PutResult.queued for UI

import {
  cacheFile,
  getCachedFile,
  dropCachedFile,
  enqueueWrite,
  isNetworkError,
  flushQueue as flushOfflineQueue,
  type FlushResult,
} from './offline';

export const REPO_OWNER = 'bangbongfather-sys';
export const REPO_NAME = 'nj-safety-website';
export const REPO_BRANCH = 'main';

export type GhFile = {
  path: string;
  sha: string;
  content: string; // base64-decoded utf8 text
  rawSha: string;  // git blob sha (same as content sha for files)
  /** True when served from the local offline cache instead of GitHub. */
  fromCache?: boolean;
};

export function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToUtf8(b64: string): string {
  const binary = atob(b64.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

function api(path: string): string {
  return `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}${path}`;
}

function headers(pat: string): HeadersInit {
  return {
    Authorization: `token ${pat}`,
    Accept: 'application/vnd.github+json',
  };
}

/**
 * Quick check that the PAT works and returns the GitHub login.
 * `offline: true` means the check couldn't reach GitHub at all (airplane
 * mode) — the token is NOT invalid, callers must not discard it.
 */
export async function ghWhoami(
  pat: string,
): Promise<{ ok: boolean; login?: string; error?: string; offline?: boolean }> {
  try {
    const r = await fetch('https://api.github.com/user', { headers: headers(pat) });
    if (!r.ok) return { ok: false, error: `${r.status} ${r.statusText}` };
    const data = await r.json();
    return { ok: true, login: data.login };
  } catch (e: unknown) {
    return {
      ok: false,
      offline: isNetworkError(e),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * GET a file's metadata + content (decoded). Returns null if file doesn't
 * exist. Every successful read refreshes the offline cache; when the
 * network is unreachable the last-synced copy is returned instead
 * (marked `fromCache: true`).
 */
export async function ghGetFile(pat: string, filePath: string): Promise<GhFile | null> {
  let r: Response;
  try {
    r = await fetch(api(`/contents/${encodeURIComponent(filePath)}?ref=${REPO_BRANCH}`), {
      headers: headers(pat),
    });
  } catch (e: unknown) {
    if (isNetworkError(e)) {
      const cached = getCachedFile(filePath);
      if (cached) {
        return {
          path: filePath,
          sha: cached.sha,
          rawSha: cached.sha,
          content: cached.content,
          fromCache: true,
        };
      }
      throw new Error(
        `오프라인 상태이고 ${filePath} 의 로컬 사본이 없습니다. 온라인에서 한 번 열어두면 비행기 모드에서도 편집할 수 있습니다.`,
      );
    }
    throw e;
  }
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GET ${filePath} failed: ${r.status} ${r.statusText}`);
  const data = await r.json();
  const content =
    data.encoding === 'base64' ? base64ToUtf8(data.content) : String(data.content ?? '');
  cacheFile(filePath, content, data.sha);
  return {
    path: data.path,
    sha: data.sha,
    rawSha: data.sha,
    content,
  };
}

/** GET the SHA only — cheaper for existence checks before PUT. */
export async function ghGetFileSha(pat: string, filePath: string): Promise<string | null> {
  const r = await fetch(api(`/contents/${encodeURIComponent(filePath)}?ref=${REPO_BRANCH}`), {
    headers: headers(pat),
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GET ${filePath} failed: ${r.status} ${r.statusText}`);
  const data = await r.json();
  return data.sha ?? null;
}

/**
 * Create or update a text file. Provide `sha` when updating an existing file.
 *
 * Auto-retries on 409 (stale SHA): re-fetches the current SHA from GitHub
 * and PUTs again. This handles the very common case where two autosaves
 * race — save A is still in flight when save B starts with the old SHA,
 * or someone else committed between our last fetch and now.
 *
 * NOTE: the retry just adopts the remote SHA and overwrites — appropriate
 * for our admin workflow where the only writer is the editor itself, but
 * not safe for multi-author scenarios.
 */
export async function ghPutFile(
  pat: string,
  filePath: string,
  text: string,
  commitMessage: string,
  sha: string | null,
): Promise<{ commitSha: string; contentSha: string; queued?: boolean }> {
  const attempt = async (useSha: string | null): Promise<Response> => {
    const body: Record<string, string> = {
      message: commitMessage,
      content: utf8ToBase64(text),
      branch: REPO_BRANCH,
    };
    if (useSha) body.sha = useSha;
    return fetch(api(`/contents/${encodeURIComponent(filePath)}`), {
      method: 'PUT',
      headers: { ...headers(pat), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  // Queue the write instead of failing when there's no network (비행기 모드).
  // The local cache is updated too, so re-opening the editor offline shows
  // the latest edit rather than the last-synced server state.
  const queueOffline = (): { commitSha: string; contentSha: string; queued: true } => {
    enqueueWrite({ kind: 'put', path: filePath, text, message: commitMessage });
    cacheFile(filePath, text, getCachedFile(filePath)?.sha ?? sha ?? '');
    return { commitSha: '', contentSha: sha ?? '', queued: true };
  };

  let r: Response;
  try {
    r = await attempt(sha);
  } catch (e: unknown) {
    if (isNetworkError(e)) return queueOffline();
    throw e;
  }

  // 409 = SHA mismatch. Re-fetch fresh SHA and retry once.
  if (r.status === 409) {
    try {
      const freshSha = await ghGetFileSha(pat, filePath);
      r = await attempt(freshSha);
    } catch (e: unknown) {
      if (isNetworkError(e)) return queueOffline();
      // If the refresh itself fails, fall through to the original error below.
    }
  }

  if (!r.ok) {
    const errText = await r.text();
    throw new Error(`PUT failed: ${r.status} — ${errText.slice(0, 400)}`);
  }
  const data = await r.json();
  const contentSha = data.content?.sha ?? '';
  cacheFile(filePath, text, contentSha);
  return {
    commitSha: data.commit?.sha ?? '',
    contentSha,
  };
}

/**
 * Same as ghPutFile but takes a Blob — used for images / other binaries
 * where we shouldn't run the bytes through TextEncoder. Reads the blob,
 * base64-encodes the raw bytes, and PUTs.
 */
export async function ghPutBlob(
  pat: string,
  filePath: string,
  blob: Blob,
  commitMessage: string,
  sha: string | null,
): Promise<{ commitSha: string }> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  // Walk in chunks so very large files don't blow the call stack via apply.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  const content = btoa(binary);
  const body: Record<string, string> = {
    message: commitMessage,
    content,
    branch: REPO_BRANCH,
  };
  if (sha) body.sha = sha;
  const r = await fetch(api(`/contents/${encodeURIComponent(filePath)}`), {
    method: 'PUT',
    headers: { ...headers(pat), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const errText = await r.text();
    throw new Error(`PUT blob failed: ${r.status} — ${errText.slice(0, 400)}`);
  }
  const data = await r.json();
  return { commitSha: data.commit?.sha ?? '' };
}

/** Delete a file. Requires the current SHA. Queued when offline. */
export async function ghDeleteFile(
  pat: string,
  filePath: string,
  commitMessage: string,
  sha: string,
): Promise<{ queued?: boolean } | void> {
  let r: Response;
  try {
    r = await fetch(api(`/contents/${encodeURIComponent(filePath)}`), {
      method: 'DELETE',
      headers: { ...headers(pat), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: commitMessage, branch: REPO_BRANCH, sha }),
    });
  } catch (e: unknown) {
    if (isNetworkError(e)) {
      enqueueWrite({ kind: 'delete', path: filePath, message: commitMessage });
      dropCachedFile(filePath);
      return { queued: true };
    }
    throw e;
  }
  if (!r.ok) {
    const errText = await r.text();
    throw new Error(`DELETE failed: ${r.status} — ${errText.slice(0, 400)}`);
  }
  dropCachedFile(filePath);
}

/**
 * List a directory's contents (file paths only). Successful listings are
 * cached so directory-driven admin pages (products list 등) still render
 * in airplane mode.
 */
export async function ghListDir(pat: string, dirPath: string): Promise<string[]> {
  const cacheKey = `__dir__:${dirPath}`;
  let r: Response;
  try {
    r = await fetch(api(`/contents/${encodeURIComponent(dirPath)}?ref=${REPO_BRANCH}`), {
      headers: headers(pat),
    });
  } catch (e: unknown) {
    if (isNetworkError(e)) {
      const cached = getCachedFile(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached.content) as string[];
        } catch {
          return [];
        }
      }
      return [];
    }
    throw e;
  }
  if (r.status === 404) return [];
  if (!r.ok) throw new Error(`LIST ${dirPath} failed: ${r.status} ${r.statusText}`);
  const data = await r.json();
  if (!Array.isArray(data)) return [];
  const files = data
    .filter((e: { type: string }) => e.type === 'file')
    .map((e: { path: string }) => e.path);
  cacheFile(cacheKey, JSON.stringify(files), 'dir');
  return files;
}

/**
 * Replay every queued offline write against GitHub. Call when the
 * connection returns (the OfflineBar does this automatically on the
 * window 'online' event, plus on demand via its 지금 동기화 button).
 */
export async function ghFlushOfflineQueue(pat: string): Promise<FlushResult> {
  return flushOfflineQueue(pat, {
    getSha: ghGetFileSha,
    putFile: async (p, path, text, message, sha) => {
      const r = await ghPutFile(p, path, text, message, sha);
      return { contentSha: r.contentSha };
    },
    deleteFile: async (p, path, message, sha) => {
      await ghDeleteFile(p, path, message, sha);
    },
  });
}
