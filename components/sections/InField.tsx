'use client';

/**
 * In-the-Field + Clients/Partners section.
 *
 * Full-bleed editorial hero with three vertical bands:
 *
 *   ┌─ TOP META ───── eyebrow ······· EST. 1992 ─── 2026 ─┐
 *   │                                                       │
 *   │  HEADLINE                                             │
 *   │  현장에서 매일,                                         │
 *   │  가장 가혹한 자리에서.                                   │
 *   │                                                       │
 *   │  sub paragraph                                        │
 *   │                                                       │
 *   │                                                       │
 *   │                                                       │
 *   │  ──────────────────────────────────────────           │
 *   │  — TRUSTED ACROSS INDUSTRIES                          │
 *   │  ┌──────┬──────┬──────┬──────┐                         │
 *   │  │ 01/04│ 02/04│ 03/04│ 04/04│  big mono numbers       │
 *   │  │ 전력 │ 전기 │ 정유 │ 에너지│  label                  │
 *   │  │ 한전 │ 고압 │ 여수 │ 한국 │  partner notes          │
 *   │  └──────┴──────┴──────┴──────┘                         │
 *   └───────────────────────────────────────────────────────┘
 *
 * Photo fills the section as a full-bleed background. A dark
 * gradient scrim keeps every text strip legible regardless of
 * what the underlying photo shows.
 */

import type { Dictionary } from '@/lib/i18n';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';
import EditableImage from '@/components/admin/EditableImage';

type Props = { dict: Dictionary; editor?: EditorApi };

type Sector = { id: string; label: string; items: string };
type FieldDict = {
  eyebrow?: string;
  headlinePre?: string;
  headlineEm?: string;
  headlineSuf?: string;
  sub?: string;
  photoSrc?: string;
  photoCaption?: string;
  heritageMeta?: string;
  bandLabel?: string;
  sectors?: Sector[];
};

export default function InField({ dict, editor }: Props) {
  const f: FieldDict = ((dict as unknown as { home?: { field?: FieldDict } }).home?.field) ?? {};
  const sectors = Array.isArray(f.sectors) ? f.sectors : [];
  const totalSectors = String(sectors.length).padStart(2, '0');

  return (
    <section className="infield" id="in-the-field" data-screen-label="In the Field">
      {/* Full-bleed photo */}
      <div className="infield-bg" aria-hidden>
        <EditableImage
          path="home.field.photoSrc"
          src={f.photoSrc}
          alt=""
          className="infield-bg-img"
          editor={editor}
        />
      </div>

      {/* Dark gradient scrim */}
      <div className="infield-scrim" aria-hidden />

      {/* Admin-only floating edit handle. The EditableImage inside
       * .infield-bg has its own "🖼️ 사진 교체" button, but the full-
       * bleed scrim + text overlay sit on top of it and cover both
       * the button's pixels AND its clicks. This dedicated button
       * lives on the same z-layer as the content so the operator
       * can always reach it from the top-right corner. */}
      {editor?.onImageClick ? (
        <button
          type="button"
          /* Inherits styling from .ed-img-btn (the EditableImage
           * default affordance used everywhere else in admin), so
           * this button matches the other "🖼️ 사진 교체" pills
           * across the site. .infield-edit-photo only overrides the
           * positioning + z-index needed to clear the scrim and
           * content overlay. */
          className="ed-img-btn ed-img-btn-replace infield-edit-photo"
          onClick={(e) => {
            e.stopPropagation();
            editor.onImageClick?.('home.field.photoSrc');
          }}
          title="배경 사진 교체"
        >
          🖼️ 사진 교체
        </button>
      ) : null}

      <div className="infield-content">
        <div className="wrap">
          {/* ── TOP META — eyebrow + heritage strip ─────────────── */}
          <div className="infield-meta-row">
            <EditableText
              as="span"
              className="infield-eyebrow"
              path="home.field.eyebrow"
              value={f.eyebrow ?? '— IN THE FIELD'}
              editor={editor}
            />
            <EditableText
              as="span"
              className="infield-heritage"
              path="home.field.heritageMeta"
              value={f.heritageMeta ?? 'EST. 1992 ─── 2026'}
              editor={editor}
            />
          </div>

          {/* ── HEADLINE BAND ──────────────────────────────────── */}
          <div className="infield-hero">
            <h2 className="infield-h">
              <EditableText
                path="home.field.headlinePre"
                value={f.headlinePre ?? ''}
                editor={editor}
              />
              <br />
              <em>
                <EditableText
                  path="home.field.headlineEm"
                  value={f.headlineEm ?? ''}
                  editor={editor}
                />
              </em>
              <EditableText
                path="home.field.headlineSuf"
                value={f.headlineSuf ?? ''}
                editor={editor}
              />
            </h2>
            <EditableText
              as="p"
              className="infield-sub"
              path="home.field.sub"
              value={f.sub ?? ''}
              editor={editor}
              multiline
            />
            {f.photoCaption ? (
              <EditableText
                as="div"
                className="infield-photo-cap"
                path="home.field.photoCaption"
                value={f.photoCaption}
                editor={editor}
              />
            ) : null}
          </div>

          {/* ── BOTTOM BAND — TRUSTED ACROSS INDUSTRIES ─────────── */}
          <div className="infield-band">
            <div className="infield-band-rule" aria-hidden />
            <EditableText
              as="span"
              className="infield-band-label"
              path="home.field.bandLabel"
              value={f.bandLabel ?? '— TRUSTED ACROSS INDUSTRIES'}
              editor={editor}
            />
            <ul className="infield-band-grid">
              {sectors.map((s, i) => (
                <li key={s.id || i} className="infield-band-cell">
                  <span className="infield-band-num">
                    {String(i + 1).padStart(2, '0')}
                    <span className="infield-band-num-total"> / {totalSectors}</span>
                  </span>
                  <EditableText
                    as="div"
                    className="infield-band-cell-label"
                    path={`home.field.sectors[${i}].label`}
                    value={s.label ?? ''}
                    editor={editor}
                  />
                  <EditableText
                    as="div"
                    className="infield-band-cell-items"
                    path={`home.field.sectors[${i}].items`}
                    value={s.items ?? ''}
                    editor={editor}
                    multiline
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
