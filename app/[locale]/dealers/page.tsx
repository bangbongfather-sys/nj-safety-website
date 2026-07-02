import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { getDealersFile } from '@/lib/dealers';
import DealersLocator from '@/components/sections/dealers/DealersLocator';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

// Kakao Maps JavaScript appkey (domain-restricted in the Kakao
// Developers console → public by design). Read from the build env;
// once provisioned it can also be hardcoded here as a fallback the
// way NaverMap does, since Cloudflare's auto-build has no .env.local.
const KAKAO_APPKEY = process.env.NEXT_PUBLIC_KAKAO_MAP_APPKEY ?? '';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.dealers?.meta?.title ?? 'Authorised Dealers — NJ SAFETY',
    description: dict.dealers?.meta?.description ?? '',
  };
}

export default async function DealersPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const loc = locale as Locale;
  const dict = getDictionary(loc);
  const file = getDealersFile();
  const totalDealers = file.dealers.length;

  return (
    <section className="skeleton-page" style={{ paddingBottom: 120 }}>
      <div className="wrap">
        <span className="eyebrow">{dict.dealers.hero.eyebrow}</span>
        <h1>
          {dict.dealers.hero.titlePre}
          <em>{dict.dealers.hero.titleEm}</em>
        </h1>
        <p style={{ marginTop: 16, maxWidth: 760 }}>{dict.dealers.sub}</p>
        <p style={{ marginTop: 8, color: 'var(--muted)', fontSize: 13 }}>
          {loc === 'ko'
            ? `전국 ${file.regions.length}개 권역 · ${totalDealers}개 대리점`
            : `${file.regions.length} regions · ${totalDealers} dealer(s)`}
        </p>

        {/* Store locator — map + region filter + search + distance list.
         * Coordinates are geocoded from each dealer's address by the
         * Kakao Geocoder inside the client component. */}
        <DealersLocator
          locale={loc}
          regions={file.regions}
          dealers={file.dealers}
          appkey={KAKAO_APPKEY}
        />

        {/* CTA — partnership enquiries */}
        <section
          style={{
            marginTop: 96,
            padding: '56px 0 0',
            borderTop: '1px solid var(--border-soft)',
          }}
        >
          <span className="eyebrow">{dict.dealers.ctaEyebrow}</span>
          <h2
            style={{
              marginTop: 14,
              fontFamily: 'var(--display)',
              fontWeight: 800,
              fontSize: 'clamp(28px, 3.4vw, 44px)',
              letterSpacing: '-.025em',
              color: 'var(--text)',
            }}
          >
            {dict.dealers.ctaTitlePre}
            <em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>
              {dict.dealers.ctaTitleEm}
            </em>
          </h2>
          <p style={{ marginTop: 16, maxWidth: 640, color: 'var(--muted)' }}>
            {dict.dealers.ctaSub}
          </p>
          <Link
            href={`/${loc}/contact`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 24,
              padding: '14px 22px',
              background: 'var(--accent)',
              color: '#0d0d0e',
              fontFamily: 'var(--display)',
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: '-.01em',
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            {dict.dealers.ctaButton}
          </Link>
        </section>
      </div>
    </section>
  );
}
