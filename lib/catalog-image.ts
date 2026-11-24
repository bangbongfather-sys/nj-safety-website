/**
 * 제품 사진 중 카탈로그 앱이 호스팅하는 경로(/api/images/·/products/·/brand/)를
 * 카탈로그 앱 절대 주소로 바꾼다. ImageOrPlaceholder 가 상세페이지에서 하는
 * 변환과 같다. 목록 카드처럼 <img>/<Image> 를 직접 쓰는 곳은 이 변환이 없으면
 * 웹사이트 도메인에서 파일을 찾다가 깨진 이미지가 된다 — 카탈로그 앱에서
 * 새로 만든 제품(쇼핑 헤더 사진을 아직 안 올린 제품)이 그 경우다.
 * 그 밖의 주소(R2 절대 주소, 웹사이트 자체 경로)는 그대로 둔다.
 */
export const CATALOG_BASE = 'https://catalog-app.njsafety91.workers.dev';
const CATALOG_PREFIXES = ['/api/images/', '/products/', '/brand/'];

export function catalogImage(src: string | undefined): string | undefined {
  if (!src) return src;
  for (const p of CATALOG_PREFIXES) {
    if (src.startsWith(p)) return `${CATALOG_BASE}${src}`;
  }
  return src;
}
