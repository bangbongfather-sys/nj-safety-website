import type { Metadata } from 'next';
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

/**
 * 제품 목록은 '방염복 종류를 한눈에' 찾는 검색과 맞닿아 있다. 지금까지
 * 이 페이지에는 메타데이터가 아예 없어 사이트 기본값이 그대로 쓰였고,
 * 그래서 홈과 구분되는 검색 근거가 없었다.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  if (locale === 'en') {
    return {
      title: 'Products — Aramid Flame-Resistant Workwear | NJ SAFETY',
      description:
        'FR jackets, pants, shirts and vests made from aramid fabric. NFPA 2112 · HRC2 · EN ISO 11612 certified.',
    };
  }
  return {
    title: '제품 라인업 — 아라미드 방염복 · 방염 작업복 | NJ SAFETY',
    description:
      '아라미드 방염복 전 제품. 방염 자켓 · 방염 바지 · 방염 셔츠 · 방염 조끼를 계절별로 구성했습니다. ' +
      'NFPA 2112 · HRC2 · EN ISO 11612 인증, 나정엔터프라이즈 제작.',
  };
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
