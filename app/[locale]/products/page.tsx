import { notFound } from 'next/navigation';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { getAllProducts } from '@/lib/products';
import { getAllCategories } from '@/lib/product-categories';
import { getSiteResources, hasCatalogPdf } from '@/lib/site-resources';
import SkeletonPage from '@/components/sections/SkeletonPage';
import ProductsListing from '@/components/sections/products/ProductsListing';
import categoriesData from '@/data/product-categories.json';
import '@/components/sections/products/products-listing.css';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

export default async function ProductsPage({ params }: Props) {
  const resolved = await params;
  if (!isLocale(resolved.locale)) notFound();
  const locale = resolved.locale as Locale;
  const dict = getDictionary(locale);
  const products = getAllProducts();

  if (products.length === 0) {
    return <SkeletonPage locale={locale} dict={dict} pageKey="products" />;
  }

  const categories = getAllCategories();
  const site = getSiteResources();

  // featuredSlug lives at the top level of data/product-categories.json.
  // The lib loader (getAllCategories) just returns the categories array,
  // so we tap into the raw JSON here for the picker value.
  const featuredSlug = (categoriesData as { featuredSlug?: string }).featuredSlug;

  return (
    <ProductsListing
      locale={locale}
      dict={dict}
      products={products}
      categories={categories}
      featuredSlug={featuredSlug}
      catalogReady={hasCatalogPdf(site)}
      catalogUrl={site.catalog?.pdfUrl}
    />
  );
}
