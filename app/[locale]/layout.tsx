import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { locales, isLocale, getDictionary, type Locale } from '@/lib/i18n';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import HtmlLang from '@/components/layout/HtmlLang';
import StyleInjector from '@/components/admin/StyleInjector';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }> | { locale: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await params;
  if (!isLocale(resolved.locale)) return {};
  const dict = getDictionary(resolved.locale);
  const loc = resolved.locale;
  const ogDesc =
    loc === 'ko'
      ? '아라미드 방염 작업복 전문 · NFPA 2112 · HRC2 · EN ISO 11612 국제 인증. 1992년부터 나정엔터프라이즈.'
      : 'Aramid flame-resistant workwear · NFPA 2112 · HRC2 · EN ISO 11612 certified. By Najung Enterprise since 1992.';
  // Full openGraph/twitter re-declared here (Next.js does not deep-merge the
  // parent openGraph, so images must be repeated for locale pages to keep
  // the share card image).
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: `/${loc}`,
      languages: { ko: '/ko', en: '/en', 'x-default': '/ko' },
    },
    openGraph: {
      type: 'website',
      siteName: 'NJ SAFETY',
      url: `/${loc}`,
      locale: loc === 'ko' ? 'ko_KR' : 'en_US',
      title: dict.meta.title,
      description: ogDesc,
      images: [{ url: '/og.jpg', width: 1200, height: 630, alt: dict.meta.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.meta.title,
      description: ogDesc,
      images: ['/og.jpg'],
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const resolved = await params;
  if (!isLocale(resolved.locale)) notFound();
  const locale = resolved.locale as Locale;
  const dict = getDictionary(locale);

  return (
    <>
      <HtmlLang locale={locale} />
      <StyleInjector styles={dict.styles} />
      <Navigation locale={locale} dict={dict} />
      <main>{children}</main>
      <Footer locale={locale} dict={dict} />
    </>
  );
}
