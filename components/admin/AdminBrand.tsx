'use client';

/**
 * 회사 로고. 임의로 그린 글자 마크가 아니라 실제 브랜드 파일을 쓴다.
 * 배경 밝기에 따라 글자 색이 다른 두 버전이 있어서 테마별로 고른다.
 */

import Link from 'next/link';

type Props = {
  dark: boolean;
  /** true 면 심볼만 (좁은 화면·사이드바 접힘용). */
  markOnly?: boolean;
  /** 로고 옆에 붙일 말 — "관리자" 등. */
  suffix?: string;
};

export default function AdminBrand({ dark, markOnly, suffix }: Props) {
  // -trim 판을 쓴다. 원본은 그림 주위에 투명 여백이 넓어서, 높이를
  // 맞추면 정작 로고가 1/3 크기로 보인다.
  const src = markOnly
    ? dark ? '/brand/mark-light.png' : '/brand/mark.png'
    : dark ? '/brand/logo-light-trim.png' : '/brand/logo-trim.png';

  return (
    <Link href="/admin" className="adm-brand" aria-label="NJ SAFETY 관리자 홈">
      <img
        src={src}
        alt="NJ SAFETY"
        className={markOnly ? 'adm-brand-mark' : 'adm-brand-logo'}
      />
      {suffix ? <span className="adm-brand-suffix">{suffix}</span> : null}
    </Link>
  );
}
