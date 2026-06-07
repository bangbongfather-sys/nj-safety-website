'use client';

/**
 * Unified Resources library with classification sub-tabs.
 *
 * The /resources hub used to be three static cards (Catalog / Size
 * Guide / Test Reports), each linking out to its own thing. This
 * replaces that with a single library list that shows EVERYTHING by
 * default ("전체"), plus sub-tabs that filter it down to one kind —
 * notably "시험성적서" so a visitor reviewing certs only sees those.
 *
 * Data (catalog state + per-product report groups) is gathered
 * server-side in app/[locale]/resources/page.tsx and passed in as
 * plain props; this component only owns the tab UI + filtering.
 *
 * Deep-link: the page reads `#test-reports` / `#catalog` from the URL
 * on mount so the top-nav dropdown items can jump straight to a tab.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ImageOrPlaceholder from '@/components/product/ImageOrPlaceholder';

export type ReportFile = { url: string; name?: string; size?: number; uploadedAt?: string };
export type ReportGroup = {
  slug: string;
  name: string;
  model?: string;
  category?: string;
  image?: string;
  files: ReportFile[];
};
export type CatalogInfo = {
  ready: boolean;
  url?: string;
  title: string;
  desc: string;
  downloadCta: string;
  placeholder: string;
  size?: number;
  uploadedAt?: string;
};

type TabKey = 'all' | 'catalog' | 'reports';

type Props = {
  locale: 'ko' | 'en';
  catalog: CatalogInfo;
  reports: ReportGroup[];
  /** dict.resources.testReports.empty */
  reportsEmpty: string;
};

function fmtBytes(n: number | undefined): string {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function ResourcesLibrary({ locale, catalog, reports, reportsEmpty }: Props) {
  const [tab, setTab] = useState<TabKey>('all');

  // Deep-link support: /resources/#test-reports or #catalog selects
  // that tab on load (the nav dropdown links here).
  useEffect(() => {
    const h = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
    if (h === 'test-reports') setTab('reports');
    else if (h === 'catalog') setTab('catalog');
  }, []);

  const reportCount = reports.reduce((n, r) => n + r.files.length, 0);
  const catalogCount = catalog.ready ? 1 : 0;
  const totalCount = catalogCount + reportCount;

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: locale === 'ko' ? '전체' : 'All', count: totalCount },
    { key: 'catalog', label: locale === 'ko' ? '카탈로그' : 'Catalog', count: catalogCount },
    { key: 'reports', label: locale === 'ko' ? '시험성적서' : 'Test Reports', count: reportCount },
  ];

  const showCatalog = tab === 'all' || tab === 'catalog';
  const showReports = tab === 'all' || tab === 'reports';

  return (
    <div style={{ marginTop: 48 }}>
      {/* ── Classification sub-tabs ─────────────────────────────── */}
      <div className="rl-tabs" role="tablist" aria-label={locale === 'ko' ? '자료 분류' : 'Resource categories'}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`rl-tab${tab === t.key ? ' is-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            <span className="rl-tab-count">{t.count}</span>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 32, display: 'grid', gap: 20 }}>
        {/* ── Catalog ───────────────────────────────────────────── */}
        {showCatalog ? (
          catalog.ready && catalog.url ? (
            <a
              href={catalog.url}
              target="_blank"
              rel="noreferrer"
              className="rl-item rl-item-catalog"
            >
              <span className="rl-badge">PDF</span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span className="rl-item-title">{catalog.title}</span>
                <span className="rl-item-sub">
                  {catalog.desc}
                  {catalog.size ? ` · ${fmtBytes(catalog.size)}` : ''}
                  {catalog.uploadedAt ? ` · ${fmtDate(catalog.uploadedAt)}` : ''}
                </span>
              </span>
              <span className="rl-item-cta">{catalog.downloadCta}</span>
            </a>
          ) : (
            <div className="rl-item rl-item-catalog is-disabled">
              <span className="rl-badge rl-badge-mute">PDF</span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span className="rl-item-title">{catalog.title}</span>
                <span className="rl-item-sub">{catalog.desc}</span>
              </span>
              <span className="rl-item-cta is-mute">{catalog.placeholder}</span>
            </div>
          )
        ) : null}

        {/* ── Test reports (photo cards, grouped by product) ────── */}
        {showReports ? (
          reports.length === 0 ? (
            <div className="rl-empty">{reportsEmpty}</div>
          ) : (
            reports.map((row) => (
              <article key={row.slug} className="tr-row rl-report">
                <Link
                  href={`/${locale}/products/${row.slug}/`}
                  aria-label={locale === 'ko' ? `${row.name} 제품 보기` : `View ${row.name}`}
                  className="rl-report-photo"
                >
                  <ImageOrPlaceholder
                    src={row.image}
                    alt={row.name}
                    className="tr-photo"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </Link>
                <div className="rl-report-body">
                  <header>
                    {row.category ? <div className="rl-report-cat">{row.category}</div> : null}
                    <div className="rl-report-head">
                      <Link href={`/${locale}/products/${row.slug}/`} className="rl-report-name">
                        {row.name}
                      </Link>
                      {row.model ? <span className="rl-report-model">{row.model}</span> : null}
                    </div>
                  </header>
                  <ul className="rl-report-files">
                    {row.files.map((file, i) => (
                      <li key={file.url + i}>
                        <a href={file.url} target="_blank" rel="noreferrer" className="rl-file">
                          <span aria-hidden className="rl-badge rl-badge-sm">PDF</span>
                          <span style={{ minWidth: 0 }}>
                            <span className="rl-file-name">
                              {file.name || `${row.name} ${locale === 'ko' ? '시험성적서' : 'Test report'} ${i + 1}`}
                            </span>
                            <span className="rl-file-meta">
                              {fmtBytes(file.size)}
                              {file.uploadedAt ? ` · ${fmtDate(file.uploadedAt)}` : ''}
                            </span>
                          </span>
                          <span className="rl-file-cta">{locale === 'ko' ? '다운로드 ↓' : 'Download ↓'}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))
          )
        ) : null}
      </div>

      <style>{`
        .rl-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          border-bottom: 1px solid var(--border-soft);
          padding-bottom: 0;
        }
        .rl-tab {
          appearance: none;
          background: transparent;
          border: 0;
          border-bottom: 2px solid transparent;
          color: var(--muted);
          font-family: var(--mono, ui-monospace, monospace);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .04em;
          padding: 12px 14px;
          margin-bottom: -1px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: color .15s, border-color .15s;
        }
        .rl-tab:hover { color: var(--text); }
        .rl-tab.is-active { color: var(--accent); border-bottom-color: var(--accent); }
        .rl-tab-count {
          font-size: 11px;
          font-weight: 700;
          color: var(--muted-2, var(--muted));
          background: rgba(255,255,255,.06);
          border-radius: 999px;
          padding: 1px 8px;
          min-width: 20px;
          text-align: center;
        }
        .rl-tab.is-active .rl-tab-count { background: rgba(255,107,26,.16); color: var(--accent); }

        .rl-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 22px;
          background: rgba(255,255,255,.04);
          border: 1px solid var(--border-soft);
          border-radius: 14px;
          text-decoration: none;
          color: inherit;
          transition: border-color .15s, background .15s;
        }
        a.rl-item:hover { border-color: var(--accent); background: rgba(255,255,255,.06); }
        .rl-item.is-disabled { opacity: .65; }
        .rl-item-title { display: block; font-family: var(--display); font-size: 18px; font-weight: 800; letter-spacing: -.015em; }
        .rl-item-sub { display: block; margin-top: 4px; color: var(--muted); font-size: 13.5px; line-height: 1.5; }
        .rl-item-cta { color: var(--accent); font-weight: 700; font-size: 14px; white-space: nowrap; }
        .rl-item-cta.is-mute { color: var(--muted); }

        .rl-badge {
          display: inline-flex; align-items: center; justify-content: center;
          width: 44px; height: 44px; flex-shrink: 0;
          background: rgba(255,107,26,.12); color: var(--accent);
          border-radius: 8px;
          font-family: var(--mono, ui-monospace, monospace);
          font-size: 12px; font-weight: 800; letter-spacing: .06em;
        }
        .rl-badge-mute { background: rgba(255,255,255,.06); color: var(--muted); }
        .rl-badge-sm { width: 36px; height: 36px; border-radius: 6px; font-size: 11px; }

        .rl-empty {
          padding: 64px 24px;
          border: 1px dashed var(--border-soft);
          border-radius: 16px;
          text-align: center;
          color: var(--muted);
        }

        /* Report photo cards — same split layout as the old dedicated
         * test-reports route. */
        .tr-row.rl-report {
          display: grid;
          grid-template-columns: 220px 1fr;
          background: rgba(255,255,255,.025);
          border: 1px solid var(--border-soft);
          border-radius: 14px;
          overflow: hidden;
          transition: border-color .15s, background .15s;
        }
        .tr-row.rl-report:hover { border-color: var(--accent); }
        .rl-report-photo { position: relative; display: block; background: rgba(255,255,255,.04); min-height: 200px; }
        .rl-report-body { padding: 24px 28px; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
        .rl-report-cat { font-family: var(--mono, ui-monospace, monospace); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
        .rl-report-head { display: flex; align-items: baseline; gap: 12px; margin-top: 4px; flex-wrap: wrap; }
        .rl-report-name { font-family: var(--display); font-size: 20px; font-weight: 800; letter-spacing: -.018em; color: inherit; text-decoration: none; }
        .rl-report-model { color: var(--muted); font-size: 13px; }
        .rl-report-files { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
        .rl-file {
          display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 14px;
          padding: 12px 16px; background: rgba(0,0,0,.25);
          border: 1px solid var(--border-soft); border-radius: 10px;
          text-decoration: none; color: inherit;
          transition: border-color .15s, background .15s;
        }
        .rl-file:hover { border-color: var(--accent); background: rgba(0,0,0,.4); }
        .rl-file-name { display: block; font-weight: 700; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rl-file-meta { display: block; margin-top: 4px; color: var(--muted); font-size: 12px; font-family: var(--mono, ui-monospace, monospace); letter-spacing: .04em; }
        .rl-file-cta { font-size: 14px; font-weight: 700; color: var(--accent); white-space: nowrap; }

        @media (max-width: 720px) {
          .tr-row.rl-report { grid-template-columns: 1fr; }
          .rl-report-photo { min-height: 240px; aspect-ratio: 4 / 3; }
        }
      `}</style>
    </div>
  );
}
