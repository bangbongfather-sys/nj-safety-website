/**
 * 검색엔진이 읽는 구조화 데이터(JSON-LD).
 *
 * 사람이 보는 화면은 그대로 두고, 크롤러에게 "이 회사가 무엇을 만드는
 * 곳이고 이 페이지가 어떤 제품인지"를 기계가 읽는 형식으로 따로
 * 알려 준다. 네이버·구글이 회사 정보 패널이나 제품 정보를 구성할 때
 * 쓰는 근거가 된다.
 */

import { SITE_URL } from './site';

/**
 * 제품 사진은 카탈로그 앱이 호스팅한다. ImageOrPlaceholder 가 화면에서
 * 하는 것과 같은 변환을 여기서도 해야 한다 — 구조화 데이터의 이미지
 * 주소는 크롤러가 직접 받아 가므로 상대 경로면 무용지물이다.
 */
const CATALOG_BASE = 'https://catalog-app.njsafety91.workers.dev';
const CATALOG_PREFIXES = ['/api/images/', '/products/', '/brand/'];

export function absoluteImage(src: string | undefined): string | undefined {
  if (!src) return undefined;
  if (/^https?:\/\//i.test(src)) return src;
  for (const p of CATALOG_PREFIXES) {
    if (src.startsWith(p)) return `${CATALOG_BASE}${src}`;
  }
  return src.startsWith('/') ? `${SITE_URL}${src}` : src;
}

/** 마크업이 섞인 제목·설명을 평문으로. */
export function plain(s: string | undefined): string {
  return String(s ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

type CompanyInfo = {
  name?: string;
  tel?: string;
  email?: string;
  addressFull?: string;
  brn?: string;
};

/**
 * 회사 정보. 검색 결과 우측 정보 패널과 "나정엔터프라이즈" 검색 시
 * 상호·연락처·주소를 묶어 주는 근거가 된다.
 */
export function organizationSchema(company: CompanyInfo) {
  const name = plain(company.name) || '나정엔터프라이즈';
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    alternateName: ['NJ SAFETY', 'NJ Safety', '나정엔터프라이즈'],
    url: SITE_URL,
    logo: `${SITE_URL}/nj-logo.png`,
    image: `${SITE_URL}/og.jpg`,
    description:
      '아라미드 원단으로 만드는 산업용 방염복 전문 제조사. 방염 작업복 · 용접복 · 난연 작업복을 제작합니다.',
    telephone: plain(company.tel) || undefined,
    email: plain(company.email) || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: plain(company.addressFull) || undefined,
      addressCountry: 'KR',
    },
    // 사업자등록번호 — 동명 업체와 구분되는 유일한 식별자다.
    taxID: plain(company.brn) || undefined,
    // foundingDate 는 일부러 비워 둔다. 사이트 안에서 창립 연도가
    // 1992(히어로·브랜드 소개)와 1987(회사소개 연혁)로 갈려 있어,
    // 기계가 읽는 자리에 한쪽을 단정해 넣으면 검색 결과에 틀린 해가
    // 박힌다. 표기를 하나로 정한 뒤에 넣는 편이 맞다.
  };
}

/** 사이트 자체. 검색창에 사이트명이 뜨게 하는 기본 정보. */
export function webSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '나정엔터프라이즈 (NJ SAFETY)',
    url: SITE_URL,
    inLanguage: 'ko',
  };
}

type ProductInfo = {
  slug: string;
  name?: string;
  subtitle?: string;
  tagline?: string;
  category?: string;
  hero?: { image?: string };
};

/**
 * 제품 한 건. 이름·사진·제조사를 묶어 준다. 가격은 B2B 견적이라
 * 공개 값이 없으므로 offers 를 넣지 않는다 — 없는 가격을 지어내는
 * 것보다 빼는 쪽이 맞고, 잘못된 offers 는 검색엔진이 경고를 띄운다.
 */
export function productSchema(p: ProductInfo, locale: string) {
  const name = plain(p.name);
  const img = absoluteImage(p.hero?.image);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: plain(p.subtitle) || plain(p.tagline) || undefined,
    image: img ? [img] : undefined,
    category: plain(p.category) || '방염복',
    brand: { '@type': 'Brand', name: 'NJ SAFETY' },
    manufacturer: { '@type': 'Organization', name: '나정엔터프라이즈' },
    url: `${SITE_URL}/${locale}/products/${p.slug}/`,
  };
}

/** undefined 를 걷어낸 뒤 <script> 에 넣을 문자열로. */
export function jsonLdString(obj: unknown): string {
  return JSON.stringify(obj, (_k, v) => (v === undefined ? undefined : v));
}
