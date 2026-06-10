import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { getAllProducts } from '@/lib/products';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

function stripTags(s: string | undefined): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.sizeGuide?.meta?.title ?? 'Size Guide — NJ SAFETY',
    description: dict.sizeGuide?.meta?.description ?? '',
  };
}

export default async function SizeGuidePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const loc = locale as Locale;
  const dict = getDictionary(loc);

  // Pull every product that actually has a size table — products without
  // one are silently skipped so the page stays clean.
  const productsWithSize = getAllProducts().filter(
    (p) => (p.spec?.sizeTable?.rows?.length ?? 0) > 0,
  );

  return (
    <section className="skeleton-page" style={{ paddingBottom: 120 }}>
      <div className="wrap">
        <span className="eyebrow">{dict.sizeGuide.hero.eyebrow}</span>
        <h1>
          {dict.sizeGuide.hero.titlePre}
          <em>{dict.sizeGuide.hero.titleEm}</em>
        </h1>
        <p style={{ marginTop: 16, maxWidth: 720 }}>{dict.sizeGuide.intro}</p>

        {/* How-to-measure — 4 steps */}
        <h2
          style={{
            marginTop: 64,
            fontFamily: 'var(--display)',
            fontSize: 'clamp(24px, 2.8vw, 36px)',
            fontWeight: 900,
            letterSpacing: '-.02em',
          }}
        >
          {dict.sizeGuide.howToHead}
        </h2>
        <div
          style={{
            marginTop: 24,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 12,
          }}
        >
          {dict.sizeGuide.howTo.map((step) => (
            <div
              key={step.n}
              style={{
                padding: 20,
                background: 'rgba(255,255,255,.03)',
                border: '1px solid var(--border-soft)',
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--mono, monospace)',
                  color: 'var(--accent)',
                  fontSize: 13,
                  letterSpacing: '.08em',
                }}
              >
                {step.n}
              </div>
              <div style={{ marginTop: 6, fontWeight: 800, fontSize: 18 }}>{step.label}</div>
              <p style={{ marginTop: 8, color: 'var(--muted)', fontSize: 14, lineHeight: 1.55 }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>

        {/* Per-product size tables */}
        <h2
          style={{
            marginTop: 80,
            fontFamily: 'var(--display)',
            fontSize: 'clamp(24px, 2.8vw, 36px)',
            fontWeight: 900,
            letterSpacing: '-.02em',
          }}
        >
          {dict.sizeGuide.tableHead}
        </h2>

        {productsWithSize.length === 0 ? (
          <div
            style={{
              marginTop: 24,
              padding: '48px 24px',
              border: '1px dashed var(--border-soft)',
              borderRadius: 12,
              color: 'var(--muted)',
              textAlign: 'center',
            }}
          >
            {dict.sizeGuide.tableEmpty}
          </div>
        ) : (
          <div style={{ marginTop: 24, display: 'grid', gap: 32 }}>
            {productsWithSize.map((p) => {
              const t = p.spec!.sizeTable!;
              return (
                <div key={p.slug}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                    <h3 style={{ fontWeight: 800, fontSize: 18, margin: 0 }}>
                      {stripTags(p.name) || p.slug}
                    </h3>
                    {p.model ? (
                      <span style={{ color: 'var(--muted)', fontSize: 13 }}>{p.model}</span>
                    ) : null}
                    <Link
                      href={`/${loc}/products/${p.slug}/`}
                      style={{
                        marginLeft: 'auto',
                        fontSize: 13,
                        color: 'var(--accent)',
                        textDecoration: 'underline',
                      }}
                    >
                      {loc === 'ko' ? '제품 보기 →' : 'View product →'}
                    </Link>
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      maxWidth: '100%',
                      overflowX: 'auto',
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    <table
                      style={{
                        width: '100%',
                        minWidth: 480,
                        borderCollapse: 'collapse',
                        fontSize: 14,
                      }}
                    >
                      {t.headers ? (
                        <thead>
                          <tr>
                            {t.headers.map((h, i) => (
                              <th
                                key={i}
                                style={{
                                  padding: '12px 16px',
                                  textAlign: 'left',
                                  borderBottom: '1px solid var(--border-soft)',
                                  background: 'rgba(255,255,255,.04)',
                                  fontWeight: 700,
                                  fontSize: 13,
                                  letterSpacing: '.04em',
                                  textTransform: 'uppercase',
                                  color: 'var(--muted)',
                                }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                      ) : null}
                      <tbody>
                        {(t.rows ?? []).map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) => (
                              <td
                                key={ci}
                                style={{
                                  padding: '12px 16px',
                                  borderBottom: '1px solid var(--border-soft)',
                                  fontFamily: ci === 0 ? 'var(--mono, monospace)' : 'inherit',
                                  fontWeight: ci === 0 ? 700 : 500,
                                }}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {t.unit ? (
                      <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: 12 }}>
                        {loc === 'ko' ? '단위' : 'Unit'}: {t.unit}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p
          style={{
            marginTop: 64,
            padding: '20px 24px',
            background: 'rgba(255,107,26,.08)',
            border: '1px solid rgba(255,107,26,.3)',
            borderRadius: 10,
            color: 'var(--text)',
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          💡 {dict.sizeGuide.tip}
        </p>

        <p style={{ marginTop: 24, color: 'var(--muted)', fontSize: 13 }}>
          ←{' '}
          <Link href={`/${loc}/resources/`} style={{ color: 'inherit', textDecoration: 'underline' }}>
            {loc === 'ko' ? '자료실로 돌아가기' : 'Back to resources'}
          </Link>
        </p>
      </div>
    </section>
  );
}
