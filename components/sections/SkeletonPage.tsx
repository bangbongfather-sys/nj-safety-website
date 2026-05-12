import Link from 'next/link';
import type { Dictionary, Locale } from '@/lib/i18n';

type SkeletonKey = keyof Dictionary['skeleton'];

type Props = {
  locale: Locale;
  dict: Dictionary;
  pageKey: SkeletonKey;
};

export default function SkeletonPage({ locale, dict, pageKey }: Props) {
  const s = dict.skeleton[pageKey];
  return (
    <section className="skeleton-page">
      <div className="wrap">
        <span className="eyebrow">{s.eyebrow}</span>
        <h1>
          {s.titlePre}
          <em>{s.titleEm}</em>
        </h1>
        <p>{s.body}</p>
        <div style={{ marginTop: 56, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <Link href={`/${locale}`} className="btn btn-ghost">
            ← {locale === 'ko' ? '메인으로' : 'Back to home'}
          </Link>
          <Link href={`/${locale}/contact`} className="btn btn-primary">
            {dict.nav.quoteCta} <span className="arr">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
