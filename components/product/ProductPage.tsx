/**
 * NJ Safety — Product Page renderer (public).
 *
 * E-commerce-style shop header (image gallery on the left + product info
 * on the right) followed by tabs containing the rich catalog-app content
 * (gallery, material, features, spec table, etc). The site nav + footer
 * stay visible above and below; this component renders only what's
 * between them.
 *
 * Tab layout:
 *   1. 상품상세정보 — Gallery · Statement · Material · Features · Spec · Field
 *   2. 인증 · 관리   — Care · Certs
 *   3. 발주 안내    — Order
 *
 * Headlines and other rich strings accept inline `<em>...</em>` /
 * `<span style="color:...">` etc. and are rendered via dangerouslySetInnerHTML
 * after a minimal sanitize pass — content originates in JSON we control.
 */

import type { HTMLAttributes } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import type {
  FieldStyle,
  HeroBadge,
  ProductPageData,
  ProductHero,
  ProductGallery,
  ProductStatement,
  ProductMaterial,
  ProductFeatures,
  ProductSpec,
  ProductField,
  ProductCare,
  ProductCert,
  ProductOrder,
} from '@/lib/product-page-types';
import { fontStackFor } from '@/lib/product-page-types';
import type { Locale } from '@/lib/i18n';
import type { EditorApi } from '@/components/admin/EditableText';
import ImageOrPlaceholder from './ImageOrPlaceholder';
import ProductShopHeader from './ProductShopHeader';
import ProductDetailTabs, { type ProductTab } from './ProductDetailTabs';
import ProductBasicInfoTab from './ProductBasicInfoTab';
import ProductTestReportsTab from './ProductTestReportsTab';
import './product-page.css';

// Common rich-text host: marks the element with data-fp so StyleInjector
// can target per-field styles, and injects HTML safely.
function richProps(
  path: string,
  html: string | undefined | null,
): HTMLAttributes<HTMLElement> & {
  'data-fp'?: string;
  dangerouslySetInnerHTML?: { __html: string };
} {
  return {
    'data-fp': path,
    dangerouslySetInnerHTML: { __html: sanitizeHtml(html ?? '') },
  };
}

/**
 * Emits a scoped <style> block applying per-field font/color/size overrides
 * via [data-fp="..."] selectors. Scoped to .nj-page so rules can't leak.
 */
function StyleInjector({ styles }: { styles?: Record<string, FieldStyle> }) {
  if (!styles) return null;
  const rules: string[] = [];
  for (const [path, fs] of Object.entries(styles)) {
    if (!fs) continue;
    const fontStack = fs.font ? fontStackFor(fs.font) : undefined;
    const decls: string[] = [];
    if (fontStack) decls.push(`font-family: ${fontStack}`);
    if (fs.color) decls.push(`color: ${fs.color}`);
    if (fs.size) decls.push(`font-size: ${fs.size}`);
    if (fs.weight) decls.push(`font-weight: ${fs.weight}`);
    if (fs.align) decls.push(`text-align: ${fs.align}`);
    if (fs.background) decls.push(`background: ${fs.background}`);
    if (fs.width) {
      decls.push(`display: inline-block`);
      decls.push(`width: ${fs.width}`);
      decls.push(`max-width: 100%`);
    }
    if (!decls.length) continue;
    const safePath = path.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    rules.push(`.nj-page [data-fp="${safePath}"] { ${decls.join('; ')} }`);
  }
  if (!rules.length) return null;
  return <style dangerouslySetInnerHTML={{ __html: rules.join('\n') }} />;
}

// ─── Hero (catalog-app original) ────────────────────────────────────
// Restored inside the 상품상세정보 tab so the catalog-app render still
// arrives "as a whole" — the new shop header at the very top is a
// separate B2B-style summary; the original cinematic hero with the
// big two-line title + counters + badged image still lives in here.
function resolveBadges(hero: ProductHero): HeroBadge[] {
  if (hero.badges && hero.badges.length) return hero.badges;
  const synth: HeroBadge[] = [];
  if (hero.tag) synth.push({ text: hero.tag, position: 'bottom-left', style: 'tag' });
  if (hero.corner) synth.push({ text: hero.corner, position: 'top-right', style: 'corner' });
  if (hero.badge) synth.push({ text: hero.badge, position: 'top-right', style: 'stamp' });
  return synth;
}

function Hero({ data }: { data: ProductPageData }) {
  const hero: ProductHero = data.hero ?? {};
  const counters = hero.counters ?? [];
  const rawName = data.name ?? '';
  const nameHasHtml = /[<&]/.test(rawName);
  const titleWords = nameHasHtml ? [] : rawName.split(/\s+/).filter(Boolean);

  return (
    <section className="hero">
      <div className="hero-left">
        <div className="eyebrow">
          <span className="bar" />
          <span {...richProps('category', data.category ?? '')} />
        </div>
        {nameHasHtml ? (
          <h1 className="hero-title">
            <span className="line" {...richProps('name', rawName)} />
          </h1>
        ) : (
          <h1 className="hero-title">
            {titleWords.map((w, i) => (
              <span key={i} className={'line' + (i === 1 ? ' line-orange' : '')}>
                {w}
              </span>
            ))}
          </h1>
        )}
        <p
          className="hero-lead"
          {...richProps('tagline', data.tagline ?? data.subtitle ?? '')}
        />
        {counters.length > 0 ? (
          <div className="hero-counters">
            {counters.map((c, i) => (
              <div key={i}>
                <span className="c-num">
                  <span {...richProps(`hero.counters[${i}].value`, c.value)} />
                  {c.unit ? <small {...richProps(`hero.counters[${i}].unit`, c.unit)} /> : null}
                </span>
                <span className="c-lbl" {...richProps(`hero.counters[${i}].label`, c.label)} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="hero-image">
        <ImageOrPlaceholder
          src={hero.image}
          alt={hero.imageAlt ?? data.name ?? ''}
        />
        {resolveBadges(hero).map((b, i) => {
          const style = b.style ?? 'stamp';
          const position = b.position ?? 'top-right';
          return (
            <div
              key={i}
              className={`hero-badge hero-badge-${position} hero-badge-style-${style}`}
              {...richProps(`hero.badges[${i}].text`, b.text ?? '')}
            />
          );
        })}
      </div>
    </section>
  );
}

// ─── Gallery ────────────────────────────────────────────────────────
function Gallery({ gallery }: { gallery?: ProductGallery }) {
  if (!gallery?.items?.length) return null;
  return (
    <section className="section gallery-section" id="gallery">
      <div className="wrap">
        <div className="gallery-head">
          <div className="eyebrow eyebrow-mute">
            <span className="bar" />
            <span {...richProps('gallery.eyebrow', gallery.eyebrow ?? 'PRODUCT VIEWS')} />
          </div>
          {gallery.headline ? (
            <h2 className="section-h gallery-h" {...richProps('gallery.headline', gallery.headline)} />
          ) : null}
          {gallery.note ? (
            <p className="gallery-note" {...richProps('gallery.note', gallery.note)} />
          ) : null}
        </div>
        <div className="gallery-grid">
          {gallery.items.map((it, i) => {
            const span = it.span ?? 'm';
            const idxStr = String(i + 1).padStart(2, '0');
            return (
              <figure key={i} className={`gimg gimg-${span}${it.image ? '' : ' empty'}`}>
                <div className="gimg-frame">
                  <div className="pp-img-slot">
                    {it.image ? (
                      <ImageOrPlaceholder src={it.image} alt={it.label ?? ''} />
                    ) : (
                      <div className="gimg-ph">
                        <span className="gimg-ph-tag">IMAGE&nbsp;SLOT</span>
                        <span className="gimg-ph-label" {...richProps(`gallery.items[${i}].label`, it.label ?? '')} />
                      </div>
                    )}
                  </div>
                  <span className="gimg-corner">{idxStr}</span>
                </div>
                <figcaption className="gimg-cap">
                  <span className="gimg-tag" {...richProps(`gallery.items[${i}].tag`, it.tag ?? `VIEW ${idxStr}`)} />
                  <span className="gimg-label" {...richProps(`gallery.items[${i}].label`, it.label ?? '')} />
                  {it.caption ? (
                    <span className="gimg-desc" {...richProps(`gallery.items[${i}].caption`, it.caption)} />
                  ) : null}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Statement ──────────────────────────────────────────────────────
function Statement({ statement }: { statement?: ProductStatement }) {
  if (!statement) return null;
  return (
    <section className="section dark" id="statement">
      <div className="wrap">
        <div className="eyebrow eyebrow-light">
          <span className="bar" />
          <span {...richProps('statement.eyebrow', statement.eyebrow ?? '')} />
        </div>
        <h2 className="statement-h" {...richProps('statement.headline', statement.headline ?? '')} />
        <p className="statement-body" {...richProps('statement.body', statement.body ?? '')} />
        {statement.sign ? (
          <div className="statement-sign">
            <span>—</span>
            <span {...richProps('statement.sign', statement.sign)} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ─── Material ───────────────────────────────────────────────────────
function Material({ material }: { material?: ProductMaterial }) {
  if (!material) return null;
  const callouts = material.callouts ?? [];
  return (
    <section className="section" id="material">
      <div className="wrap">
        <div className="eyebrow eyebrow-mute">
          <span className="bar" />
          <span {...richProps('material.eyebrow', material.eyebrow ?? '')} />
        </div>
        <div className="material-row" style={{ marginTop: 24 }}>
          <div className="material-text">
            <h2 className="section-h" {...richProps('material.headline', material.headline ?? '')} />
            <div className="mat-list">
              {callouts.map((c, i) => {
                const tag = c.tag ?? String.fromCharCode(65 + i);
                return (
                  <div key={i} className="mat-item">
                    <span className="mat-num">{tag}.</span>
                    <div>
                      <strong {...richProps(`material.callouts[${i}].title`, c.title ?? '')} />
                      <small {...richProps(`material.callouts[${i}].body`, c.body ?? '')} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="material-img">
            <ImageOrPlaceholder src={material.image} alt="" />
            {callouts.map((c, i) => {
              const tag = c.tag ?? String.fromCharCode(65 + i);
              return (
                <span key={i} className={`img-tagger tag-${tag.toLowerCase()}`}>
                  {tag}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features ───────────────────────────────────────────────────────
function Features({ features }: { features?: ProductFeatures }) {
  if (!features?.items) return null;
  return (
    <section className="section" id="features">
      <div className="wrap">
        <div className="eyebrow eyebrow-mute">
          <span className="bar" />
          <span {...richProps('features.eyebrow', features.eyebrow ?? '')} />
        </div>
        <h2
          className="section-h feat-h"
          style={{ paddingTop: 22 }}
          {...richProps('features.headline', features.headline ?? '')}
        />
        <div className="features">
          {features.items.map((it, i) => (
            <div key={i} className={'feat' + (it.featured ? ' feat-big' : '')}>
              <div className="feat-num" {...richProps(`features.items[${i}].n`, it.n ?? '')} />
              <div className="feat-t" {...richProps(`features.items[${i}].title`, it.title ?? '')} />
              <p className="feat-b" {...richProps(`features.items[${i}].body`, it.body ?? '')} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Spec ───────────────────────────────────────────────────────────
function Spec({ spec, model }: { spec?: ProductSpec; model?: string }) {
  if (!spec) return null;
  return (
    <section className="section dark" id="spec">
      <div className="wrap">
        <div className="eyebrow eyebrow-light">
          <span className="bar" />
          <span {...richProps('spec.eyebrow', spec.eyebrow ?? '')} />
        </div>
        <div className="spec-row" style={{ marginTop: 24 }}>
          <div className="spec-headline">
            <h2 className="section-h" {...richProps('spec.headline', spec.headline ?? '')} />
            {model ? (
              <div className="model-card">
                <div className="model-l">MODEL</div>
                <div className="model-v" {...richProps('model', model)} />
              </div>
            ) : null}
          </div>
          <div className="spec-table">
            {(spec.rows ?? []).map((r, i) => (
              <div key={i} className="spec-r">
                <span className="spec-l" {...richProps(`spec.rows[${i}].label`, r.label)} />
                <span className="spec-dots" />
                <span className="spec-v" {...richProps(`spec.rows[${i}].value`, r.value)} />
              </div>
            ))}
          </div>
        </div>
        {spec.sizeTable ? (
          <div className="size-block">
            <div className="size-h">
              <span
                className="bar"
                style={{ width: 18, height: 3, background: 'var(--orange)', display: 'inline-block' }}
              />
              <span>
                SIZE&nbsp;GUIDE&nbsp;·&nbsp;
                <span {...richProps('spec.sizeTable.unit', spec.sizeTable.unit ?? 'cm')} />
              </span>
            </div>
            <table className="size-table">
              <thead>
                <tr>
                  {(spec.sizeTable.headers ?? []).map((t, i) => (
                    <th key={i} {...richProps(`spec.sizeTable.headers[${i}]`, t)} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {(spec.sizeTable.rows ?? []).map((row, i) => (
                  <tr key={i}>
                    {row.map((c, j) => (
                      <td key={j} {...richProps(`spec.sizeTable.rows[${i}][${j}]`, c)} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ─── Field ──────────────────────────────────────────────────────────
function Field({ field }: { field?: ProductField }) {
  if (!field?.items) return null;
  return (
    <section className="section" id="field">
      <div className="wrap">
        <div className="eyebrow eyebrow-mute">
          <span className="bar" />
          <span {...richProps('field.eyebrow', field.eyebrow ?? '')} />
        </div>
        <h2
          className="section-h field-h"
          style={{ paddingTop: 22 }}
          {...richProps('field.headline', field.headline ?? '')}
        />
        <div className="field-list">
          {field.items.map((it, i) => (
            <div key={i} className="field-row">
              <span className="field-n" {...richProps(`field.items[${i}].n`, it.n ?? '')} />
              <div className="field-tag">
                <span className="bar" />
                <span {...richProps(`field.items[${i}].tag`, it.tag ?? '')} />
              </div>
              <div className="field-t" {...richProps(`field.items[${i}].title`, it.title ?? '')} />
              <p className="field-b" {...richProps(`field.items[${i}].body`, it.body ?? '')} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Care + Cert ────────────────────────────────────────────────────
function CareCert({ care, certs }: { care?: ProductCare; certs?: ProductCert[] }) {
  if (!care && !certs?.length) return null;
  return (
    <section className="section" id="care">
      <div className="wrap">
        <div className="eyebrow eyebrow-mute">
          <span className="bar" />
          <span {...richProps('care.eyebrow', care?.eyebrow ?? 'CARE & CERT')} />
        </div>
        <div className="care-row" style={{ marginTop: 32 }}>
          {care ? (
            <div>
              <h3 className="care-h">관리</h3>
              <div className="care-list">
                {(care.items ?? []).map((it, i) => (
                  <div key={i} className="care-item">
                    <span
                      className={'care-icon' + (it.warn ? ' warn' : '')}
                      {...richProps(`care.items[${i}].icon`, it.icon ?? '')}
                    />
                    <div>
                      <strong {...richProps(`care.items[${i}].title`, it.title ?? '')} />
                      <small {...richProps(`care.items[${i}].body`, it.body ?? '')} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {certs?.length ? (
            <div>
              <h3 className="care-h">인증</h3>
              <div className="cert-list">
                {certs.map((cert, i) => (
                  <div key={i} className="cert">
                    <div
                      className={'cert-mark' + (cert.highlight ? ' highlight' : '')}
                      {...richProps(`certs[${i}].mark`, cert.mark ?? '')}
                    />
                    <div>
                      <strong {...richProps(`certs[${i}].title`, cert.title ?? '')} />
                      <small {...richProps(`certs[${i}].sub`, cert.sub ?? '')} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

// ─── Order ──────────────────────────────────────────────────────────
function Order({ order }: { order?: ProductOrder }) {
  if (!order) return null;
  return (
    <section className="section orange" id="order">
      <div className="wrap">
        <div className="order-top">
          <span className="square-dark" />
          <span>TO&nbsp;ORDER</span>
        </div>
        <h2 className="order-h" {...richProps('order.headline', order.headline ?? '')} />
        <div className="order-grid">
          {(order.cells ?? []).map((cell, i) => (
            <div key={i} className="order-cell">
              <div className="order-l" {...richProps(`order.cells[${i}].label`, cell.label ?? '')} />
              <div className="order-v" {...richProps(`order.cells[${i}].value`, cell.value ?? '')} />
              <p {...richProps(`order.cells[${i}].body`, cell.body ?? '')} />
            </div>
          ))}
        </div>
        {order.contact?.length ? (
          <div className="contact-block">
            {order.contact.map((c, i) => (
              <div key={i} className="contact-row">
                <span className="contact-l" {...richProps(`order.contact[${i}].label`, c.label ?? '')} />
                <span className="contact-v" {...richProps(`order.contact[${i}].value`, c.value ?? '')} />
              </div>
            ))}
          </div>
        ) : null}
        <div className="order-signoff">
          {/* Vector signoff (replaces /brand/enterprise.png — the
            * bitmap rasterised badly at 80px height, producing jagged
            * orange stripes on the N badge). SVG keeps the N-badge
            * stripes + wordmark crisp at any display size.
            *
            * Plain <img>, NOT ImageOrPlaceholder — ImageOrPlaceholder
            * rewrites `/brand/*` to the catalog-app domain, but this
            * SVG lives in THIS site's public/ so the rewrite would
            * 404. The image is also small (under 2 KB) so it doesn't
            * need the lazy/placeholder treatment. */}
          <img
            src="/brand/enterprise.svg"
            alt="NJ ENTERPRISE · 나정엔터프라이즈"
            className="order-signoff-logo"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

// ─── Top-level page ─────────────────────────────────────────────────
export default function ProductPage({
  data,
  locale,
  editor,
  pat,
  onAfterPdfUpload,
}: {
  data: ProductPageData;
  locale: Locale;
  /** When provided, the shop header + tabs switch to inline-edit mode. */
  editor?: EditorApi;
  /** GitHub PAT — required only by the 시험성적서 tab so it can PUT
   *  PDFs through the upload Worker. */
  pat?: string;
  /** Mirror image upload behaviour: parent flushes the dict immediately
   *  after a PDF lands so the rebuild starts now. */
  onAfterPdfUpload?: () => void;
}) {
  // `flavor` on the wrapper picks the visual treatment. CSS rules for the
  // two non-default flavors live in product-page.css under
  // .nj-page.nj-page-flagship (kraft hangtag) and
  // .nj-page.nj-page-tactical (black + yellow accent).
  const flavorClass =
    data.flavor === 'flagship'
      ? ' nj-page-flagship'
      : data.flavor === 'tactical'
        ? ' nj-page-tactical'
        : '';

  // Three tabs:
  //   1. 상품상세정보 — the full catalog-app render, scrolls top-to-bottom
  //   2. 기본정보     — regulator-style brand / origin / 제품정보제공고시 table
  //   3. 시험성적서   — list of PDF reports uploaded to R2
  const detailContent = (
    <>
      <Hero data={data} />
      <Gallery gallery={data.gallery} />
      <Statement statement={data.statement} />
      <Material material={data.material} />
      <Features features={data.features} />
      <Spec spec={data.spec} model={data.model} />
      <Field field={data.field} />
      <CareCert care={data.care} certs={data.certs} />
      <Order order={data.order} />
    </>
  );
  const tabs: ProductTab[] = [
    {
      key: 'detail',
      label: '상품상세정보',
      content: detailContent,
    },
    {
      key: 'basic',
      label: '기본정보',
      content: <ProductBasicInfoTab data={data} editor={editor} />,
    },
    {
      key: 'reports',
      label: '시험성적서',
      content: (
        <ProductTestReportsTab
          data={data}
          editor={editor}
          pat={pat}
          slug={data.slug ?? ''}
          onAfterUpload={onAfterPdfUpload}
        />
      ),
    },
  ];

  return (
    <div className={`nj-page${flavorClass}`}>
      <StyleInjector styles={data.styles} />
      <ProductShopHeader data={data} locale={locale} editor={editor} />
      <ProductDetailTabs tabs={tabs} />
    </div>
  );
}
