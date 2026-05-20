import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { getAllProducts } from '@/lib/products';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

function stripTags(s: string | undefined): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim();
}

function formatBytes(n: number | undefined): string {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

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
          {/* Catalog PDF card — disabled because no PDF asset has been
           * registered yet. Flip `disabled` off and add `href` once the
           * operator uploads the catalog binary (target path TBD by ops). */}
          <ResourceCard
            title={dict.resources.catalog.title}
            desc={dict.resources.catalog.desc}
            cta={dict.resources.catalog.placeholder}
            disabled
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
            href="#test-reports"
          />
        </div>

        {/* Test reports table */}
        <h2
          id="test-reports"
          style={{
            marginTop: 80,
            fontFamily: 'var(--display)',
            fontSize: 'clamp(28px, 3.4vw, 44px)',
            fontWeight: 900,
            letterSpacing: '-.02em',
            color: 'var(--ink, #fff)',
            scrollMarginTop: 112,
          }}
        >
          {dict.resources.testReports.title}
        </h2>

        {reports.length === 0 ? (
          <div
            style={{
              marginTop: 24,
              padding: '48px 24px',
              border: '1px dashed var(--border-soft)',
              borderRadius: 12,
              color: 'var(--muted)',
              textAlign: 'center',
            }}
          >
            {dict.resources.testReports.empty}
          </div>
        ) : (
          <div style={{ marginTop: 24, display: 'grid', gap: 8 }}>
            {reports.map((r) => (
              <a
                key={`${r.productSlug}-${r.url}`}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 20px',
                  background: 'rgba(255,255,255,.03)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 10,
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'border-color .15s, background .15s',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--muted)',
                      letterSpacing: '.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {r.productModel ? `${r.productModel} · ` : ''}
                    {r.productName}
                  </div>
                  <div style={{ marginTop: 4, fontWeight: 700 }}>
                    {r.name || r.url.split('/').pop() || 'report'}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {formatBytes(r.size)} {r.size ? '·' : ''} ↓
                </div>
              </a>
            ))}
          </div>
        )}

        <p style={{ marginTop: 40, color: 'var(--muted)', fontSize: 13 }}>
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
}: {
  title: string;
  desc: string;
  cta: string;
  href?: string;
  disabled?: boolean;
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
