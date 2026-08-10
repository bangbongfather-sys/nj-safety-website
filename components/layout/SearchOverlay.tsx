'use client';

/**
 * Site-wide search — a full-screen overlay opened from the nav.
 *
 * The index (`/search-index.json`, built by scripts/build-search-index.mjs)
 * is fetched on first open and kept for the session: the site is a static
 * export, so there is nothing to query server-side, and at ~40 KB the
 * whole corpus is cheaper to hold than a round trip per keystroke.
 *
 * An overlay rather than a /search page because every result here is a
 * jump to an existing page — there is no result set worth its own URL on
 * a site this size.
 *
 * The overlay is portalled to <body>: the nav carries a backdrop-filter,
 * which makes it a containing block for position:fixed descendants, so
 * rendering in place clipped the overlay to the nav's own height.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { search, type SearchHit, type SearchIndex, type SearchKind } from '@/lib/search';

type Props = { locale: 'ko' | 'en' };

const KIND_LABEL: Record<SearchKind, { ko: string; en: string }> = {
  product: { ko: '제품', en: 'Products' },
  notice: { ko: '공지사항', en: 'Notices' },
  resource: { ko: '자료실', en: 'Resources' },
  dealer: { ko: '대리점', en: 'Dealers' },
  page: { ko: '페이지', en: 'Pages' },
};

const KIND_ORDER: SearchKind[] = ['product', 'notice', 'resource', 'dealer', 'page'];

/** Module-level so re-opening the overlay doesn't refetch. */
let indexCache: SearchIndex | null = null;

export default function SearchOverlay({ locale }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [index, setIndex] = useState<SearchIndex | null>(indexCache);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  /** Portal target only exists after mount — SSR has no document. */
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const t = (ko: string, en: string) => (locale === 'ko' ? ko : en);

  const load = useCallback(async () => {
    if (indexCache) return;
    setLoading(true);
    try {
      const r = await fetch('/search-index.json');
      if (r.ok) {
        indexCache = (await r.json()) as SearchIndex;
        setIndex(indexCache);
      }
    } catch {
      // Offline or the file is missing — the empty state below covers it.
    } finally {
      setLoading(false);
    }
  }, []);

  const openOverlay = useCallback(() => {
    setOpen(true);
    void load();
  }, [load]);

  // ⌘K / Ctrl-K from anywhere, Esc to leave.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openOverlay();
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openOverlay]);

  // Focus the field and stop the page behind from scrolling.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [open]);

  const hits = useMemo(() => {
    if (!index || q.trim().length === 0) return [];
    return search(index[locale] ?? [], q);
  }, [index, q, locale]);

  useEffect(() => setActive(0), [q]);

  const grouped = useMemo(() => {
    const by = new Map<SearchKind, SearchHit[]>();
    for (const h of hits) {
      const list = by.get(h.kind) ?? [];
      list.push(h);
      by.set(h.kind, list);
    }
    return KIND_ORDER.filter((k) => by.has(k)).map((k) => [k, by.get(k)!] as const);
  }, [hits]);

  /** Flat order matching what the eye sees, for arrow-key navigation. */
  const flat = useMemo(() => grouped.flatMap(([, list]) => list), [grouped]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && flat[active]) {
      window.location.href = flat[active].url;
    }
  };

  return (
    <>
      <button
        type="button"
        className="nav-search-btn"
        onClick={openOverlay}
        aria-label={t('통합검색 열기', 'Open search')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>

      {open && mounted
        ? createPortal(
        <div
          className="sx-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={t('통합검색', 'Search')}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="sx-panel">
            <div className="sx-field">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t('제품명 · 모델번호 · 공지 · 대리점 검색', 'Search products, notices, dealers…')}
                aria-label={t('검색어', 'Search query')}
              />
              <button type="button" className="sx-close" onClick={() => setOpen(false)}>
                {t('닫기', 'Close')}
              </button>
            </div>

            <div className="sx-results">
              {q.trim().length === 0 ? (
                <p className="sx-note">
                  {t(
                    '찾으시는 제품명이나 모델번호를 입력하세요. 초성으로도 검색됩니다 (예: ㅇㄹㅁㄷ).',
                    'Type a product name or model number to begin.',
                  )}
                </p>
              ) : loading ? (
                <p className="sx-note">{t('불러오는 중…', 'Loading…')}</p>
              ) : hits.length === 0 ? (
                <p className="sx-note">
                  <strong>{q}</strong>
                  {t(' 에 대한 검색 결과가 없습니다.', ' — no results.')}
                </p>
              ) : (
                <>
                  <p className="sx-count">
                    {t(`검색 결과 ${hits.length}건`, `${hits.length} result${hits.length > 1 ? 's' : ''}`)}
                  </p>
                  {grouped.map(([kind, list]) => (
                    <section key={kind} className="sx-group">
                      <h3 className="sx-group-title">{KIND_LABEL[kind][locale]}</h3>
                      <ul className="sx-list">
                        {list.map((h) => {
                          const idx = flat.indexOf(h);
                          return (
                            <li key={`${h.kind}-${h.url}-${h.title}`}>
                              <Link
                                href={h.url}
                                className={`sx-hit${idx === active ? ' is-active' : ''}`}
                                onMouseEnter={() => setActive(idx)}
                                onClick={() => setOpen(false)}
                              >
                                <span className="sx-hit-title">{h.title}</span>
                                {h.sub ? <span className="sx-hit-sub">{h.sub}</span> : null}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>,
            document.body,
          )
        : null}
    </>
  );
}
