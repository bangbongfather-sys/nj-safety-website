import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locales, getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { getAllNoticeIds, getNotice } from '@/lib/notices';

export function generateStaticParams() {
  const ids = getAllNoticeIds();
  const params: { locale: string; id: string }[] = [];
  for (const locale of locales) {
    for (const id of ids) {
      params.push({ locale, id });
    }
  }
  return params;
}

type Props = {
  params: Promise<{ locale: string; id: string }> | { locale: string; id: string };
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${y}.${m}.${d}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};
  const notice = getNotice(id);
  if (!notice) return {};
  const title = locale === 'en' ? notice.titleEn : notice.titleKo;
  return { title: `${title} — NJ SAFETY` };
}

export default async function NoticeDetailPage({ params }: Props) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const notice = getNotice(id);
  if (!notice) notFound();

  const t = dict.notices;
  const title = loc === 'en' ? notice.titleEn : notice.titleKo;
  const body = loc === 'en' ? notice.bodyEn : notice.bodyKo;
  const typeLabel = t.types[notice.type] ?? notice.type;
  // Bodies are stored as plain text with blank-line paragraph breaks.
  const paragraphs = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <section className="notice-page notice-detail">
      <div className="wrap notice-detail-wrap">
        <article className="notice-article">
          <div className="notice-article-meta">
            <span className={`notice-badge notice-badge-${notice.type}`}>{typeLabel}</span>
            <span className="notice-article-date">
              {t.postedOn} · {formatDate(notice.date)}
            </span>
          </div>
          <h1 className="notice-article-title">{title}</h1>
          <div className="notice-article-body">
            {paragraphs.map((p, i) => (
              <p key={i}>
                {p.split('\n').map((line, j, arr) => (
                  <span key={j}>
                    {line}
                    {j < arr.length - 1 ? <br /> : null}
                  </span>
                ))}
              </p>
            ))}
          </div>
        </article>

        <div className="notice-detail-foot">
          <Link href={`/${loc}/notices/`} className="btn btn-ghost">
            {t.backToList}
          </Link>
          <Link href={`/${loc}/contact`} className="btn btn-primary">
            {dict.nav.quoteCta} <span className="arr">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
