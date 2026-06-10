import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { SITE_URL } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'NJ SAFETY — Industrial Safety Wear',
    template: '%s | NJ SAFETY',
  },
  description:
    'Aramid-engineered flame-resistant workwear. NFPA 2112 · HRC2 · EN ISO 11612 certified. Since 1992 by Najung Enterprise.',
  applicationName: 'NJ SAFETY',
  authors: [{ name: 'Najung Enterprise' }],
  openGraph: {
    type: 'website',
    siteName: 'NJ SAFETY',
    url: SITE_URL,
    title: 'NJ SAFETY — Industrial Safety Wear',
    description:
      'Aramid-engineered flame-resistant workwear. NFPA 2112 · HRC2 · EN ISO 11612 certified.',
    images: ['/hero.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NJ SAFETY — Industrial Safety Wear',
    description:
      'Aramid-engineered flame-resistant workwear. NFPA 2112 · HRC2 · EN ISO 11612 certified.',
    images: ['/hero.jpg'],
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
