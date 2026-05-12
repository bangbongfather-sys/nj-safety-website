import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locales, isLocale, type Locale } from '@/lib/i18n';
import { getAllProductSlugs, getProduct } from '@/lib/products';
import ProductDetail from '@/components/product/ProductDetail';

export function generateStaticParams() {
  const slugs = getAllProductSlugs();
  const params: { locale: string; slug: string }[] = [];
  for (const locale of locales) {
    for (const slug of slugs) {
      params.push({ locale, slug });
    }
  }
  return params;
}

type Props = {
  params: Promise<{ locale: string; slug: string }> | { locale: string; slug: string };
};

function stripTags(s: string | undefined): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const product = getProduct(slug);
  if (!product) return {};
  const name = stripTags(product.name);
  return {
    title: `${name} — NJ SAFETY`,
    description: product.subtitle || product.tagline || '',
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const product = getProduct(slug);
  if (!product) notFound();
  return <ProductDetail product={product} locale={locale as Locale} />;
}
