import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { getDealersFile, regionName, type Dealer, type DealerRegion } from '@/lib/dealers';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

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

  // Group dealers by regionId, preserving the admin-defined region order.
  const byRegion = new Map<string, Dealer[]>();
  for (const r of file.regions) byRegion.set(r.id, []);
  for (const d of file.dealers) {
    if (!byRegion.has(d.regionId)) byRegion.set(d.regionId, []);
    byRegion.get(d.regionId)!.push(d);
  }

  const totalDealers = file.dealers.length;
  const labels = dict.dealers?.fieldLabels ?? {};

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

        {/* Region groups */}
        <div style={{ marginTop: 64, display: 'grid', gap: 56 }}>
          {file.regions.map((region) => {
            const dealers = byRegion.get(region.id) ?? [];
            return (
              <section key={region.id} aria-labelledby={`region-${region.id}`}>
                {/* Region header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 16,
                    borderBottom: '1px solid var(--border-soft)',
                    paddingBottom: 12,
                    marginBottom: 24,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontFamily: 'var(--mono, ui-monospace, monospace)',
                        fontSize: 11,
                        letterSpacing: '.2em',
                        textTransform: 'uppercase',
                        color: 'var(--muted-2)',
                      }}
                    >
                      {region.en}
                    </span>
                    <h2
                      id={`region-${region.id}`}
                      style={{
                        margin: '4px 0 0',
                        fontFamily: 'var(--display)',
                        fontWeight: 700,
                        fontSize: 'clamp(22px, 2.6vw, 32px)',
                        letterSpacing: '-.02em',
                        color: 'var(--text)',
                      }}
                    >
                      {regionName(region, loc)}
                    </h2>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--mono, ui-monospace, monospace)',
                      fontSize: 12,
                      letterSpacing: '.04em',
                      color: 'var(--muted)',
                    }}
                  >
                    {String(dealers.length).padStart(2, '0')} {loc === 'ko' ? '곳' : 'sites'}
                  </span>
                </div>

                {dealers.length === 0 ? (
                  <div
                    style={{
                      padding: '40px 24px',
                      border: '1px dashed var(--border-soft)',
                      borderRadius: 12,
                      color: 'var(--muted)',
                      textAlign: 'center',
                      fontSize: 14,
                    }}
                  >
                    {dict.dealers.emptyRegion}
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                      gap: 16,
                    }}
                  >
                    {dealers.map((d) => (
                      <DealerCard key={d.id} dealer={d} labels={labels} locale={loc} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

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

/* ───────────────────────────────────────────────────────────── */

function DealerCard({
  dealer,
  labels,
  locale,
}: {
  dealer: Dealer;
  labels: { addr?: string; tel?: string; fax?: string; email?: string; hours?: string; manager?: string };
  locale: Locale;
}) {
  const rows: Array<{ key: string; value: string }> = [];
  if (dealer.addr) rows.push({ key: labels.addr ?? '주소', value: dealer.addr });
  if (dealer.tel) rows.push({ key: labels.tel ?? 'TEL', value: dealer.tel });
  if (dealer.fax) rows.push({ key: labels.fax ?? 'FAX', value: dealer.fax });
  if (dealer.email) rows.push({ key: labels.email ?? 'EMAIL', value: dealer.email });
  if (dealer.hours) rows.push({ key: labels.hours ?? '영업시간', value: dealer.hours });
  if (dealer.manager) rows.push({ key: labels.manager ?? '담당자', value: dealer.manager });

  return (
    <article
      style={{
        padding: 22,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid var(--border-soft)',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        transition: 'border-color .15s ease',
      }}
    >
      <header>
        <h3
          style={{
            margin: 0,
            fontFamily: 'var(--display)',
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: '-.018em',
            color: 'var(--text)',
          }}
        >
          {dealer.name}
        </h3>
      </header>
      {rows.length > 0 ? (
        <dl style={{ margin: 0, display: 'grid', gap: 8, fontSize: 13.5, lineHeight: 1.55 }}>
          {rows.map((r, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '64px 1fr',
                gap: 12,
              }}
            >
              <dt
                style={{
                  fontFamily: 'var(--mono, ui-monospace, monospace)',
                  fontSize: 10,
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  color: 'var(--muted-2)',
                  paddingTop: 2,
                }}
              >
                {r.key}
              </dt>
              <dd style={{ margin: 0, color: 'var(--text)', whiteSpace: 'pre-line' }}>
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {dealer.note ? (
        <p
          style={{
            margin: 0,
            paddingTop: 14,
            borderTop: '1px solid var(--border-soft)',
            fontSize: 12.5,
            lineHeight: 1.6,
            color: 'var(--muted)',
          }}
        >
          {dealer.note}
        </p>
      ) : null}
    </article>
  );
}
