import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { getAllProducts } from '@/lib/products';
import SkeletonPage from '@/components/sections/SkeletonPage';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

function stripTags(s: string | undefined): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim();
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
          {products.map((p) => (
            <Link
              key={p.slug}
              href={`/${locale}/products/${p.slug}/`}
              className="product product-tall"
            >
              <div className="frame">
                <span className="idx">{p.model ?? p.slug.toUpperCase()}</span>
                {p.category ? <span className="code">{p.category.split('·')[0].trim()}</span> : null}
                <div className="pd-img-ph" style={{ height: '100%', minHeight: 0 }}>
                  <span className="pd-img-ph-mark">IMG</span>
                  <span className="pd-img-ph-alt">{stripTags(p.name)}</span>
                </div>
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
          ))}
        </div>
      </div>
    </section>
  );
}
