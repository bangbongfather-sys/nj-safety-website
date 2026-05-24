import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { getAllProducts } from '@/lib/products';
import type { Product } from '@/lib/products';
import { getAllCategories, categoryName } from '@/lib/product-categories';
import { getSiteResources, hasCatalogPdf } from '@/lib/site-resources';
import SkeletonPage from '@/components/sections/SkeletonPage';
import SeasonTabs, { type SeasonTab } from '@/components/sections/products/SeasonTabs';
import ImageOrPlaceholder from '@/components/product/ImageOrPlaceholder';
import categoriesData from '@/data/product-categories.json';
import '@/components/sections/products/products-listing.css';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

function stripTags(s: string | undefined): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim();
}

/**
 * Pull the best card images for a product. Mirrors the picker used by
 * the homepage Products rail + the original /products list so the
 * catalog stays visually consistent across surfaces.
 */
function getCardImages(p: Product): { main?: string; hover?: string } {
  const shop = (p.shopHeader?.images ?? []).filter((s): s is string => !!s);
  if (shop.length > 0) return { main: shop[0], hover: shop[1] };
  const fallback: string[] = [];
  if (p.hero?.image) fallback.push(p.hero.image);
  for (const it of p.gallery?.items ?? []) {
    if (it.image && !fallback.includes(it.image)) fallback.push(it.image);
  }
  return { main: fallback[0], hover: fallback[1] };
}

/**
 * Season-specific headline copy. Editorial — kept inline (not dict)
 * because each season has its own intentional poetry; if we want this
 * editable later we can move it into dict.products.seasons.<id>.* but
 * for now the operator can edit via direct dict commit.
 */
function seasonCopy(id: string, locale: Locale): {
  headline: string;
  lede: string;
} {
  if (id === 'summer') {
    return locale === 'ko'
      ? {
          headline: '여름 현장은 <em>가벼움</em>이 곧 안전입니다.',
          lede: '한여름 외근, 정전기 정비, 옥외 보수 — 두꺼운 자켓이 어려운 환경을 위한 메쉬 통기 구조와 가벼운 평량.',
        }
      : {
          headline: 'On summer sites, <em>lightness</em> is safety.',
          lede: 'Mesh ventilation and a low gsm built for outdoor inspection, electrical maintenance, and long days under the sun.',
        };
  }
  if (id === 'sf') {
    return locale === 'ko'
      ? {
          headline: '사계절 표준, <em>매일의 한 벌.</em>',
          lede: '봄·가을의 간절기 레이어링. 셔츠 위에 한 벌, 자켓 안에 한 벌 — 어느 쪽이든 단정합니다.',
        }
      : {
          headline: 'Every-season standard, <em>your daily pair.</em>',
          lede: 'Mid-season layering: clean over a shirt, clean under a jacket — composed either way.',
        };
  }
  if (id === 'winter') {
    return locale === 'ko'
      ? {
          headline: '한랭 옥외 현장을 위해, <em>3-레이어 보온.</em>',
          lede: '영하의 점검·정비 현장에서도 단정한 실루엣을 유지하는 동계 라인업.',
        }
      : {
          headline: 'Built for sub-zero outdoor sites: <em>3-layer warmth.</em>',
          lede: 'A winter line that holds its silhouette even on the coldest inspection runs.',
        };
  }
  return { headline: '', lede: '' };
}

export default async function ProductsPage({ params }: Props) {
  const resolved = await params;
  if (!isLocale(resolved.locale)) notFound();
  const locale = resolved.locale as Locale;
  const dict = getDictionary(locale);
  const products = getAllProducts();

  if (products.length === 0) {
    return <SkeletonPage locale={locale} dict={dict} pageKey="products" />;
  }

  // Season grouping derived from product-categories.json — admin-managed.
  const cats = getAllCategories();
  const bySlug = new Map(products.map((p) => [p.slug, p] as const));
  type SeasonGroup = { id: string; nameKo: string; nameEn: string; items: Product[] };
  const seasonGroups: SeasonGroup[] = cats.map((c) => ({
    id: c.id,
    nameKo: c.nameKo,
    nameEn: c.nameEn,
    items: c.productSlugs.map((s) => bySlug.get(s)).filter((p): p is Product => Boolean(p)),
  }));

  // Featured product — admin-picked via data/product-categories.json's
  // `featuredSlug` field (added 2026-05 alongside the redesign). Falls
  // back to the first product in the first non-empty season.
  type CatFile = { featuredSlug?: string };
  const catFile = categoriesData as CatFile;
  const featuredSlug = catFile.featuredSlug;
  const featured =
    (featuredSlug && bySlug.get(featuredSlug)) ||
    seasonGroups.find((g) => g.items.length > 0)?.items[0];

  // Stats — auto-derived; not stored anywhere so the numbers can never
  // drift out of date.
  const seasonCount = seasonGroups.filter((g) => g.items.length > 0).length;
  const collectionYear = new Date().getFullYear();
  const statLabels: string[] = (dict.products as { statsLabel?: string[] }).statsLabel ?? [
    'Products',
    'Seasons',
    'Collection',
  ];

  // Sticky tab list — All + each season (regardless of whether it has
  // items, so the operator can plan future-season cards from the bar).
  const tabs: SeasonTab[] = [
    {
      id: 'all',
      labelKo: (dict.products as { tabAll?: string }).tabAll ?? '전체',
      labelEn: 'All',
      href: '#all',
    },
    ...seasonGroups.map((g) => ({
      id: g.id,
      labelKo: g.nameKo.replace(/\(.*\)/, '').trim(),
      labelEn: g.nameEn,
      href: `#${g.id}`,
    })),
  ];

  // Resources — catalog PDF for the Collection CTA's primary button.
  const site = getSiteResources();
  const catalogReady = hasCatalogPdf(site);
  const catalogUrl = site.catalog?.pdfUrl;

  const pd = dict.products;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="pl-hero" id="all">
        <div className="wrap">
          <div className="pl-hero-grid">
            <div>
              <span className="pl-hero-hairline">{pd.heroHairline ?? 'Products · 2026 Collection'}</span>
              <h1 className="pl-hero-h1">
                {pd.heroTitlePre ?? ''}
                <br />
                {pd.heroTitleEm ?? ''}
                <em>{pd.heroTitleEmAccent ?? ''}</em>
              </h1>
              <p className="pl-hero-sub">{pd.heroSub ?? ''}</p>
            </div>
            <div className="pl-hero-stats">
              <div className="pl-hero-stat">
                <span className="pl-hero-stat-val">
                  {String(products.length).padStart(2, '0')}<span className="u">EA</span>
                </span>
                <span className="pl-hero-stat-lbl">{statLabels[0] ?? 'Products'}</span>
              </div>
              <div className="pl-hero-stat">
                <span className="pl-hero-stat-val">
                  {String(seasonCount).padStart(2, '0')}<span className="u">SS</span>
                </span>
                <span className="pl-hero-stat-lbl">{statLabels[1] ?? 'Seasons'}</span>
              </div>
              <div className="pl-hero-stat">
                <span className="pl-hero-stat-val">{collectionYear}</span>
                <span className="pl-hero-stat-lbl">{statLabels[2] ?? 'Collection'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sticky season tabs ───────────────────────────── */}
      <SeasonTabs
        tabs={tabs}
        totalCount={products.length}
        countSuffix={pd.tabCountSuffix ?? 'Products · 2026 Collection'}
        locale={locale}
      />

      {/* ── Featured editorial card ─────────────────────── */}
      {featured ? (
        <section className="pl-featured">
          <div className="wrap">
            <div className="pl-featured-head">
              <h2 className="pl-featured-title">
                {pd.featuredTitlePre ?? ''}
                <em>{pd.featuredTitleEm ?? ''}</em>
              </h2>
              <span className="pl-featured-meta">{pd.featuredEyebrow ?? ''}</span>
            </div>
            <Link
              href={`/${locale}/products/${featured.slug}/`}
              className="pl-featured-card"
              aria-label={stripTags(featured.name)}
            >
              <div className="pl-featured-media">
                {(() => {
                  const img = getCardImages(featured).main;
                  return (
                    <ImageOrPlaceholder src={img} alt={stripTags(featured.name)} />
                  );
                })()}
                <span className="pl-featured-stamp">
                  {featured.model ?? featured.slug.toUpperCase()}
                  {featured.category ? ` · ${featured.category.split('·')[0].trim()}` : ''}
                </span>
              </div>
              <div className="pl-featured-info">
                {featured.category ? <span className="pl-featured-tag">{featured.category}</span> : null}
                <h3
                  className="pl-featured-name"
                  // Display name preserves `<em>`/`<br>` markup from the
                  // catalog editor (e.g. njs-aj100 has line-broken,
                  // orange-accented Korean).
                  dangerouslySetInnerHTML={{ __html: featured.name ?? featured.slug }}
                />
                {featured.subtitle ? (
                  <p className="pl-featured-sub">{featured.subtitle}</p>
                ) : null}
                {featured.spec?.rows && featured.spec.rows.length > 0 ? (
                  <div className="pl-featured-spec">
                    {featured.spec.rows.slice(0, 4).map((row, i) => (
                      <div key={i} className="pl-featured-spec-row">
                        <span className="pl-featured-spec-k">{row.label}</span>
                        <span className="pl-featured-spec-v">{row.value}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                <span className="pl-featured-cta">{pd.featuredCtaLabel ?? '상세 보기 →'}</span>
              </div>
            </Link>
          </div>
        </section>
      ) : null}

      {/* ── Season blocks ────────────────────────────────── */}
      {seasonGroups.map((group, idx) => {
        const copy = seasonCopy(group.id, locale);
        const num = `${String(idx + 1).padStart(2, '0')} / ${String(seasonGroups.length).padStart(2, '0')} — ${group.nameEn}`;
        return (
          <section key={group.id} className="pl-season" id={group.id}>
            <div className="wrap">
              <div className="pl-season-head">
                <div>
                  <span className="pl-season-num">{num}</span>
                  <h2
                    className="pl-season-h"
                    dangerouslySetInnerHTML={{ __html: copy.headline }}
                  />
                  {copy.lede ? <p className="pl-season-lede">{copy.lede}</p> : null}
                </div>
                <div className="pl-season-count">
                  <span className="pl-season-count-lbl">{pd.seasonItemsLabel ?? 'Items'}</span>
                  <span className="pl-season-count-val">
                    {String(group.items.length).padStart(2, '0')}
                  </span>
                </div>
              </div>
              {group.items.length === 0 ? (
                <div className="pl-season-empty">{pd.seasonEmpty ?? '곧 추가될 예정입니다.'}</div>
              ) : (
                <div className="pl-season-grid">
                  {group.items.map((p) => {
                    const { main, hover } = getCardImages(p);
                    const name = stripTags(p.name) || p.slug;
                    return (
                      <Link
                        key={p.slug}
                        href={`/${locale}/products/${p.slug}/`}
                        className="pl-card"
                        aria-label={name}
                      >
                        <div className="pl-card-frame">
                          {main ? (
                            <>
                              <img
                                src={main}
                                alt={name}
                                className="pl-card-img main"
                                loading="lazy"
                                decoding="async"
                              />
                              {hover ? (
                                <img
                                  src={hover}
                                  alt=""
                                  aria-hidden
                                  className="pl-card-img hover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : null}
                            </>
                          ) : (
                            <ImageOrPlaceholder alt={name} />
                          )}
                        </div>
                        <span className="pl-card-tag">
                          {p.model ?? p.slug.toUpperCase()}
                          {p.category ? ` · ${p.category.split('·')[0].trim()}` : ''}
                        </span>
                        <h3
                          className="pl-card-name"
                          dangerouslySetInnerHTML={{ __html: p.name ?? p.slug }}
                        />
                        {p.subtitle ? <p className="pl-card-desc">{p.subtitle}</p> : null}
                        <div className="pl-card-foot">
                          <span className="pl-card-spec">
                            {(() => {
                              const w = p.spec?.rows?.find((r) => /평량|중량|weight/i.test(r.label))?.value;
                              const ct = (p.spec?.rows?.length ?? 0) + ' specs';
                              return w ? <><b>{w}</b></> : ct;
                            })()}
                          </span>
                          <span className="pl-card-arrow">
                            {locale === 'ko' ? '상세 →' : 'View →'}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        );
      })}

      {/* ── Editorial quote ─────────────────────────────── */}
      <section className="pl-editorial">
        <div className="wrap pl-editorial-inner">
          <span className="pl-editorial-eyebrow">{pd.editorialEyebrow ?? ''}</span>
          <blockquote className="pl-editorial-quote">
            {pd.editorialQuotePre ?? ''}
            <em>{pd.editorialQuoteEm ?? ''}</em>
            {pd.editorialQuotePost ?? ''}
          </blockquote>
          <div
            className="pl-editorial-source"
            dangerouslySetInnerHTML={{ __html: pd.editorialSource ?? '' }}
          />
        </div>
      </section>

      {/* ── Collection CTA ──────────────────────────────── */}
      <section className="pl-cta">
        <div className="wrap">
          <div className="pl-cta-rule" aria-hidden />
          <span className="pl-cta-eyebrow">{pd.ctaEyebrow ?? ''}</span>
          <h2 className="pl-cta-title">
            {pd.ctaTitlePre ?? ''}
            <em>{pd.ctaTitleEm ?? ''}</em>
          </h2>
          <p className="pl-cta-sub">{pd.ctaSub ?? ''}</p>
          <div className="pl-cta-actions">
            {catalogReady && catalogUrl ? (
              <a
                href={catalogUrl}
                target="_blank"
                rel="noreferrer"
                className="pl-cta-btn primary"
              >
                {pd.ctaPrimary ?? '카탈로그 다운로드 →'}
              </a>
            ) : (
              <span className="pl-cta-btn disabled" title="카탈로그 PDF 업로드 대기">
                {locale === 'ko' ? '카탈로그 준비 중' : 'Catalog coming soon'}
              </span>
            )}
            <Link href={`/${locale}/contact`} className="pl-cta-btn ghost">
              {pd.ctaSecondary ?? '맞춤 견적 문의 →'}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
