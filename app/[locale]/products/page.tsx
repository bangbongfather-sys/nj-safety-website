import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { getAllProducts } from '@/lib/products';
import type { Product } from '@/lib/products';
import SkeletonPage from '@/components/sections/SkeletonPage';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

function stripTags(s: string | undefined): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim();
}

/**
 * Card images: the public product list shows the main photo and a
 * "behind" photo that fades in on hover. Both come from the same
 * shopHeader gallery the admin already manages on the product editor
 * — no extra "list card" field needed.
 *
 * Priority order:
 *   1. shopHeader.images (admin curates these explicitly)
 *   2. hero.image + gallery.items[].image (catalog-app fallback)
 *
 * Returns the first available URL as `main` and the second as `hover`.
 * If only one image exists, hover is undefined and the swap silently
 * no-ops (the card still works, just doesn't change on hover).
 */
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

export default async function ProductsPage({ params }: Props) {
  const resolved = await params;
  if (!isLocale(resolved.locale)) notFound();
  const locale = resolved.locale as Locale;
  const dict = getDictionary(locale);
  const products = getAllProducts();

  if (products.length === 0) {
    return <SkeletonPage locale={locale} dict={dict} pageKey="products" />;
  }

  return (
    <section className="skeleton-page" style={{ paddingBottom: 120 }}>
      <div className="wrap">
        <span className="eyebrow">{dict.skeleton.products.eyebrow}</span>
        <h1>
          {dict.skeleton.products.titlePre}
          <em>{dict.skeleton.products.titleEm}</em>
        </h1>
        <p>{locale === 'ko' ? `${products.length}개 제품 등록됨.` : `${products.length} product(s) listed.`}</p>

        <div
          style={{
            marginTop: 56,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {products.map((p) => {
            const { main, hover } = getCardImages(p);
            return (
              <Link
                key={p.slug}
                href={`/${locale}/products/${p.slug}/`}
                className="product product-tall product-card-link"
              >
                <div className="frame product-card-frame">
                  <span className="idx">{p.model ?? p.slug.toUpperCase()}</span>
                  {p.category ? <span className="code">{p.category.split('·')[0].trim()}</span> : null}
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
                  <span>{locale === 'ko' ? '상세 보기' : 'View detail'}</span>
                  <span className="arr">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
