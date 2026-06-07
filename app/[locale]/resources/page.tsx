import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { getAllProducts } from '@/lib/products';
import type { Product } from '@/lib/products';
import { getSiteResources, hasCatalogPdf } from '@/lib/site-resources';
import ResourcesLibrary, { type ReportGroup } from '@/components/sections/resources/ResourcesLibrary';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

function stripTags(s: string | undefined): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim();
}

/** Card image priority: shopHeader.images[0] → hero.image → first gallery. */
function getProductImage(p: Product): string | undefined {
  const shop = (p.shopHeader?.images ?? []).filter((s): s is string => !!s);
  if (shop[0]) return shop[0];
  if (p.hero?.image) return p.hero.image;
  for (const it of p.gallery?.items ?? []) {
    if (it.image) return it.image;
  }
  return undefined;
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

  // Group test reports by product (only products with ≥1 report) so the
  // library can render one photo card per product with its PDFs nested.
  const reports: ReportGroup[] = getAllProducts()
    .map((p) => ({
      slug: p.slug,
      name: stripTags(p.name) || p.slug,
      model: p.model,
      category: p.category,
      image: getProductImage(p),
      files: (p.testReports?.files ?? [])
        .filter((f) => !!f.url)
        .map((f) => ({ url: f.url as string, name: f.name, size: f.size, uploadedAt: f.uploadedAt })),
    }))
    .filter((row) => row.files.length > 0);

  return (
    <section className="skeleton-page" style={{ paddingBottom: 120 }} id="catalog">
      <div className="wrap" style={{ scrollMarginTop: 112 }}>
        <span className="eyebrow">{dict.resources.hero.eyebrow}</span>
        <h1>
          {dict.resources.hero.titlePre}
          <em>{dict.resources.hero.titleEm}</em>
        </h1>
        <p style={{ marginTop: 16, maxWidth: 760 }}>{dict.resources.sub}</p>

        {/* Unified library: full list by default, sub-tabs filter it
         * (전체 / 카탈로그 / 시험성적서). Client component — owns the
         * tab state; data is gathered here server-side. */}
        <ResourcesLibrary
          locale={loc}
          catalog={{
            ready: catalogReady,
            url: catalogUrl,
            title: dict.resources.catalog.title,
            desc: dict.resources.catalog.desc,
            downloadCta: dict.resources.catalog.downloadCta,
            placeholder: dict.resources.catalog.placeholder,
            size: site.catalog?.size,
            uploadedAt: site.catalog?.uploadedAt,
          }}
          reports={reports}
          reportsEmpty={
            dict.resources.testReports.empty ??
            (loc === 'ko' ? '아직 등록된 시험성적서가 없습니다.' : 'No test reports yet.')
          }
        />

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
