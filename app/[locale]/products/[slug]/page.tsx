import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locales, isLocale } from '@/lib/i18n';
import { getAllProductSlugs, getProduct } from '@/lib/products';
import ProductPage from '@/components/product/ProductPage';
import JsonLd from '@/components/seo/JsonLd';
import { plain, productSchema } from '@/lib/seo';

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

/**
 * 검색 결과에 실릴 제목·설명.
 *
 * 화면에 보이는 제품명은 '아라미드 춘추 팬츠'처럼 우리 용어로 쓰지만,
 * 고객은 네이버에서 '방염복', '방염 작업복', '용접복'으로 찾는다. 그
 * 말이 페이지 어디에도 없으면 검색에 걸릴 근거가 없다. 화면 문구는
 * 그대로 두고, 검색엔진이 읽는 이 자리에만 실제 검색어를 넣는다.
 *
 * 품목(자켓/팬츠/셔츠…)에 따라 붙는 말을 달리해, 아홉 개 제품이 전부
 * 똑같은 설명을 달고 서로 경쟁하는 상황을 피한다.
 */
const KIND_KEYWORD: Array<[RegExp, string]> = [
  [/자켓|재킷|점퍼/, '방염 자켓'],
  [/팬츠|바지/, '방염 바지'],
  [/티셔츠|셔츠/, '방염 셔츠'],
  [/조끼|베스트/, '방염 조끼'],
];

function kindKeyword(name: string): string {
  for (const [re, kw] of KIND_KEYWORD) if (re.test(name)) return kw;
  return '방염복';
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const product = getProduct(slug);
  if (!product) return {};
  const name = stripTags(product.name);
  if (locale === 'en') {
    return {
      title: `${name} — NJ SAFETY`,
      description: plain(product.subtitle) || plain(product.tagline) || '',
    };
  }
  const kw = kindKeyword(name);
  const lede = plain(product.subtitle) || plain(product.tagline) || '';
  return {
    title: `${name} | ${kw} · 방염 작업복 — NJ SAFETY`,
    description:
      `${lede}${lede.endsWith('.') ? '' : '.'} NFPA 2112 · HRC2 · EN ISO 11612 인증 ` +
      `아라미드 ${kw}. 나정엔터프라이즈(NJ SAFETY) 제작.`,
  };
}

export default async function ProductDetailRoute({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const product = getProduct(slug);
  if (!product) notFound();
  return (
    <>
      <JsonLd data={productSchema(product, locale)} />
      <ProductPage data={product} locale={locale} />
    </>
  );
}
