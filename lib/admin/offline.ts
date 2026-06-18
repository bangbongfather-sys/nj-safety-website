// Offline support for the admin layer (비행기 모드).
//
// The admin UI commits straight to GitHub from the browser, so with no
// network every load/save used to hard-fail (and the login check even
// deleted the saved PAT). This module gives github.ts two primitives:
//
//   1. File cache  — last-known content+sha per repo path, refreshed on
//      every successful read/write. When offline, reads serve from here.
//   2. Write queue — saves made while offline are queued (localStorage)
//      and replayed in order when the connection returns. Replay fetches
//      a fresh SHA per file so queued commits never 409 on stale state.
//
// Image uploads (R2 worker endpoint) stay online-only — binary payloads
// don't fit localStorage budgets and queueing them silently would risk
// publishing stale photos much later.

const CACHE_KEY = 'nj_admin_file_cache_v1';
const QUEUE_KEY = 'nj_admin_offline_queue_v1';
const LOGIN_KEY = 'nj_admin_login_cache_v1';
const QUEUE_EVENT = 'nj-admin-offline-queue';

// localStorage is ~5MB; keep the file cache well under it so the queue
// always has room. Oldest entries are evicted first.
const CACHE_BUDGET_BYTES = 3_000_000;

export type CachedFile = {
  content: string;
  sha: string;
  /** epoch ms of last successful sync with GitHub */
  ts: number;
};

export type QueuedWrite = {
  id: string;
  kind: 'put' | 'delete';
  path: string;
  /** present for kind === 'put' */
  text?: string;
  message: string;
  ts: number;
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function hasStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

/** True when the browser reports no network (airplane mode). */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * fetch() rejects with a TypeError when the network itself is unreachable
 * (vs. an HTTP error response, which resolves). That plus navigator.onLine
 * is how we tell "airplane mode" apart from a real API failure.
 */
export function isNetworkError(e: unknown): boolean {
  if (isOffline()) return true;
  return e instanceof TypeError;
}

// ───────────────────────── file cache ─────────────────────────

type CacheMap = Record<string, CachedFile>;

function readCache(): CacheMap {
  if (!hasStorage()) return {};
  return safeParse<CacheMap>(window.localStorage.getItem(CACHE_KEY), {});
}

function writeCache(map: CacheMap): void {
  if (!hasStorage()) return;
  let entries = Object.entries(map);
  // Evict oldest-synced entries until the serialized cache fits the budget.
  let serialized = JSON.stringify(Object.fromEntries(entries));
  while (serialized.length > CACHE_BUDGET_BYTES && entries.length > 0) {
    entries = entries.sort((a, b) => a[1].ts - b[1].ts).slice(1);
    serialized = JSON.stringify(Object.fromEntries(entries));
  }
  try {
    window.localStorage.setItem(CACHE_KEY, serialized);
  } catch {
    // Quota exceeded even after eviction — drop the cache rather than crash.
    try {
      window.localStorage.removeItem(CACHE_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function cacheFile(path: string, content: string, sha: string): void {
  const map = readCache();
  map[path] = { content, sha, ts: Date.now() };
  writeCache(map);
}

export function getCachedFile(path: string): CachedFile | null {
  return readCache()[path] ?? null;
}

export function dropCachedFile(path: string): void {
  const map = readCache();
  if (path in map) {
    delete map[path];
    writeCache(map);
  }
}

// ───────────────────────── login cache ─────────────────────────

export function cacheLogin(login: string): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(LOGIN_KEY, login);
  } catch {
    /* ignore */
  }
}

export function getCachedLogin(): string | null {
  if (!hasStorage()) return null;
  return window.localStorage.getItem(LOGIN_KEY);
}

// ───────────────────────── write queue ─────────────────────────

function notifyQueueChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(QUEUE_EVENT));
  }
}

export function getQueue(): QueuedWrite[] {
  if (!hasStorage()) return [];
  return safeParse<QueuedWrite[]>(window.localStorage.getItem(QUEUE_KEY), []);
}

function setQueue(queue: QueuedWrite[]): void {
  if (!hasStorage()) return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  notifyQueueChanged();
}

/**
 * Queue a write for later replay. Multiple queued puts to the same path
 * collapse into the latest one (intermediate states would be overwritten
 * by the replay anyway, and this keeps the queue within quota).
 */
export function enqueueWrite(w: Omit<QueuedWrite, 'id' | 'ts'>): QueuedWrite {
  const entry: QueuedWrite = {
    ...w,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
  };
  const queue = getQueue().filter(
    (q) => !(q.path === entry.path && q.kind === entry.kind && entry.kind === 'put'),
  );
  queue.push(entry);
  setQueue(queue);
  return entry;
}

/** Subscribe to queue changes (returns unsubscribe). */
export function onQueueChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(QUEUE_EVENT, cb);
  // storage event covers queue changes from other tabs.
  const onStorage = (e: StorageEvent) => {
    if (e.key === QUEUE_KEY) cb();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(QUEUE_EVENT, cb);
    window.removeEventListener('storage', onStorage);
  };
}

export type FlushResult = {
  flushed: number;
  remaining: number;
  errors: Array<{ path: string; error: string }>;
};

/**
 * Replay queued writes against GitHub, oldest first. Each replay fetches
 * the file's current SHA so commits made elsewhere in the meantime are
 * overwritten knowingly (single-author admin workflow, same policy as the
 * 409 retry in ghPutFile).
 *
 * `deps` are injected to avoid a circular import with github.ts.
 */
export async function flushQueue(
  pat: string,
  deps: {
    getSha: (pat: string, path: string) => Promise<string | null>;
    putFile: (
      pat: string,
      path: string,
      text: string,
      message: string,
      sha: string | null,
    ) => Promise<{ contentSha: string }>;
    deleteFile: (pat: string, path: string, message: string, sha: string) => Promise<void>;
  },
): Promise<FlushResult> {
  const queue = getQueue();
  const errors: FlushResult['errors'] = [];
  let flushed = 0;

  for (const item of queue) {
    try {
      const sha = await deps.getSha(pat, item.path);
      if (item.kind === 'put') {
        const r = await deps.putFile(pat, item.path, item.text ?? '', item.message, sha);
        cacheFile(item.path, item.text ?? '', r.contentSha);
      } else if (sha) {
        await deps.deleteFile(pat, item.path, item.message, sha);
        dropCachedFile(item.path);
      }
      // Remove this item only after it lands.
      setQueue(getQueue().filter((q) => q.id !== item.id));
      flushed += 1;
    } catch (e: unknown) {
      if (isNetworkError(e)) break; // still offline — stop, keep the rest queued
      errors.push({ path: item.path, error: e instanceof Error ? e.message : String(e) });
      // Non-network error (auth, validation): drop the item so it doesn't
      // wedge the queue forever, but surface it to the UI.
      setQueue(getQueue().filter((q) => q.id !== item.id));
    }
  }

  return { flushed, remaining: getQueue().length, errors };
}
