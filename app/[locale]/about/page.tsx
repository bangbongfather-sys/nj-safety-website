import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n';
import AboutPageView from '@/components/sections/about/AboutPage';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: '회사소개 — NJ SAFETY',
    description:
      '1987년 나정ETP로 시작해 2025년 현재, 38년간 산업안전복 한 분야에 집중해온 나정엔터프라이즈. 원단 개발부터 출하까지 원스톱으로 책임집니다.',
  };
}

export default async function AboutRoute({ params }: Props) {
  const resolved = await params;
  if (!isLocale(resolved.locale)) notFound();
  return <AboutPageView locale={resolved.locale as Locale} />;
}
