import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { SITE_URL } from '@/lib/site';
import './globals.css';

const OG_DESC =
  '아라미드 방염 작업복 전문 · NFPA 2112 · HRC2 · EN ISO 11612 국제 인증. 1992년부터 나정엔터프라이즈.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'NJ SAFETY — 산업 안전복 전문',
    template: '%s | NJ SAFETY',
  },
  description: OG_DESC,
  applicationName: 'NJ SAFETY',
  openGraph: {
    type: 'website',
    siteName: 'NJ SAFETY',
    locale: 'ko_KR',
    url: '/',
    title: 'NJ SAFETY — 산업 안전복 전문',
    description: OG_DESC,
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'NJ SAFETY — 산업 안전복 전문' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NJ SAFETY — 산업 안전복 전문',
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
