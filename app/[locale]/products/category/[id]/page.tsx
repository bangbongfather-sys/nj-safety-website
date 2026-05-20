import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locales, isLocale, getDictionary, type Locale } from '@/lib/i18n';
import { getAllProducts } from '@/lib/products';
import type { Product } from '@/lib/products';
import {
  getAllCategories,
  getCategory,
  categoryName,
} from '@/lib/product-categories';

export function generateStaticParams() {
  const cats = getAllCategories();
  const params: { locale: string; id: string }[] = [];
  for (const locale of locales) {
    for (const c of cats) {
      params.push({ locale, id: c.id });
    }
  }
  return params;
}

type Props = {
  params: Promise<{ locale: string; id: string }> | { locale: string; id: string };
};

function stripTags(s: string | undefined): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim();
}

// Same card-image picker as /products — shopHeader-curated images win,
// catalog fallback for older products that haven't been touched yet.
function getCardImages(p: Product): { main?: string; hover?: string } {
  const shop = (p.shopHeader?.images ?? []).filter((s): s is string => !!s);
  if (shop.length > 0) {
    return { main: shop[0], hover: shop[1] };
  }
  const fallback: string[] = [];
  if (p.hero?.image) fallback.push(p.hero.image);
  for (const it of p.gallery?.items ?? []) {
    if (it.image && !fallback.includes(it.image)) fallback.push(it.image);
  }
  return { main: fallback[0], hover: fallback[1] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};
  const cat = getCategory(id);
  if (!cat) return {};
  const name = categoryName(cat, locale as Locale);
  const description =
    locale === 'en'
      ? `Products in the ${name} category.`
      : `${name} 카테고리에 속한 제품 목록.`;
  return {
    title: `${name} — NJ SAFETY`,
    description,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const loc = locale as Locale;
  const cat = getCategory(id);
  if (!cat) notFound();

  const dict = getDictionary(loc);
  const name = categoryName(cat, loc);

  // Map slug → product so we preserve the admin-chosen order and
  // silently drop any slug that no longer maps to a real JSON.
  const bySlug = new Map(getAllProducts().map((p) => [p.slug, p] as const));
  const products: Product[] = cat.productSlugs
    .map((s) => bySlug.get(s))
    .filter((p): p is Product => Boolean(p));

  return (
    <section className="skeleton-page" style={{ paddingBottom: 120 }}>
      <div className="wrap">
        <span className="eyebrow">— {dict.nav.products}</span>
        <h1>
          {name}
          <em>.</em>
        </h1>
        <p style={{ marginTop: 12 }}>
          <Link
            href={`/${loc}/products`}
            style={{ color: 'var(--muted)', textDecoration: 'underline' }}
          >
            ← {loc === 'ko' ? '전체 제품 보기' : 'View all products'}
          </Link>
          <span style={{ marginLeft: 16 }}>
            {loc === 'ko'
              ? `${products.length}개 제품`
              : `${products.length} product(s)`}
          </span>
        </p>

        {products.length === 0 ? (
          <div
            style={{
              marginTop: 56,
              padding: '64px 24px',
              border: '1px dashed var(--border-soft)',
              borderRadius: 16,
              textAlign: 'center',
              color: 'var(--muted)',
            }}
          >
            {loc === 'ko'
              ? '이 카테고리에 등록된 제품이 없습니다.'
              : 'No products in this category yet.'}
          </div>
        ) : (
          <div
            style={{
              marginTop: 56,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 60,
            }}
          >
            {products.map((p) => {
              const { main, hover } = getCardImages(p);
              return (
                <Link
                  key={p.slug}
                  href={`/${loc}/products/${p.slug}/`}
                  className="product product-tall product-card-link"
                >
                  <div className="frame product-card-frame">
                    <span className="idx">{p.model ?? p.slug.toUpperCase()}</span>
                    {p.category ? (
                      <span className="code">{p.category.split('·')[0].trim()}</span>
                    ) : null}
                    {main ? (
                      <>
                        <img
                          src={main}
                          alt={stripTags(p.name)}
                          className="product-card-img product-card-img-main"
                          loading="lazy"
                          decoding="async"
                        />
                        {hover ? (
                          <img
                            src={hover}
                            alt=""
                            aria-hidden
                            className="product-card-img product-card-img-hover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : null}
                      </>
                    ) : (
                      <div className="pd-img-ph" style={{ height: '100%', minHeight: 0 }}>
                        <span className="pd-img-ph-mark">IMG</span>
                        <span className="pd-img-ph-alt">{stripTags(p.name)}</span>
                      </div>
                    )}
                  </div>
                  <div className="meta">
                    {p.category ? <span className="en">{p.category}</span> : null}
                    <span className="ko">{stripTags(p.name)}</span>
                    {p.subtitle ? <span className="desc">{p.subtitle}</span> : null}
                  </div>
                  <div className="arr-row">
                    <span>{loc === 'ko' ? '상세 보기' : 'View detail'}</span>
                    <span className="arr">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
