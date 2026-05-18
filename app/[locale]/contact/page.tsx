import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n';
import ContactPageView from '@/components/sections/contact/ContactPage';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: '문의 — NJ SAFETY',
    description:
      '견적·B2B 단체 주문·OEM 제작·인증서 요청·A/S 등 NJ SAFETY 전문가에게 직접 문의하세요. 1영업일 내 회신.',
  };
}

export default async function ContactRoute({ params }: Props) {
  const resolved = await params;
  if (!isLocale(resolved.locale)) notFound();
  return <ContactPageView locale={resolved.locale as Locale} />;
}
