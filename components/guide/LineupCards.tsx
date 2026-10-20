/**
 * 계절별 방염작업복 라인업 카드 — 안내 페이지들(방염작업복, 전기 방염복)이
 * 함께 쓴다. 제품 사진은 카탈로그 앱이 호스팅하므로 상세페이지·검색
 * 데이터와 같은 absoluteImage 규칙으로 주소를 만든다.
 *
 * 아크 시험 문구는 제품 인증 칸에 적힌 그대로다. 노출 조건이지 등급이
 * 아니므로 등급처럼 쓰지 않는다.
 */
import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { getProduct } from '@/lib/products';
import { absoluteImage, plain } from '@/lib/seo';
import './lineup-cards.css';

export const ARC_TESTED = ['njs-aj200', 'njs-ar204'];

export const LINEUP: { season: { ko: string; en: string }; slugs: string[] }[] = [
  { season: { ko: '춘추용', en: 'Mid-season' }, slugs: ['njs-aj200', 'njfwp25'] },
  { season: { ko: '하계용', en: 'Summer' }, slugs: ['njs-ar204', 'njs-ar301', 'njssyyy', 'njssp', 'njs-av100'] },
  { season: { ko: '동계용', en: 'Winter' }, slugs: ['njs-aj100', 'njwwp26'] },
];

const ARC_NOTE = {
  ko: 'EN IEC 61482-1-1, 약 11.4 cal/cm² 노출 조건 아크 시험',
  en: 'Arc tested to EN IEC 61482-1-1 at approx. 11.4 cal/cm² exposure',
};

export function productName(slug: string): string {
  const p = getProduct(slug);
  return p ? plain(p.name).replace(/\.$/, '') : slug;
}

export default function LineupCards({ locale }: { locale: Locale }) {
  const en = locale === 'en';
  return (
    <>
      {LINEUP.map((group) => (
        <div key={group.season.ko} className="lu-group">
          <h3>{en ? group.season.en : group.season.ko}</h3>
          <ul className="lu-cards">
            {group.slugs.map((slug) => {
              const p = getProduct(slug);
              if (!p) return null;
              const name = productName(slug);
              const img = absoluteImage((p.hero as { image?: string } | undefined)?.image);
              return (
                <li key={slug}>
                  <Link href={`/${locale}/products/${slug}/`} className="lu-card">
                    <span className="lu-card-img">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={name} loading="lazy" />
                      ) : null}
                    </span>
                    <span className="lu-card-body">
                      <b>{name}</b>
                      {ARC_TESTED.includes(slug) ? (
                        <span className="lu-card-arc">{en ? ARC_NOTE.en : ARC_NOTE.ko}</span>
                      ) : null}
                      <span className="lu-card-view">{en ? 'View' : '제품 보기'} →</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}
