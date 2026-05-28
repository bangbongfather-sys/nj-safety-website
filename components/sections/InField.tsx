'use client';

/**
 * In-the-Field + Clients/Partners section.
 *
 * Full-bleed editorial hero: the field photo fills the whole section
 * behind everything, and all the editorial copy + the partners list
 * sit on top as an overlay. A dark gradient on the left half (where
 * the text lives) keeps the copy legible regardless of what the
 * photo shows.
 *
 * Mobile collapses the two-column overlay into a single stack and
 * shortens the photo to a portrait aspect so the text still fits.
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
      {/* Photo fills the whole section. EditableImage handles the
       * upload UX when an admin editor is present; in read mode it
       * renders a plain <img>. */}
      <div className="infield-bg" aria-hidden>
        <EditableImage
          path="home.field.photoSrc"
          src={f.photoSrc}
          alt=""
          className="infield-bg-img"
          editor={editor}
        />
      </div>

      {/* Dark gradient overlay — strong on the left where the text
       * is, fading to 30 % on the right so the photo still breathes.
       * pointer-events: none so the photo's EditableImage stays
       * clickable underneath. */}
      <div className="infield-scrim" aria-hidden />

      {/* Content overlay — every editable surface lives here. */}
      <div className="infield-content">
        <div className="wrap">
          <div className="infield-grid">
            {/* Editorial column (left) */}
            <div className="infield-editorial">
              <EditableText
                as="span"
                className="eyebrow infield-eyebrow"
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

            {/* Sectors column (right) */}
            <div className="infield-sectors">
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
      </div>
    </section>
  );
}
