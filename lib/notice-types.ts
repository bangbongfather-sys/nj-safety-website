// Pure types + constants for the notice board. No Node built-ins here so
// this module is safe to import from client components (the board UI and
// the admin editor). Filesystem reads live in lib/notices.ts (server only).

export const NOTICE_TYPES = ['notice', 'product', 'cert', 'event'] as const;
export type NoticeType = (typeof NOTICE_TYPES)[number];

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
};
