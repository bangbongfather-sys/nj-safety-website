import { notFound } from 'next/navigation';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import SkeletonPage from '@/components/sections/SkeletonPage';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

export default async function ClientsPage({ params }: Props) {
  const resolved = await params;
  if (!isLocale(resolved.locale)) notFound();
  const locale = resolved.locale as Locale;
  return <SkeletonPage locale={locale} dict={getDictionary(locale)} pageKey="clients" />;
}
