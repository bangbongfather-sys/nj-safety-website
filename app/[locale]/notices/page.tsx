import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { getAllNotices } from '@/lib/notices';
import NoticesBoard from '@/components/sections/notices/NoticesBoard';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.notices?.meta?.title ?? 'Notices — NJ SAFETY',
    description: dict.notices?.meta?.description ?? '',
  };
}

export default async function NoticesPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const notices = getAllNotices();

  // Strip bodies before handing to the client — the list view only needs
  // id / type / pinned / date / title, and shipping the full bodies would
  // bloat the page payload for no reason (detail pages read them separately).
  const rows = notices.map((n) => ({
    id: n.id,
    type: n.type,
    pinned: !!n.pinned,
    date: n.date,
    title: loc === 'en' ? n.titleEn : n.titleKo,
  }));

  return <NoticesBoard locale={loc} dict={dict} rows={rows} />;
}
