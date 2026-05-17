'use client';

/**
 * Product detail shop-style header.
 *
 * Lives at the top of every /[locale]/products/<slug>/ page, between the
 * standard site nav and the tabbed detail content. Mirrors the e-commerce
 * pattern customers are used to: main photo on the left with a vertical
 * thumbnail strip + a clicked-thumbnail swap, product info on the right
 * (brand line, model code, name, tagline, key specs, action buttons).
 *
 * B2B adaptation: no price, no cart. The primary action is a 견적 문의
 * link to /<locale>/contact?product=<slug>; the secondaries are a spec
 * sheet download placeholder and Web Share API share button.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { sanitizeHtml } from '@/lib/sanitize';
import type { Locale } from '@/lib/i18n';
import type { ProductPageData } from '@/lib/product-page-types';
import ImageOrPlaceholder from './ImageOrPlaceholder';

type Props = {
  data: ProductPageData;
  locale: Locale;
};

// Lift up to 4 spec rows into the header summary. We intentionally show a
// small subset (원단 / 중량 / 사이즈 / 원산지 friendly) so the right column
// stays scannable and the full table lives in the detail tab below.
const SUMMARY_KEYS = ['원단 구성', '중량', '컬러', '사이즈', '원산지', '인증'];

function pickSummarySpecs(rows: { label: string; value: string }[] | undefined) {
  if (!rows) return [];
  // Preserve the order defined in SUMMARY_KEYS but only keep what actually
  // exists on this product — different products may surface different
  // shorthand rows in the future.
  return SUMMARY_KEYS
    .map((k) => rows.find((r) => r.label.trim() === k))
    .filter((r): r is { label: string; value: string } => !!r)
    .slice(0, 4);
}

function stripTags(s: string | undefined | null): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim();
}

export default function ProductShopHeader({ data, locale }: Props) {
  const galleryImages = useMemo(() => {
    // First image candidate: hero, then each gallery item with an image.
    // Falling back to hero ensures we always have at least one frame.
    const items: string[] = [];
    if (data.hero?.image) items.push(data.hero.image);
    for (const it of data.gallery?.items ?? []) {
      if (it.image && !items.includes(it.image)) items.push(it.image);
    }
    return items;
  }, [data.hero?.image, data.gallery?.items]);

  const [active, setActive] = useState(0);
  const mainSrc = galleryImages[active] ?? galleryImages[0] ?? '';

  const summary = pickSummarySpecs(data.spec?.rows);
  const contactHref = `/${locale}/contact?product=${encodeURIComponent(data.slug ?? '')}`;

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = stripTags(data.name) || 'NJ SAFETY';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled — fall through to clipboard
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        // eslint-disable-next-line no-alert -- minimal UX without a toast lib
        alert('주소를 복사했습니다.');
      } catch {
        // ignore
      }
    }
  };

  return (
    <section className="psh">
      <div className="psh-wrap">
        <div className="psh-grid">
          {/* ── Left column: main image + thumbnail strip ───────── */}
          <div className="psh-media">
            <div className="psh-main">
              <ImageOrPlaceholder
                src={mainSrc}
                alt={data.hero?.imageAlt ?? stripTags(data.name)}
                className="psh-main-img"
              />
              {galleryImages.length > 1 ? (
                <div className="psh-count">
                  {active + 1} / {galleryImages.length}
                </div>
              ) : null}
            </div>
            {galleryImages.length > 1 ? (
              <div className="psh-thumbs" role="tablist" aria-label="제품 사진">
                {galleryImages.map((src, i) => (
                  <button
                    key={src + i}
                    type="button"
                    role="tab"
                    aria-selected={i === active}
                    className={`psh-thumb${i === active ? ' is-on' : ''}`}
                    onClick={() => setActive(i)}
                    aria-label={`사진 ${i + 1}`}
                  >
                    <ImageOrPlaceholder src={src} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* ── Right column: info + actions ────────────────────── */}
          <div className="psh-info">
            <div className="psh-brand">
              <span className="psh-brand-name">NJ SAFETY</span>
              {data.model ? <span className="psh-model">{data.model}</span> : null}
            </div>

            {data.category ? (
              <div
                className="psh-category"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.category) }}
              />
            ) : null}

            <h1
              className="psh-name"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.name ?? '') }}
            />

            {data.subtitle ? (
              <p
                className="psh-subtitle"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.subtitle) }}
              />
            ) : null}

            {data.tagline ? (
              <p
                className="psh-tagline"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.tagline) }}
              />
            ) : null}

            {summary.length > 0 ? (
              <dl className="psh-summary">
                {summary.map((row) => (
                  <div key={row.label} className="psh-summary-row">
                    <dt>{row.label}</dt>
                    <dd
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(row.value) }}
                    />
                  </div>
                ))}
              </dl>
            ) : null}

            <div className="psh-actions">
              <Link href={contactHref} className="psh-btn psh-btn-primary">
                견적 문의
                <span className="arr">→</span>
              </Link>
              <button
                type="button"
                className="psh-btn psh-btn-ghost"
                onClick={handleShare}
                aria-label="제품 페이지 공유"
              >
                공유
              </button>
            </div>

            <ul className="psh-meta">
              <li>
                <strong>tel.</strong> 02-777-3079
              </li>
              <li>
                <strong>email.</strong> njsafety91@naver.com
              </li>
              <li>
                <strong>made in</strong> Korea
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
