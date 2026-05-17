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
 * link to /<locale>/contact?product=<slug>; the secondary is a Web Share
 * API share button (clipboard fallback).
 *
 * Editor mode: when an EditorApi is provided (admin route at
 * /admin/products/<slug>/edit wires this), the text fields render as
 * <EditableText> and the main image becomes an <EditableImage> tile so
 * the admin can upload a new photo through the standard R2 panel.
 * Without an editor, everything renders as plain read-only HTML.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { sanitizeHtml } from '@/lib/sanitize';
import type { Locale } from '@/lib/i18n';
import type { ProductPageData } from '@/lib/product-page-types';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';
import EditableImage from '@/components/admin/EditableImage';
import ImageOrPlaceholder from './ImageOrPlaceholder';

type Props = {
  data: ProductPageData;
  locale: Locale;
  /** When provided, the header switches to inline-edit mode. */
  editor?: EditorApi;
};

// Lift up to 6 spec rows into the header summary. The labels admin can
// edit by editing the underlying spec table in the detail tab (or via
// /admin/text); the header just mirrors whatever's there.
const SUMMARY_KEYS = ['원단 구성', '중량', '컬러', '사이즈', '원산지', '인증'];

function pickSummarySpecs(rows: { label: string; value: string }[] | undefined) {
  if (!rows) return [];
  return SUMMARY_KEYS
    .map((k) => rows.find((r) => r.label.trim() === k))
    .filter((r): r is { label: string; value: string } => !!r)
    .slice(0, 5);
}

function stripTags(s: string | undefined | null): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim();
}

export default function ProductShopHeader({ data, locale, editor }: Props) {
  const galleryImages = useMemo(() => {
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
              {editor ? (
                <EditableImage
                  path="hero.image"
                  src={mainSrc}
                  alt={data.hero?.imageAlt ?? stripTags(data.name)}
                  className="psh-main-img-editable"
                  editor={editor}
                  fallback={
                    <div className="psh-main-empty">
                      <span>+ 메인 사진 추가</span>
                    </div>
                  }
                />
              ) : (
                <ImageOrPlaceholder
                  src={mainSrc}
                  alt={data.hero?.imageAlt ?? stripTags(data.name)}
                  className="psh-main-img"
                />
              )}
              {!editor && galleryImages.length > 1 ? (
                <div className="psh-count">
                  {active + 1} / {galleryImages.length}
                </div>
              ) : null}
            </div>
            {!editor && galleryImages.length > 1 ? (
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
            {editor ? (
              <p className="psh-edit-hint">
                💡 갤러리(아래 상품상세정보 안)에 사진 추가하면 썸네일이 자동으로 채워집니다.
              </p>
            ) : null}
          </div>

          {/* ── Right column: info + actions ────────────────────── */}
          <div className="psh-info">
            <div className="psh-brand">
              <span className="psh-brand-name">NJ SAFETY</span>
              <EditableText
                as="span"
                className="psh-model"
                path="model"
                value={data.model ?? ''}
                editor={editor}
              />
            </div>

            <EditableText
              as="div"
              className="psh-category"
              path="category"
              value={data.category ?? ''}
              editor={editor}
            />

            {editor ? (
              <EditableText
                as="h1"
                className="psh-name"
                path="name"
                value={stripTags(data.name)}
                editor={editor}
              />
            ) : (
              <h1
                className="psh-name"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.name ?? '') }}
              />
            )}

            <EditableText
              as="p"
              className="psh-subtitle"
              path="subtitle"
              value={data.subtitle ?? ''}
              editor={editor}
            />

            <EditableText
              as="p"
              className="psh-tagline"
              path="tagline"
              value={data.tagline ?? ''}
              editor={editor}
              multiline
            />

            {summary.length > 0 ? (
              <dl className="psh-summary">
                {summary.map((row) => {
                  const i = (data.spec?.rows ?? []).indexOf(row);
                  return (
                    <div key={row.label} className="psh-summary-row">
                      <dt>{row.label}</dt>
                      <dd>
                        {editor && i >= 0 ? (
                          <EditableText
                            as="span"
                            path={`spec.rows[${i}].value`}
                            value={row.value}
                            editor={editor}
                          />
                        ) : (
                          <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(row.value) }} />
                        )}
                      </dd>
                    </div>
                  );
                })}
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
