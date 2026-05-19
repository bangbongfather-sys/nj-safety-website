import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.privacy?.meta?.title ?? 'Privacy Policy — NJ SAFETY',
    description: dict.privacy?.meta?.description ?? '',
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const loc = locale as Locale;
  const dict = getDictionary(loc);

  return (
    <section className="skeleton-page" style={{ paddingBottom: 120 }}>
      <div className="wrap" style={{ maxWidth: 920 }}>
        <span className="eyebrow">{dict.privacy.hero.eyebrow}</span>
        <h1>
          {dict.privacy.hero.titlePre}
          <em>{dict.privacy.hero.titleEm}</em>
        </h1>
        <p style={{ marginTop: 12, color: 'var(--muted)', fontSize: 13 }}>{dict.privacy.effective}</p>
        <p style={{ marginTop: 20, fontSize: 15, lineHeight: 1.7 }}>{dict.privacy.intro}</p>

        <div style={{ marginTop: 48, display: 'grid', gap: 32 }}>
          {dict.privacy.sections.map((s, i) => (
            <article key={i}>
              <h2
                style={{
                  fontFamily: 'var(--display)',
                  fontSize: 'clamp(20px, 2.2vw, 26px)',
                  fontWeight: 800,
                  letterSpacing: '-.018em',
                  margin: '0 0 12px',
                }}
              >
                {s.title}
              </h2>
              <p
                style={{
                  whiteSpace: 'pre-wrap',
                  color: 'var(--text)',
                  fontSize: 15,
                  lineHeight: 1.75,
                  margin: 0,
                }}
              >
                {s.body}
              </p>
            </article>
          ))}
        </div>

        {/* Privacy officer block */}
        <div
          style={{
            marginTop: 56,
            padding: '24px 28px',
            background: 'rgba(255,255,255,.04)',
            border: '1px solid var(--border-soft)',
            borderRadius: 12,
          }}
        >
          <h3
            style={{
              fontFamily: 'var(--display)',
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '-.01em',
              margin: '0 0 14px',
            }}
          >
            {dict.privacy.officerHead}
          </h3>
          <div style={{ display: 'grid', gap: 6, fontSize: 14, lineHeight: 1.7 }}>
            <div>
              <span style={{ color: 'var(--muted)', marginRight: 12 }}>
                {loc === 'ko' ? '성함' : 'Name'}
              </span>
              {dict.privacy.officer.name}
            </div>
            <div>
              <span style={{ color: 'var(--muted)', marginRight: 12 }}>
                {loc === 'ko' ? '소속' : 'Team'}
              </span>
              {dict.privacy.officer.role}
            </div>
            <div>
              <span style={{ color: 'var(--muted)', marginRight: 12 }}>
                {loc === 'ko' ? '연락처' : 'Contact'}
              </span>
              {dict.privacy.officer.contact}
            </div>
          </div>
        </div>

        <p style={{ marginTop: 32, color: 'var(--muted)', fontSize: 13 }}>{dict.privacy.changeNote}</p>

        <p style={{ marginTop: 40, color: 'var(--muted)', fontSize: 13 }}>
          ←{' '}
          <Link href={`/${loc}/`} style={{ color: 'inherit', textDecoration: 'underline' }}>
            {loc === 'ko' ? '홈으로' : 'Back home'}
          </Link>
        </p>
      </div>
    </section>
  );
}
