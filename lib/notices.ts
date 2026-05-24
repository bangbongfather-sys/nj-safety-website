import fs from 'node:fs';
import path from 'node:path';
import type { Notice } from './notice-types';

// Notice board data. Source of truth is `data/notices.json`, committed via
// the admin UI (GitHub Contents API) and bundled at build time — same
// pattern as products / product-categories. Since the site is a static
// export, a newly added notice's detail page only appears after the next
// Cloudflare build picks up the committed JSON.

export { NOTICE_TYPES, type NoticeType, type Notice } from './notice-types';

type NoticesFile = { notices?: Notice[] };

const NOTICES_PATH = path.join(process.cwd(), 'data', 'notices.json');

function readAll(): Notice[] {
  try {
    const raw = fs.readFileSync(NOTICES_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as NoticesFile;
    return Array.isArray(parsed.notices) ? parsed.notices : [];
  } catch {
    return [];
  }
}

/** Pinned first, then newest date first. Stable for equal keys. */
function sortNotices(list: Notice[]): Notice[] {
  return [...list].sort((a, b) => {
    const ap = a.pinned ? 1 : 0;
    const bp = b.pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return b.date.localeCompare(a.date);
  });
}

export function getAllNotices(): Notice[] {
  return sortNotices(readAll());
}

export function getAllNoticeIds(): string[] {
  return readAll().map((n) => n.id);
}

export function getNotice(id: string): Notice | null {
  return readAll().find((n) => n.id === id) ?? null;
}
