import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { locales, isLocale, getDictionary, type Locale } from '@/lib/i18n';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import HtmlLang from '@/components/layout/HtmlLang';
import StyleInjector from '@/components/admin/StyleInjector';
import NoticePopup from '@/components/sections/notices/NoticePopup';
import { getAllNotices } from '@/lib/notices';

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
  // The share/search blurb lives in the dictionary so it's editable from
  // /admin/text (사이트 메타) — this is the line Naver prints under the
  // search result, and it used to be a string literal only a deploy could
  // change. Falls back to the page description if it's ever left blank.
  const ogDesc = dict.meta.shareDescription || dict.meta.description;
  // Full openGraph/twitter re-declared here (Next.js does not deep-merge the
  // parent openGraph, so images must be repeated for locale pages to keep
  // the share card image).
  return {
    // `absolute` so the root layout's "%s | NJ SAFETY" template doesn't
    // append the brand to a title that already carries it — the locale
    // titles are the full "나정엔터프라이즈 (NJ SAFETY) — ..." string.
    // Sub-pages keep the template.
    title: { absolute: dict.meta.title },
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

  // Popup candidates are baked in at build time; NoticePopup does the
  // expiry check in the browser so a passed `until` date takes effect
  // without waiting for a redeploy.
  const popupNotices = getAllNotices().filter((n) => n.popup?.enabled);

  return (
    <>
      <HtmlLang locale={locale} />
      <StyleInjector styles={dict.styles} />
      <Navigation locale={locale} dict={dict} />
      <main>{children}</main>
      <Footer locale={locale} dict={dict} />
      <NoticePopup locale={locale} candidates={popupNotices} />
    </>
  );
}
