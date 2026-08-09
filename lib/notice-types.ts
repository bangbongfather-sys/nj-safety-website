// Pure types + constants for the notice board. No Node built-ins here so
// this module is safe to import from client components (the board UI and
// the admin editor). Filesystem reads live in lib/notices.ts (server only).

export const NOTICE_TYPES = ['notice', 'product', 'cert', 'event'] as const;
export type NoticeType = (typeof NOTICE_TYPES)[number];

/**
 * Site-wide popup settings for a notice.
 *
 * `until` is checked in the browser, not at build time: the site is a
 * static export, so a build-time date comparison would freeze on the day
 * the build ran and keep showing an expired popup until the next deploy.
 */
export type NoticePopup = {
  enabled: boolean;
  /** YYYY-MM-DD, inclusive last day. Empty = 무기한. */
  until?: string;
};

export type Notice = {
  id: string;
  type: NoticeType;
  pinned?: boolean;
  /** ISO date string, YYYY-MM-DD. */
  date: string;
  titleKo: string;
  titleEn: string;
  bodyKo: string;
  bodyEn: string;
  /** Public R2 URL of the notice image. Shown on the board, detail page and popup. */
  image?: string;
  popup?: NoticePopup;
};

/** True when the notice should be considered for the popup on `today`. */
export function isPopupLive(n: Notice, today: string): boolean {
  if (!n.popup?.enabled) return false;
  const until = n.popup.until?.trim();
  if (!until) return true;
  return today <= until;
}
