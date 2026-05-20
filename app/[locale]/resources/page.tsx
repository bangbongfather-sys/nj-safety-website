import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { getAllProducts } from '@/lib/products';
import { getSiteResources, hasCatalogPdf } from '@/lib/site-resources';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

function stripTags(s: string | undefined): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim();
}

// formatBytes() removed alongside the inline test-reports list (2026-05) —
// the dedicated /resources/test-reports page now owns that listing.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.resources?.meta?.title ?? 'Resources — NJ SAFETY',
    description: dict.resources?.meta?.description ?? '',
  };
}

export default async function ResourcesPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const loc = locale as Locale;
  const dict = getDictionary(loc);
  // Catalog PDF state — admin uploads land in data/site-resources.json.
  // When pdfUrl is set the catalog card becomes a real download link;
  // otherwise it stays the dimmed "업로드 예정" placeholder.
  const site = getSiteResources();
  const catalogReady = hasCatalogPdf(site);
  const catalogUrl = site.catalog?.pdfUrl;

  // Aggregate test reports across every product. We project the array into
  // a flat list with the product name attached so the page can group by
  // product without re-reading the JSONs.
  type ReportRow = {
    productSlug: string;
    productName: string;
    productModel?: string;
    url: string;
    name?: string;
    size?: number;
    uploadedAt?: string;
  };
  const reports: ReportRow[] = [];
  for (const p of getAllProducts()) {
    const files = p.testReports?.files ?? [];
    for (const f of files) {
      if (!f.url) continue;
      reports.push({
        productSlug: p.slug,
        productName: stripTags(p.name) || p.slug,
        productModel: p.model,
        url: f.url,
        name: f.name,
        size: f.size,
        uploadedAt: f.uploadedAt,
      });
    }
  }

  return (
    <section className="skeleton-page" style={{ paddingBottom: 120 }}>
      <div className="wrap">
        <span className="eyebrow">{dict.resources.hero.eyebrow}</span>
        <h1>
          {dict.resources.hero.titlePre}
          <em>{dict.resources.hero.titleEm}</em>
        </h1>
        <p style={{ marginTop: 16, maxWidth: 760 }}>{dict.resources.sub}</p>

        {/* Three top cards — Catalog / Size Guide / Test Reports overview.
         * The wrapper carries id="catalog" so the nav-dropdown's
         * "카탈로그 PDF" item lands here (the catalog card is the first
         * of the three). scrollMarginTop offsets the sticky 112px nav. */}
        <div
          id="catalog"
          style={{
            marginTop: 56,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
            scrollMarginTop: 112,
          }}
        >
          {/* Catalog PDF card — live download when site-resources.json
           * has a URL, dimmed placeholder otherwise. Admin uploads via
           * /admin/resources. */}
          <ResourceCard
            title={dict.resources.catalog.title}
            desc={dict.resources.catalog.desc}
            cta={catalogReady ? dict.resources.catalog.downloadCta : dict.resources.catalog.placeholder}
            href={catalogReady ? catalogUrl : undefined}
            external={catalogReady}
            disabled={!catalogReady}
          />

          <ResourceCard
            title={dict.resources.sizeGuide.title}
            desc={dict.resources.sizeGuide.desc}
            cta={dict.resources.sizeGuide.cta}
            href={`/${loc}/resources/size-guide/`}
          />

          <ResourceCard
            title={dict.resources.testReports.title}
            desc={dict.resources.testReports.desc}
            cta={loc === 'ko' ? `↓ ${reports.length}건 보기` : `↓ ${reports.length} files`}
            href={`/${loc}/resources/test-reports/`}
          />
        </div>

        {/* Inline test-reports list removed 2026-05 — moved to its own
         * route at /resources/test-reports so each entry can carry the
         * product photo without making the hub page too tall. */}

        <p style={{ marginTop: 80, color: 'var(--muted)', fontSize: 13 }}>
          ←{' '}
          <Link href={`/${loc}/`} style={{ color: 'inherit', textDecoration: 'underline' }}>
            {loc === 'ko' ? '홈으로' : 'Back home'}
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────────────── */

function ResourceCard({
  title,
  desc,
  cta,
  href,
  disabled,
  external,
}: {
  title: string;
  desc: string;
  cta: string;
  href?: string;
  disabled?: boolean;
  /** R2-hosted PDF etc. — opens in a new tab and skips the
   *  Next.js client router so the browser downloads it directly. */
  external?: boolean;
}) {
  const body = (
    <div
      style={{
        height: '100%',
        padding: 24,
        background: disabled ? 'rgba(255,255,255,.02)' : 'rgba(255,255,255,.04)',
        border: '1px solid var(--border-soft)',
        borderRadius: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'border-color .15s, background .15s, transform .15s',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <h3 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 800, margin: 0 }}>
        {title}
      </h3>
      <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.55, margin: 0, flex: 1 }}>{desc}</p>
      <span
        style={{
          marginTop: 8,
          color: disabled ? 'var(--muted)' : 'var(--accent)',
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        {cta}
      </span>
    </div>
  );

  if (disabled) {
    return <div style={{ pointerEvents: 'none' }}>{body}</div>;
  }
  if (external && href) {
    // Skip Next.js routing for R2-hosted PDFs — open in a new tab.
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
      >
        {body}
      </a>
    );
  }
  if (href?.startsWith('#')) {
    return (
      <a href={href} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        {body}
      </a>
    );
  }
  return (
    <Link href={href ?? '#'} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      {body}
    </Link>
  );
}
