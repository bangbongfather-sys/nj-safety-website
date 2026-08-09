'use client';

/**
 * Site-wide notice popup.
 *
 * The operator flags a notice as a popup in /admin/notices; this shows
 * the newest live one on first visit. Candidates are gathered server-side
 * (they're baked into the static export), but the expiry check runs here
 * so a popup whose `until` date passes stops appearing without waiting
 * for the next deploy.
 *
 * Dismissal is per-notice in localStorage:
 *   - "닫기"              → hidden for this browser session only
 *   - "오늘 하루 보지 않기" → hidden until the next calendar day
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Notice } from '@/lib/notice-types';
import { isPopupLive } from '@/lib/notice-types';

type Props = {
  locale: 'ko' | 'en';
  /** Every notice flagged as a popup, newest first. Expiry filtered here. */
  candidates: Notice[];
};

const DISMISS_PREFIX = 'nj_notice_popup_';

function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** First paragraph, tags stripped, trimmed to a teaser length. */
function excerpt(body: string, max = 140): string {
  const text = body.replace(/<[^>]+>/g, '').split(/\n\s*\n/)[0]?.trim() ?? '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export default function NoticePopup({ locale, candidates }: Props) {
  const [active, setActive] = useState<Notice | null>(null);
  const [closing, setClosing] = useState(false);
  const pathname = usePathname() ?? '';

  useEffect(() => {
    if (candidates.length === 0) return;
    const today = todayIso();
    const pick = candidates.find((n) => {
      if (!isPopupLive(n, today)) return false;
      // Already reading this notice — a popup for it would just cover the
      // page the visitor came here for (the popup's own CTA lands here).
      if (pathname.includes(`/notices/${n.id}`)) return false;
      try {
        // Value is the date the operator's visitor dismissed it "for the
        // day"; anything else (or a past date) means show it again.
        const seen = window.localStorage.getItem(DISMISS_PREFIX + n.id);
        if (seen === today) return false;
        if (window.sessionStorage.getItem(DISMISS_PREFIX + n.id)) return false;
      } catch {
        // Private mode / storage blocked — showing it is the safe default.
      }
      return true;
    });
    if (pick) {
      // One frame's delay so the popup animates in after paint rather than
      // appearing mid-hydration.
      const t = window.setTimeout(() => setActive(pick), 400);
      return () => window.clearTimeout(t);
    }
  }, [candidates, pathname]);

  if (!active) return null;

  const title = locale === 'en' ? active.titleEn || active.titleKo : active.titleKo;
  const body = locale === 'en' ? active.bodyEn || active.bodyKo : active.bodyKo;

  const close = (forToday: boolean) => {
    try {
      if (forToday) window.localStorage.setItem(DISMISS_PREFIX + active.id, todayIso());
      else window.sessionStorage.setItem(DISMISS_PREFIX + active.id, '1');
    } catch {
      // Storage unavailable — the popup simply returns on the next visit.
    }
    setClosing(true);
    window.setTimeout(() => setActive(null), 180);
  };

  return (
    <div
      className={`np-overlay${closing ? ' is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) close(false);
      }}
    >
      <div className="np-card">
        <button
          type="button"
          className="np-x"
          onClick={() => close(false)}
          aria-label={locale === 'ko' ? '닫기' : 'Close'}
        >
          ×
        </button>

        {active.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={active.image} alt="" className="np-img" />
        ) : null}

        <div className="np-body">
          <span className="np-eyebrow">{locale === 'ko' ? '공지사항' : 'Notice'}</span>
          <h2 className="np-title">{title}</h2>
          {body ? <p className="np-text">{excerpt(body)}</p> : null}

          <div className="np-actions">
            <Link href={`/${locale}/notices/${active.id}/`} className="np-cta" onClick={() => close(false)}>
              {locale === 'ko' ? '자세히 보기 →' : 'Read more →'}
            </Link>
          </div>
        </div>

        <div className="np-foot">
          <button type="button" onClick={() => close(true)}>
            {locale === 'ko' ? '오늘 하루 보지 않기' : "Don't show again today"}
          </button>
          <button type="button" onClick={() => close(false)}>
            {locale === 'ko' ? '닫기' : 'Close'}
          </button>
        </div>
      </div>

      <style>{`
        .np-overlay {
          position: fixed;
          inset: 0;
          z-index: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(0, 0, 0, .62);
          -webkit-backdrop-filter: blur(3px);
          backdrop-filter: blur(3px);
          animation: np-fade .22s ease-out;
        }
        .np-overlay.is-closing { animation: np-fade .18s ease-in reverse; }
        @keyframes np-fade { from { opacity: 0 } to { opacity: 1 } }

        .np-card {
          position: relative;
          width: min(460px, 100%);
          max-height: min(86vh, 760px);
          overflow-y: auto;
          background: var(--bg-2, #17171a);
          border: 1px solid var(--border, #2c2c30);
          border-radius: 16px;
          box-shadow: 0 24px 64px rgba(0, 0, 0, .5);
          animation: np-rise .26s cubic-bezier(.2, .8, .3, 1);
        }
        @keyframes np-rise { from { transform: translateY(14px); opacity: .4 } to { transform: none; opacity: 1 } }

        .np-x {
          position: absolute; top: 10px; right: 10px; z-index: 2;
          width: 34px; height: 34px;
          display: flex; align-items: center; justify-content: center;
          border: 0; border-radius: 50%;
          background: rgba(0, 0, 0, .45); color: #fff;
          font-size: 22px; line-height: 1; cursor: pointer;
          transition: background .15s;
        }
        .np-x:hover { background: var(--accent, #ff6b1a); }

        .np-img { display: block; width: 100%; height: auto; border-radius: 16px 16px 0 0; }
        .np-body { padding: 24px 26px 20px; }
        .np-eyebrow {
          font-family: var(--mono, ui-monospace, monospace);
          font-size: 11px; letter-spacing: .18em; text-transform: uppercase;
          color: var(--accent, #ff6b1a);
        }
        .np-title {
          margin: 10px 0 0;
          font-family: var(--display);
          font-size: 21px; font-weight: 800; line-height: 1.35; letter-spacing: -.015em;
          color: var(--text, #fff);
        }
        .np-text {
          margin: 12px 0 0;
          font-size: 14px; line-height: 1.7;
          color: var(--muted, #9a9a9e);
          white-space: pre-wrap;
        }
        .np-actions { margin-top: 20px; }
        .np-cta {
          display: inline-flex; align-items: center;
          padding: 12px 22px;
          background: var(--accent, #ff6b1a); color: #0d0d0e;
          border-radius: 999px;
          font-size: 14px; font-weight: 700; text-decoration: none;
        }
        .np-cta:hover { filter: brightness(1.08); }

        .np-foot {
          display: flex; justify-content: space-between;
          border-top: 1px solid var(--border-soft, #232326);
        }
        .np-foot button {
          flex: 1;
          padding: 14px 10px;
          background: transparent; border: 0;
          color: var(--muted, #9a9a9e);
          font-size: 13px; cursor: pointer;
          transition: color .15s, background .15s;
        }
        .np-foot button:first-child { border-right: 1px solid var(--border-soft, #232326); }
        .np-foot button:hover { color: var(--text, #fff); background: rgba(255, 255, 255, .04); }

        @media (max-width: 480px) {
          .np-overlay { padding: 14px; align-items: flex-end; }
          .np-card { width: 100%; }
          .np-title { font-size: 19px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .np-overlay, .np-card { animation: none; }
        }
      `}</style>
    </div>
  );
}
