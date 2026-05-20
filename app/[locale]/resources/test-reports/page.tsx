import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { getAllProducts } from '@/lib/products';
import type { Product } from '@/lib/products';
import ImageOrPlaceholder from '@/components/product/ImageOrPlaceholder';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

function stripTags(s: string | undefined): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim();
}

function fmtBytes(n: number | undefined): string {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Pick the card image for a product. Same priority as the products
 * list: shopHeader.images[0] (admin curates), else hero.image, else
 * first gallery item. Returns undefined when the product has no
 * photos yet — the card falls back to ImageOrPlaceholder's IMG block.
 */
function getProductImage(p: Product): string | undefined {
  const shop = (p.shopHeader?.images ?? []).filter((s): s is string => !!s);
  if (shop[0]) return shop[0];
  if (p.hero?.image) return p.hero.image;
  for (const it of p.gallery?.items ?? []) {
    if (it.image) return it.image;
  }
  return undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title:
      (locale === 'ko' ? '시험성적서' : 'Test Reports') +
      ' — NJ SAFETY',
    description:
      dict.resources?.testReports?.desc ??
      (locale === 'ko'
        ? '제품별 KC / NFPA / EN ISO 인증 시험성적서 PDF.'
        : 'Per-product KC / NFPA / EN ISO certification test reports.'),
  };
}

export default async function TestReportsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const loc = locale as Locale;
  const dict = getDictionary(loc);

  // Build a per-product list with at least one report. Products with zero
  // reports are hidden so the page doesn't fill with "0건" rows.
  const products = getAllProducts()
    .map((p) => ({
      product: p,
      files: (p.testReports?.files ?? []).filter((f) => !!f.url),
    }))
    .filter((row) => row.files.length > 0);

  const totalReports = products.reduce((n, row) => n + row.files.length, 0);

  return (
    <section className="skeleton-page" style={{ paddingBottom: 120 }}>
      <div className="wrap">
        <span className="eyebrow">
          {loc === 'ko' ? '— 자료실 · 시험성적서' : '— Resources · Test Reports'}
        </span>
        <h1>
          {loc === 'ko' ? '시험성적서' : 'Test Reports'}
          <em>.</em>
        </h1>
        <p style={{ marginTop: 16, maxWidth: 760 }}>
          {dict.resources?.testReports?.desc ??
            (loc === 'ko'
              ? '제품별 KC / NFPA / EN ISO 인증 시험성적서 PDF. 발주 검토 / 사내 회람용으로 자유롭게 다운로드하세요.'
              : 'Per-product KC / NFPA / EN ISO certification reports. Download freely for order review or internal circulation.')}
        </p>
        <p style={{ marginTop: 8, color: 'var(--muted)', fontSize: 14 }}>
          ←{' '}
          <Link
            href={`/${loc}/resources/`}
            style={{ color: 'inherit', textDecoration: 'underline' }}
          >
            {loc === 'ko' ? '자료실 메인으로' : 'Back to Resources'}
          </Link>
          <span style={{ marginLeft: 16 }}>
            {loc === 'ko'
              ? `${products.length}개 제품 · ${totalReports}건`
              : `${products.length} product(s) · ${totalReports} file(s)`}
          </span>
        </p>

        {products.length === 0 ? (
          <div
            style={{
              marginTop: 56,
              padding: '64px 24px',
              border: '1px dashed var(--border-soft)',
              borderRadius: 16,
              textAlign: 'center',
              color: 'var(--muted)',
            }}
          >
            {dict.resources?.testReports?.empty ??
              (loc === 'ko'
                ? '아직 등록된 시험성적서가 없습니다. 곧 추가 예정입니다.'
                : 'No test reports listed yet — coming soon.')}
          </div>
        ) : (
          <div style={{ marginTop: 56, display: 'grid', gap: 20 }}>
            {products.map(({ product, files }) => {
              const img = getProductImage(product);
              const name = stripTags(product.name) || product.slug;
              return (
                <article
                  key={product.slug}
                  className="tr-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '220px 1fr',
                    gap: 0,
                    background: 'rgba(255,255,255,.025)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: 14,
                    overflow: 'hidden',
                    transition: 'border-color .15s, background .15s',
                  }}
                >
                  {/* Photo column — fixed 220px, fills the row height */}
                  <Link
                    href={`/${loc}/products/${product.slug}/`}
                    aria-label={loc === 'ko' ? `${name} 제품 보기` : `View ${name}`}
                    style={{
                      position: 'relative',
                      display: 'block',
                      background: 'rgba(255,255,255,.04)',
                      minHeight: 200,
                    }}
                  >
                    <ImageOrPlaceholder
                      src={img}
                      alt={name}
                      className="tr-photo"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </Link>

                  {/* Meta + PDFs column */}
                  <div
                    style={{
                      padding: '24px 28px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                      minWidth: 0,
                    }}
                  >
                    <header>
                      {product.category ? (
                        <div
                          style={{
                            fontFamily: 'var(--mono, ui-monospace, monospace)',
                            fontSize: 11,
                            letterSpacing: '.14em',
                            textTransform: 'uppercase',
                            color: 'var(--muted)',
                          }}
                        >
                          {product.category}
                        </div>
                      ) : null}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 12,
                          marginTop: 4,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Link
                          href={`/${loc}/products/${product.slug}/`}
                          style={{
                            fontFamily: 'var(--display)',
                            fontSize: 20,
                            fontWeight: 800,
                            letterSpacing: '-.018em',
                            color: 'inherit',
                            textDecoration: 'none',
                          }}
                        >
                          {name}
                        </Link>
                        {product.model ? (
                          <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                            {product.model}
                          </span>
                        ) : null}
                      </div>
                    </header>

                    <ul
                      style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'grid',
                        gap: 8,
                      }}
                    >
                      {files.map((file, i) => (
                        <li key={file.url + i}>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'auto 1fr auto',
                              alignItems: 'center',
                              gap: 14,
                              padding: '12px 16px',
                              background: 'rgba(0,0,0,.25)',
                              border: '1px solid var(--border-soft)',
                              borderRadius: 10,
                              textDecoration: 'none',
                              color: 'inherit',
                              transition: 'border-color .15s, background .15s',
                            }}
                          >
                            <span
                              aria-hidden
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 36,
                                height: 36,
                                background: 'rgba(255,107,26,.12)',
                                color: 'var(--accent)',
                                borderRadius: 6,
                                fontFamily: 'var(--mono, ui-monospace, monospace)',
                                fontSize: 11,
                                fontWeight: 800,
                                letterSpacing: '.06em',
                              }}
                            >
                              PDF
                            </span>
                            <span style={{ minWidth: 0 }}>
                              <span
                                style={{
                                  display: 'block',
                                  fontWeight: 700,
                                  fontSize: 15,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {file.name || `${name} 시험성적서 ${i + 1}`}
                              </span>
                              <span
                                style={{
                                  display: 'block',
                                  marginTop: 4,
                                  color: 'var(--muted)',
                                  fontSize: 12,
                                  fontFamily: 'var(--mono, ui-monospace, monospace)',
                                  letterSpacing: '.04em',
                                }}
                              >
                                {fmtBytes(file.size)}
                                {file.uploadedAt ? ` · ${fmtDate(file.uploadedAt)}` : ''}
                              </span>
                            </span>
                            <span
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: 'var(--accent)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {loc === 'ko' ? '다운로드 ↓' : 'Download ↓'}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Stack the photo on top + meta below at narrow widths so the
       * card stays readable on mobile. 720px keeps tablets in the
       * desktop split. */}
      <style>{`
        @media (max-width: 720px) {
          .tr-row {
            grid-template-columns: 1fr !important;
          }
          .tr-row > a:first-child {
            min-height: 240px !important;
            aspect-ratio: 4 / 3;
          }
        }
      `}</style>
    </section>
  );
}
