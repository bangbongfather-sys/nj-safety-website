'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Dictionary, Locale } from '@/lib/i18n';
import { NOTICE_TYPES, type NoticeType } from '@/lib/notice-types';

export type NoticeRow = {
  id: string;
  type: NoticeType;
  pinned: boolean;
  date: string;
  title: string;
};

type Props = {
  locale: Locale;
  dict: Dictionary;
  rows: NoticeRow[];
};

const PER_PAGE = 10;
// Notices newer than this many days get the "N" (new) badge. Computed
// against the client clock — fine for a decorative freshness hint.
const NEW_WINDOW_DAYS = 21;

function formatDate(iso: string): string {
  // YYYY-MM-DD → YYYY.MM.DD (matches the reference board style).
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${y}.${m}.${d}`;
}

function isRecent(iso: string): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

export default function NoticesBoard({ locale, dict, rows }: Props) {
  const t = dict.notices;
  const [typeFilter, setTypeFilter] = useState<'all' | NoticeType>('all');
  const [term, setTerm] = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage] = useState(1);

  const typeLabel = (ty: NoticeType): string => t.types[ty] ?? ty;

  const filtered = useMemo(() => {
    const q = applied.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (q && !r.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, typeFilter, applied]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const runSearch = () => {
    setApplied(term);
    setPage(1);
  };

  const onTypeChange = (v: 'all' | NoticeType) => {
    setTypeFilter(v);
    setPage(1);
  };

  // Build a compact page-number window (max 5 around current).
  const pageNumbers = useMemo(() => {
    const span = 5;
    let start = Math.max(1, safePage - Math.floor(span / 2));
    const end = Math.min(totalPages, start + span - 1);
    start = Math.max(1, end - span + 1);
    const out: number[] = [];
    for (let i = start; i <= end; i++) out.push(i);
    return out;
  }, [safePage, totalPages]);

  return (
    <section className="notice-page">
      <div className="wrap">
        <header className="notice-head">
          <span className="eyebrow">{t.eyebrow}</span>
          <h1>
            {t.titlePre}
            <em>{t.titleEm}</em>
          </h1>
          <p className="notice-sub">{t.sub}</p>
        </header>

        {/* Filter bar — type dropdown + keyword search. */}
        <div className="notice-filter">
          <div className="notice-filter-field">
            <label htmlFor="notice-type">{t.filterTypeLabel}</label>
            <select
              id="notice-type"
              value={typeFilter}
              onChange={(e) => onTypeChange(e.target.value as 'all' | NoticeType)}
            >
              <option value="all">{t.allLabel}</option>
              {NOTICE_TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {typeLabel(ty)}
                </option>
              ))}
            </select>
          </div>
          <div className="notice-filter-field notice-filter-search">
            <label htmlFor="notice-q">{t.searchLabel}</label>
            <input
              id="notice-q"
              type="search"
              value={term}
              placeholder={t.searchPlaceholder}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runSearch();
              }}
            />
          </div>
          <button type="button" className="notice-search-btn" onClick={runSearch}>
            {t.searchBtn}
          </button>
        </div>

        {/* Result count. */}
        <p className="notice-count">
          {t.resultLabel} <strong>{filtered.length}{t.countUnit}</strong>
        </p>

        {/* Board table. */}
        <div className="notice-table" role="table" aria-label={dict.nav.notices}>
          <div className="notice-row notice-row-head" role="row">
            <span className="notice-c-type" role="columnheader">{t.colType}</span>
            <span className="notice-c-title" role="columnheader">{t.colTitle}</span>
            <span className="notice-c-date" role="columnheader">{t.colDate}</span>
          </div>

          {pageRows.length === 0 ? (
            <div className="notice-empty">{t.empty}</div>
          ) : (
            pageRows.map((r) => (
              <Link
                key={r.id}
                href={`/${locale}/notices/${r.id}/`}
                className="notice-row notice-row-item"
                role="row"
              >
                <span className="notice-c-type" role="cell">
                  <span className={`notice-badge notice-badge-${r.type}`}>{typeLabel(r.type)}</span>
                </span>
                <span className="notice-c-title" role="cell">
                  {r.pinned ? (
                    <span className="notice-pin" title={t.pinnedBadge} aria-label={t.pinnedBadge}>
                      📌
                    </span>
                  ) : null}
                  <span className="notice-title-text">{r.title}</span>
                  {isRecent(r.date) ? <span className="notice-new" aria-hidden="true">N</span> : null}
                </span>
                <span className="notice-c-date" role="cell">{formatDate(r.date)}</span>
              </Link>
            ))
          )}
        </div>

        {/* Pagination. */}
        {totalPages > 1 ? (
          <nav className="notice-pager" aria-label="pagination">
            <button
              type="button"
              className="notice-pager-arrow"
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ‹ {t.prev}
            </button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                type="button"
                className={`notice-pager-num${n === safePage ? ' is-on' : ''}`}
                aria-current={n === safePage ? 'page' : undefined}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              className="notice-pager-arrow"
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {t.next} ›
            </button>
          </nav>
        ) : null}
      </div>
    </section>
  );
}
