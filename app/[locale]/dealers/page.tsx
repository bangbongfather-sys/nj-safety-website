import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { getDealersFile } from '@/lib/dealers';
import DealersLocator from '@/components/sections/dealers/DealersLocator';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

/**
 * Kakao Maps JavaScript appkey.
 *
 * Committed as a fallback on purpose, the same way NaverMap holds its
 * NCP client ID. `NEXT_PUBLIC_*` values are baked in at build time, and
 * Cloudflare rebuilds from GitHub on every push with no access to
 * `.env.local` (gitignored) — so a key that lives only in `.env.local`
 * works on a locally built deploy and silently vanishes on the next
 * push. That is exactly how the dealer map ended up blank.
 *
 * A Kakao *JavaScript* key is public by design: it ships in browser
 * code and is protected by the domain whitelist in the Kakao Developers
 * console (Web 플랫폼 → njfashion.co.kr + the workers.dev fallback),
 * not by secrecy. The REST/Admin keys are different and never belong
 * here.
 *
 * Empty string ⇒ the locator renders its list-only state instead of a
 * broken map. Paste the JavaScript key between the quotes to switch the
 * map on; .env.local still overrides for local experiments.
 */
const FALLBACK_KAKAO_APPKEY = 'fbd59535ff75a0834c2cc3e235464baa';
const KAKAO_APPKEY = process.env.NEXT_PUBLIC_KAKAO_MAP_APPKEY || FALLBACK_KAKAO_APPKEY;

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
