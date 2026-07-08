'use client';

/**
 * /products page body — extracted from the server page.tsx so the
 * /admin/products-page/edit route can render the same UI in editor
 * mode with EditableText wrappers active.
 *
 * Data shape stays the same — products + categories + featuredSlug
 * + catalog state pass in as props (the server page resolves them
 * from disk; the admin page fetches them via the GitHub Contents
 * API at mount time).
 */

import Link from 'next/link';
import type { Locale, Dictionary } from '@/lib/i18n';
import type { Product } from '@/lib/products';
import type { ProductCategory } from '@/lib/product-categories';
import SeasonTabs, { type SeasonTab } from './SeasonTabs';
import ImageOrPlaceholder from '@/components/product/ImageOrPlaceholder';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';

function stripTags(s: string | undefined): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim();
}

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

type SeasonCopy = { headline?: string; lede?: string };
type ProductsSeasons = Record<string, SeasonCopy | undefined>;

type Props = {
  locale: Locale;
  dict: Dictionary;
  products: Product[];
  categories: ProductCategory[];
  featuredSlug?: string;
  catalogReady: boolean;
  catalogUrl?: string;
  /** When provided every dict.products.* string becomes inline-editable. */
  editor?: EditorApi;
};

// redeploy: products page trim (editorial + CTA removed) — cache-bust 2026-07
export default function ProductsListing({
  locale,
  dict,
  products,
  categories,
  featuredSlug,
  // catalogReady / catalogUrl still arrive as props but are unused since the
  // Collection CTA was removed (2026-07). Kept on the Props type so the
  // server page keeps compiling; re-destructure if the CTA is reinstated.
  editor,
}: Props) {
  const bySlug = new Map(products.map((p) => [p.slug, p] as const));
  const seasonGroups = categories.map((c) => ({
    id: c.id,
    nameKo: c.nameKo,
    nameEn: c.nameEn,
    items: c.productSlugs.map((s) => bySlug.get(s)).filter((p): p is Product => Boolean(p)),
  }));
  const featured =
    (featuredSlug && bySlug.get(featuredSlug)) ||
    seasonGroups.find((g) => g.items.length > 0)?.items[0];
  const seasonCount = seasonGroups.filter((g) => g.items.length > 0).length;
  const collectionYear = new Date().getFullYear();
  const pd = dict.products as Dictionary['products'] & {
    heroHairline?: string;
    heroTitlePre?: string;
    heroTitleEm?: string;
    heroTitleEmAccent?: string;
    heroSub?: string;
    statsLabel?: string[];
    featuredEyebrow?: string;
    featuredTitlePre?: string;
    featuredTitleEm?: string;
    featuredCtaLabel?: string;
    editorialEyebrow?: string;
    editorialQuotePre?: string;
    editorialQuoteEm?: string;
    editorialQuotePost?: string;
    editorialSource?: string;
    ctaEyebrow?: string;
    ctaTitlePre?: string;
    ctaTitleEm?: string;
    ctaSub?: string;
    ctaPrimary?: string;
    ctaSecondary?: string;
    seasonItemsLabel?: string;
    seasonEmpty?: string;
    tabAll?: string;
    tabCountSuffix?: string;
    seasons?: ProductsSeasons;
  };
  const statLabels = pd.statsLabel ?? ['Products', 'Seasons', 'Collection'];

  const tabs: SeasonTab[] = [
    { id: 'all', labelKo: pd.tabAll ?? '전체', labelEn: 'All', href: '#all' },
    ...seasonGroups.map((g) => ({
      id: g.id,
      labelKo: g.nameKo.replace(/\(.*\)/, '').trim(),
      labelEn: g.nameEn,
      href: `#${g.id}`,
    })),
  ];

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="pl-hero" id="all">
        <div className="wrap">
          <div className="pl-hero-grid">
            <div>
              <EditableText
                as="span"
                className="pl-hero-hairline"
                path="products.heroHairline"
                value={pd.heroHairline ?? 'Products · 2026 Collection'}
                editor={editor}
              />
              <h1 className="pl-hero-h1">
                <EditableText path="products.heroTitlePre" value={pd.heroTitlePre ?? ''} editor={editor} />
                <br />
                <EditableText path="products.heroTitleEm" value={pd.heroTitleEm ?? ''} editor={editor} />
                <em>
                  <EditableText path="products.heroTitleEmAccent" value={pd.heroTitleEmAccent ?? ''} editor={editor} />
                </em>
              </h1>
              <EditableText
                as="p"
                className="pl-hero-sub"
                path="products.heroSub"
                value={pd.heroSub ?? ''}
                editor={editor}
                multiline
              />
            </div>
            <div className="pl-hero-stats">
              <div className="pl-hero-stat">
                <span className="pl-hero-stat-val">
                  {String(products.length).padStart(2, '0')}<span className="u">EA</span>
                </span>
                <EditableText
                  as="span"
                  className="pl-hero-stat-lbl"
                  path="products.statsLabel[0]"
                  value={statLabels[0] ?? 'Products'}
                  editor={editor}
                />
              </div>
              <div className="pl-hero-stat">
                <span className="pl-hero-stat-val">
                  {String(seasonCount).padStart(2, '0')}<span className="u">SS</span>
                </span>
                <EditableText
                  as="span"
                  className="pl-hero-stat-lbl"
                  path="products.statsLabel[1]"
                  value={statLabels[1] ?? 'Seasons'}
                  editor={editor}
                />
              </div>
              <div className="pl-hero-stat">
                <span className="pl-hero-stat-val">{collectionYear}</span>
                <EditableText
                  as="span"
                  className="pl-hero-stat-lbl"
                  path="products.statsLabel[2]"
                  value={statLabels[2] ?? 'Collection'}
                  editor={editor}
                />
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
                <EditableText path="products.featuredTitlePre" value={pd.featuredTitlePre ?? ''} editor={editor} />
                <em>
                  <EditableText path="products.featuredTitleEm" value={pd.featuredTitleEm ?? ''} editor={editor} />
                </em>
              </h2>
              <EditableText
                as="span"
                className="pl-featured-meta"
                path="products.featuredEyebrow"
                value={pd.featuredEyebrow ?? ''}
                editor={editor}
              />
              {/* Admin-only: jump to the per-product editor to change
               * the featured product's name / subtitle / spec (those
               * live in the product JSON, not the page dict). */}
              {editor ? (
                <a
                  href={`/admin/products/${featured.slug}/edit`}
                  className="pl-featured-edit"
                  title="이미지·갤러리·상세 스펙 편집"
                >
                  ✎ 상세 편집
                </a>
              ) : null}
            </div>
            {(() => {
              const fName = stripTags(featured.name) || featured.slug;
              // Featured body — name + subtitle inline-editable in admin
              // mode (bound to product@<slug>@<field>), read-only on the
              // public page. The spec rows stay read-only here (edited
              // on the per-product editor via the ✎ chip above).
              const fBody = (
                <>
                  <div className="pl-featured-media">
                    <ImageOrPlaceholder src={getCardImages(featured).main} alt={fName} />
                    <span className="pl-featured-stamp">
                      {featured.model ?? featured.slug.toUpperCase()}
                      {featured.category ? ` · ${featured.category.split('·')[0].trim()}` : ''}
                    </span>
                  </div>
                  <div className="pl-featured-info">
                    {featured.category ? <span className="pl-featured-tag">{featured.category}</span> : null}
                    {editor ? (
                      <EditableText as="h3" className="pl-featured-name" path={`product@${featured.slug}@name`} value={fName} editor={editor} />
                    ) : (
                      <h3 className="pl-featured-name">{fName}</h3>
                    )}
                    {editor ? (
                      <EditableText as="p" className="pl-featured-sub" path={`product@${featured.slug}@subtitle`} value={stripTags(featured.subtitle ?? '')} editor={editor} multiline />
                    ) : featured.subtitle ? (
                      <p className="pl-featured-sub">{stripTags(featured.subtitle)}</p>
                    ) : null}
                    {featured.spec?.rows && featured.spec.rows.length > 0 ? (
                      <div className="pl-featured-spec">
                        {featured.spec.rows.slice(0, 4).map((row, i) => (
                          <div key={i} className="pl-featured-spec-row">
                            <span className="pl-featured-spec-k">{stripTags(row.label)}</span>
                            <span className="pl-featured-spec-v">{stripTags(row.value)}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {!editor ? (
                      <span className="pl-featured-cta">{pd.featuredCtaLabel ?? '상세 보기 →'}</span>
                    ) : null}
                  </div>
                </>
              );
              return editor ? (
                <div className="pl-featured-card">{fBody}</div>
              ) : (
                <Link
                  href={`/${locale}/products/${featured.slug}/`}
                  className="pl-featured-card"
                  aria-label={fName}
                >
                  {fBody}
                </Link>
              );
            })()}
          </div>
        </section>
      ) : null}

      {/* ── Season blocks ────────────────────────────────── */}
      {seasonGroups.map((group, idx) => {
        const copy = pd.seasons?.[group.id] ?? {};
        const num = `${String(idx + 1).padStart(2, '0')} / ${String(seasonGroups.length).padStart(2, '0')} — ${group.nameEn}`;
        return (
          <section key={group.id} className="pl-season" id={group.id}>
            <div className="wrap">
              <div className="pl-season-head">
                <div>
                  <span className="pl-season-num">{num}</span>
                  <EditableText
                    as="h2"
                    className="pl-season-h"
                    path={`products.seasons.${group.id}.headline`}
                    value={copy.headline ?? ''}
                    editor={editor}
                  />
                  <EditableText
                    as="p"
                    className="pl-season-lede"
                    path={`products.seasons.${group.id}.lede`}
                    value={copy.lede ?? ''}
                    editor={editor}
                    multiline
                  />
                </div>
                <div className="pl-season-count">
                  <EditableText
                    as="span"
                    className="pl-season-count-lbl"
                    path="products.seasonItemsLabel"
                    value={pd.seasonItemsLabel ?? 'Items'}
                    editor={editor}
                  />
                  <span className="pl-season-count-val">
                    {String(group.items.length).padStart(2, '0')}
                  </span>
                </div>
              </div>
              {group.items.length === 0 ? (
                <EditableText
                  as="div"
                  className="pl-season-empty"
                  path="products.seasonEmpty"
                  value={pd.seasonEmpty ?? '곧 추가될 예정입니다.'}
                  editor={editor}
                />
              ) : (
                <div className="pl-season-grid">
                  {group.items.map((p) => {
                    const { main, hover } = getCardImages(p);
                    const name = stripTags(p.name) || p.slug;
                    // Spec value can carry inline markup (e.g.
                    // <span style="letter-spacing">300 g/m</span>) from
                    // the catalog import — strip it so the card shows
                    // clean text, not escaped tags.
                    const wRaw = p.spec?.rows?.find((r) => /평량|중량|weight/i.test(r.label))?.value;
                    const w = wRaw ? stripTags(wRaw) : '';
                    const ct = (p.spec?.rows?.length ?? 0) + ' specs';
                    // Card body — shared between public (<Link>) and
                    // admin (<div>, inline-editable) modes. In admin
                    // mode the name / subtitle / weight become
                    // EditableText bound to product@<slug>@<field>
                    // paths, which the products-page editor routes
                    // straight into the product JSON draft.
                    const body = (
                      <>
                        <div className="pl-card-frame">
                          {main ? (
                            <>
                              <img src={main} alt={name} className="pl-card-img main" loading="lazy" decoding="async" />
                              {hover ? (
                                <img src={hover} alt="" aria-hidden className="pl-card-img hover" loading="lazy" decoding="async" />
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
                        {editor ? (
                          <EditableText as="h3" className="pl-card-name" path={`product@${p.slug}@name`} value={name} editor={editor} />
                        ) : (
                          <h3 className="pl-card-name">{name}</h3>
                        )}
                        {editor ? (
                          <EditableText as="p" className="pl-card-desc" path={`product@${p.slug}@subtitle`} value={stripTags(p.subtitle ?? '')} editor={editor} multiline />
                        ) : p.subtitle ? (
                          <p className="pl-card-desc">{stripTags(p.subtitle)}</p>
                        ) : null}
                        <div className="pl-card-foot">
                          <span className="pl-card-spec">
                            {editor ? (
                              // Always editable in admin — even with no weight
                              // yet — so the operator can add one (which seeds
                              // a 평량 spec row). Empty shows a click hint
                              // instead of the "N specs" fallback.
                              <EditableText as="b" path={`product@${p.slug}@weight`} value={w} editor={editor} placeholder="+ 평량 입력 (예: 160 g/m²)" />
                            ) : w ? (
                              <b>{w}</b>
                            ) : (
                              ct
                            )}
                          </span>
                          {!editor ? (
                            <span className="pl-card-arrow">{locale === 'ko' ? '상세 →' : 'View →'}</span>
                          ) : null}
                        </div>
                      </>
                    );
                    // Admin: render the card as a non-navigating <div>
                    // so clicking the text fields edits instead of
                    // jumping to the detail page; add the "✎ 제품 편집"
                    // deep-link for spec rows / images / gallery that
                    // aren't inline-editable here. Public: the whole
                    // card is a <Link> to the detail page.
                    return editor ? (
                      <div key={p.slug} className="pl-card-wrap">
                        <div className="pl-card">{body}</div>
                        <a
                          href={`/admin/products/${p.slug}/edit`}
                          className="pl-card-edit"
                          title="이미지·갤러리·상세 스펙 편집"
                        >
                          ✎ 상세 편집
                        </a>
                      </div>
                    ) : (
                      <div key={p.slug} className="pl-card-wrap pl-card-wrap-plain">
                        <Link href={`/${locale}/products/${p.slug}/`} className="pl-card" aria-label={name}>
                          {body}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        );
      })}

      {/* Editorial quote (MATERIAL PHILOSOPHY) + Collection CTA sections
       * removed 2026-07 per operator request — the products page ends on
       * the season grids. The dict keys (products.editorial* / products.cta*)
       * and catalog wiring are left intact in case either is reinstated. */}
    </>
  );
}
