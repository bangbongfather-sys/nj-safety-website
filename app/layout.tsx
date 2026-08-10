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
