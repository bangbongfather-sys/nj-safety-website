import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { SITE_URL } from '@/lib/site';
import { defaultLocale, getDictionary } from '@/lib/i18n';
import './globals.css';

// Title and blurb come from the Korean dictionary (meta.*) so both are
// editable from /admin/text (사이트 메타) rather than requiring a code
// change — this is what Naver prints for the bare domain.
const koMeta = getDictionary(defaultLocale).meta;
const OG_TITLE = koMeta.title;
const OG_DESC = koMeta.shareDescription || koMeta.description;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Company name leads the title: "나정엔터프라이즈" is what existing
  // customers search for on Naver, and the previous njfashion.co.kr site
  // ranked on it. The brand follows in parentheses so both queries land.
  title: {
    default: OG_TITLE,
    template: '%s | NJ SAFETY',
  },
  description: OG_DESC,
  applicationName: 'NJ SAFETY',
  openGraph: {
    type: 'website',
    siteName: 'NJ SAFETY',
    locale: 'ko_KR',
    url: '/',
    title: OG_TITLE,
    description: OG_DESC,
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: OG_TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: OG_TITLE,
    description: OG_DESC,
    images: ['/og.jpg'],
  },
  robots: { index: true, follow: true },
  /**
   * 네이버 서치어드바이저 소유확인.
   *
   * 등록한 주소(https://njfashion.co.kr)의 HTML 에 이 태그가 있어야
   * 네이버가 "이 사이트의 주인이 맞다"고 인정하고 수집을 시작한다.
   * 루트 레이아웃에 두어 모든 페이지에 실리게 한다 — 확인이 끝난 뒤에도
   * 지워서는 안 된다. 태그가 사라지면 소유확인이 풀린다.
   *
   * 값 자체는 공개돼도 무방하다. 소유 확인에만 쓰이고 계정 접근
   * 권한은 없다.
   */
  verification: {
    other: {
      'naver-site-verification': '95039b7c54fe4ae22c5fb486ce80e98d98393aae',
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Archivo:wght@400;500;600;700;800;900&family=Fraunces:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
