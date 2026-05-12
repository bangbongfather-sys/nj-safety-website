import Link from 'next/link';
import type { Product } from '@/lib/products';
import type { Locale } from '@/lib/i18n';
import {
  HeroSection,
  GallerySection,
  StatementSection,
  MaterialSection,
  FeaturesSection,
  SpecSection,
  FieldSection,
  CareSection,
  CertsSection,
  OrderSection,
} from './sections';

type Props = { product: Product; locale: Locale };

export default function ProductDetail({ product, locale }: Props) {
  return (
    <article className="product-detail">
      <div className="product-detail-back">
        <div className="wrap">
          <Link href={`/${locale}/products`} className="back-link">
            ← {locale === 'ko' ? '전체 제품' : 'All products'}
          </Link>
          {product.model ? <span className="back-model">{product.model}</span> : null}
        </div>
      </div>

      <HeroSection
        hero={product.hero}
        name={product.name}
        category={product.category}
        subtitle={product.subtitle}
        tagline={product.tagline}
      />
      <GallerySection gallery={product.gallery} />
      <StatementSection statement={product.statement} />
      <MaterialSection material={product.material} />
      <FeaturesSection features={product.features} />
      <SpecSection spec={product.spec} />
      <FieldSection field={product.field} />
      <CareSection care={product.care} />
      <CertsSection certs={product.certs} />
      <OrderSection order={product.order} />
    </article>
  );
}
