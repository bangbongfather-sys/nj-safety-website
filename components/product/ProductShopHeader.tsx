'use client';

/**
 * Product detail shop-style header.
 *
 * Lives at the top of every /[locale]/products/<slug>/ page, between the
 * standard site nav and the tabbed detail content. Mirrors the e-commerce
 * pattern customers are used to: main photo on the left with a thumbnail
 * grid + click-to-swap, product info on the right (brand line, model code,
 * name, tagline, key specs, action buttons).
 *
 * Data isolation:
 *   • All fields shown here come from `data.shopHeader` (a NEW field
 *     separate from data.hero / data.name / data.spec). Edits write
 *     ONLY to data.shopHeader, never to the catalog data underneath.
 *   • The catalog-app render inside the 상품상세정보 tab keeps reading
 *     data.hero / data.name / data.spec, so editing the shop header
 *     does NOT change the catalog hero photo, title, etc.
 *   • If `data.shopHeader` is missing on first edit, the editor calls
 *     `withShopHeaderDefaults` on load to seed it from the catalog
 *     values — the admin sees the existing photo and copy, then
 *     diverges from there.
 *
 * Multi-image support:
 *   • shopHeader.images is an array — first item is the main photo,
 *     rest are thumbnails. Click a thumbnail to swap the main.
 *   • In edit mode, each thumbnail has a delete button + there's a
 *     "+ 사진 추가" button at the end of the row that opens the
 *     ImageSlotPanel for the next index.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { sanitizeHtml } from '@/lib/sanitize';
import type { Locale } from '@/lib/i18n';
import type { ProductPageData } from '@/lib/product-page-types';
import { withShopHeaderDefaults } from '@/lib/product-page-types';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';
import ImageOrPlaceholder from './ImageOrPlaceholder';

type Props = {
  data: ProductPageData;
  locale: Locale;
  /** When provided, the header switches to inline-edit mode. */
  editor?: EditorApi;
};

function stripTags(s: string | undefined | null): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim();
}

export default function ProductShopHeader({ data, locale, editor }: Props) {
  // ALWAYS render through the defaults helper so the layout stays stable
  // whether the JSON has shopHeader or not. The editor route also calls
  // this once on load to bake the seed into the saved file.
  const head = useMemo(() => withShopHeaderDefaults(data).shopHeader!, [data]);
  const images = head.images ?? [];

  const [active, setActive] = useState(0);

  const summary = head.summarySpecs ?? [];
  const contactHref = `/${locale}/contact?product=${encodeURIComponent(data.slug ?? '')}`;

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = stripTags(head.name) || 'NJ SAFETY';
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

  const openImagePicker = (index: number) => {
    editor?.onImageClick?.(`shopHeader.images[${index}]`);
  };

  const removeImage = (index: number) => {
    if (!editor?.onImagePatch) return;
    if (!window.confirm('이 사진을 제거할까요?')) return;
    // We can't splice arrays via the editor API, but writing an empty
    // string at the index marks it for the renderer to skip. The actual
    // array shape stays the same in JSON; we filter on render.
    editor.onImagePatch(`shopHeader.images[${index}]`, '');
    if (active >= images.length - 1) setActive(0);
  };

  // Build a pair of arrays:
  //   • displayImages — the visible photos (deletions filtered out)
  //   • originalIndexes — same length, maps display index -> raw array
  //     index, so editor actions (delete / replace) write to the right
  //     path even after deletions left "holes" in the JSON.
  const displayImages: string[] = [];
  const originalIndexes: number[] = [];
  images.forEach((src, i) => {
    if (src) {
      displayImages.push(src);
      originalIndexes.push(i);
    }
  });
  const total = displayImages.length;
  const safeActive = total === 0 ? 0 : ((active % total) + total) % total;
  const displayMain = displayImages[safeActive] ?? '';
  const activeOriginalIndex = originalIndexes[safeActive] ?? 0;
  // Index for "+ 사진 추가": always the next slot AFTER all existing
  // entries (we keep the holes from deletions in place; new uploads go
  // to the end so we don't accidentally overwrite a kept image).
  const addIndex = images.length;

  const goPrev = () => setActive((a) => (total <= 1 ? 0 : (a - 1 + total) % total));
  const goNext = () => setActive((a) => (total <= 1 ? 0 : (a + 1) % total));

  return (
    <section className="psh">
      <div className="psh-wrap">
        <div className="psh-grid">
          {/* ── Left: main image + thumbnail strip ──────────────── */}
          <div className="psh-media">
            <div className="psh-main">
              <ImageOrPlaceholder
                src={displayMain}
                alt={stripTags(head.name)}
                className="psh-main-img"
                // Main product photo = LCP candidate on the detail page;
                // priority flips the underlying <img> to eager-load with
                // fetchpriority=high so the browser starts the request
                // before parsing the rest of the document.
                priority
              />
              {/* Prev / next arrows when there's more than one photo —
               * mirrors the homepage hero carousel pattern so visitors
               * recognise the affordance immediately. */}
              {total > 1 ? (
                <>
                  <button
                    type="button"
                    className="psh-nav psh-nav-prev"
                    onClick={goPrev}
                    aria-label="이전 사진"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="psh-nav psh-nav-next"
                    onClick={goNext}
                    aria-label="다음 사진"
                  >
                    ›
                  </button>
                </>
              ) : null}
              {total > 1 ? (
                <div className="psh-count">
                  {safeActive + 1} / {total}
                </div>
              ) : null}
              {editor ? (
                <button
                  type="button"
                  className="psh-main-edit"
                  onClick={() => openImagePicker(activeOriginalIndex)}
                  title="이 사진을 교체"
                >
                  🖼️ 사진 교체
                </button>
              ) : null}
            </div>

            {/* Thumbnails — multi-image in edit and public modes */}
            {(displayImages.length > 1 || editor) ? (
              <div className="psh-thumbs" role="tablist" aria-label="제품 사진">
                {displayImages.map((src, di) => {
                  const i = originalIndexes[di]; // raw JSON-array index for editor ops
                  return (
                    <div key={src + i} className="psh-thumb-wrap">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={di === safeActive}
                        className={`psh-thumb${di === safeActive ? ' is-on' : ''}`}
                        onClick={() => setActive(di)}
                        aria-label={`사진 ${di + 1}`}
                      >
                        <ImageOrPlaceholder src={src} alt="" />
                      </button>
                      {editor ? (
                        <button
                          type="button"
                          className="psh-thumb-del"
                          onClick={() => removeImage(i)}
                          aria-label="이 사진 제거"
                          title="이 사진 제거"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  );
                })}
                {editor ? (
                  <button
                    type="button"
                    className="psh-thumb-add"
                    onClick={() => openImagePicker(addIndex)}
                    title="새 사진 추가"
                  >
                    +<small>추가</small>
                  </button>
                ) : null}
              </div>
            ) : null}

            {editor ? (
              <p className="psh-edit-hint">
                💡 상단 사진/텍스트는 카탈로그 상세 내용과 완전히 분리되어 있어요. 자유롭게 수정해도 아래 상품상세정보는 변하지 않습니다.
              </p>
            ) : null}
          </div>

          {/* ── Right: info + actions ───────────────────────────── */}
          <div className="psh-info">
            <div className="psh-brand">
              <EditableText
                as="span"
                className="psh-brand-name"
                path="shopHeader.brand"
                value={head.brand ?? 'NJ SAFETY'}
                editor={editor}
              />
              <EditableText
                as="span"
                className="psh-model"
                path="shopHeader.model"
                value={head.model ?? ''}
                editor={editor}
              />
            </div>

            <EditableText
              as="div"
              className="psh-category"
              path="shopHeader.category"
              value={head.category ?? ''}
              editor={editor}
            />

            {editor ? (
              <EditableText
                as="h1"
                className="psh-name"
                path="shopHeader.name"
                value={stripTags(head.name)}
                editor={editor}
              />
            ) : (
              <h1
                className="psh-name"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(head.name ?? '') }}
              />
            )}

            <EditableText
              as="p"
              className="psh-subtitle"
              path="shopHeader.subtitle"
              value={head.subtitle ?? ''}
              editor={editor}
            />

            <EditableText
              as="p"
              className="psh-tagline"
              path="shopHeader.tagline"
              value={head.tagline ?? ''}
              editor={editor}
              multiline
            />

            {summary.length > 0 ? (
              <dl className="psh-summary">
                {summary.map((row, i) => (
                  <div key={row.label + i} className="psh-summary-row">
                    <dt>
                      {editor ? (
                        <EditableText
                          as="span"
                          path={`shopHeader.summarySpecs[${i}].label`}
                          value={row.label}
                          editor={editor}
                        />
                      ) : (
                        row.label
                      )}
                    </dt>
                    <dd>
                      {editor ? (
                        <EditableText
                          as="span"
                          path={`shopHeader.summarySpecs[${i}].value`}
                          value={row.value}
                          editor={editor}
                        />
                      ) : (
                        <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(row.value) }} />
                      )}
                    </dd>
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
              {(head.contactInfo ?? []).map((row, i) => (
                <li key={row.label + i}>
                  {editor ? (
                    <EditableText
                      as="strong"
                      path={`shopHeader.contactInfo[${i}].label`}
                      value={row.label}
                      editor={editor}
                    />
                  ) : (
                    <strong>{row.label}</strong>
                  )}
                  {' '}
                  {editor ? (
                    <EditableText
                      as="span"
                      path={`shopHeader.contactInfo[${i}].value`}
                      value={row.value}
                      editor={editor}
                    />
                  ) : (
                    <span>{row.value}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
