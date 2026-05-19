import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import AboutPageView from '@/components/sections/about/AboutPage';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  // Re-uses the existing about.meta description with a capabilities
  // angle. If the admin wants to tune SEO copy separately later, add
  // about.capMeta to the dict — the dict lookup below falls back
  // gracefully when it's missing.
  type CapMeta = { capMeta?: { title?: string; description?: string } };
  const cap = (dict.about as unknown as CapMeta).capMeta;
  return {
    title:
      cap?.title ??
      (locale === 'ko' ? '역량 & 시스템 — NJ SAFETY' : 'Capabilities — NJ SAFETY'),
    description:
      cap?.description ??
      dict.about?.meta?.description ??
      (locale === 'ko'
        ? '원단부터 출하까지 — NJ Safety의 제조 시스템, 핵심 가치, 산업군, 최근 인증.'
        : 'Manufacturing system, core values, industries served, and recent certifications — NJ Safety.'),
  };
}

export default async function AboutCapabilitiesRoute({ params }: Props) {
  const resolved = await params;
  if (!isLocale(resolved.locale)) notFound();
  const locale = resolved.locale as Locale;
  return <AboutPageView locale={locale} dict={getDictionary(locale)} view="capabilities" />;
}
