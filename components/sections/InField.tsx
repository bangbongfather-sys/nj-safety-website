'use client';

/**
 * In-the-Field + Clients/Partners section.
 *
 * Sits on the homepage in the slot previously held by Certifications
 * (which moved exclusively to /certifications + /resources so the
 * homepage doesn't duplicate it). The brief: show where NJ SAFETY
 * gear is actually deployed and the kinds of organisations buying it.
 *
 * Layout:
 *   ┌──── Editorial header (eyebrow + headline + sub) ────┐
 *   │                                                       │
 *   │ ┌──────── Photo (1.4fr) ───┐ ┌── Sectors (1fr) ────┐ │
 *   │ │  worker on site / cap.  │ │  4 industry rows    │ │
 *   │ │                         │ │  (label + clients)  │ │
 *   │ └─────────────────────────┘ └─────────────────────┘ │
 *   └───────────────────────────────────────────────────────┘
 *
 * Photo source defaults to the existing showcase background — the
 * admin can swap it via EditableImage on `home.field.photoSrc`.
 * Sector entries are fully inline-editable too.
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
  sectorsHead?: string;
  sectorsSub?: string;
  sectors?: Sector[];
};

export default function InField({ dict, editor }: Props) {
  const f: FieldDict = ((dict as unknown as { home?: { field?: FieldDict } }).home?.field) ?? {};
  const sectors = Array.isArray(f.sectors) ? f.sectors : [];

  return (
    <section className="infield" id="in-the-field" data-screen-label="In the Field">
      <div className="wrap">
        {/* Editorial header — eyebrow + headline + sub */}
        <header className="infield-head">
          <EditableText
            as="span"
            className="eyebrow"
            path="home.field.eyebrow"
            value={f.eyebrow ?? '— IN THE FIELD'}
            editor={editor}
          />
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
        </header>

        {/* Photo + sectors grid */}
        <div className="infield-grid">
          <div className="infield-photo-wrap">
            <EditableImage
              path="home.field.photoSrc"
              src={f.photoSrc}
              alt="현장 작업 사진"
              className="infield-photo"
              editor={editor}
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

          <div className="infield-sectors">
            <div className="infield-sectors-head">
              <EditableText
                as="h3"
                className="infield-sectors-h"
                path="home.field.sectorsHead"
                value={f.sectorsHead ?? '고객사 · 파트너사'}
                editor={editor}
              />
              <EditableText
                as="p"
                className="infield-sectors-sub"
                path="home.field.sectorsSub"
                value={f.sectorsSub ?? ''}
                editor={editor}
                multiline
              />
            </div>
            <ul className="infield-sector-list">
              {sectors.map((s, i) => (
                <li key={s.id || i} className="infield-sector">
                  <EditableText
                    as="div"
                    className="infield-sector-label"
                    path={`home.field.sectors[${i}].label`}
                    value={s.label ?? ''}
                    editor={editor}
                  />
                  <EditableText
                    as="div"
                    className="infield-sector-items"
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
