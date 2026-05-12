import RichText from './RichText';
import ImageOrPlaceholder from './ImageOrPlaceholder';
import type {
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
} from '@/lib/products';

/* ---------- Hero ---------- */
export function HeroSection({
  hero,
  name,
  category,
  subtitle,
  tagline,
}: {
  hero?: ProductHero;
  name?: string;
  category?: string;
  subtitle?: string;
  tagline?: string;
}) {
  return (
    <section className="pd-hero">
      <div className="pd-hero-media">
        <ImageOrPlaceholder src={hero?.image} alt={hero?.imageAlt ?? name} />
        {(hero?.badges ?? []).map((b, i) => (
          <span key={i} className={`pd-hero-badge pd-badge-${b.position ?? 'top-left'}`}>
            {b.text}
          </span>
        ))}
      </div>
      <div className="pd-hero-info">
        {category ? <span className="pd-eyebrow">{category}</span> : null}
        <RichText as="h1" className="pd-name" html={name} />
        {subtitle ? <p className="pd-subtitle">{subtitle}</p> : null}
        {tagline ? <p className="pd-tagline">{tagline}</p> : null}
        {(hero?.counters ?? []).length > 0 ? (
          <div className="pd-counters">
            {hero?.counters?.map((c, i) => (
              <div className="pd-counter-cell" key={i}>
                <div className="pd-counter-val">
                  <span>{c.value}</span>
                  {c.unit ? <sub>{c.unit}</sub> : null}
                </div>
                <div className="pd-counter-lbl">{c.label}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ---------- Gallery ---------- */
export function GallerySection({ gallery }: { gallery?: ProductGallery }) {
  if (!gallery || !gallery.items || gallery.items.length === 0) return null;
  return (
    <section className="pd-section pd-gallery">
      <div className="pd-section-head">
        {gallery.eyebrow ? <span className="pd-eyebrow">{gallery.eyebrow}</span> : null}
        <RichText as="h3" html={gallery.headline} />
        {gallery.note ? <p className="pd-note">{gallery.note}</p> : null}
      </div>
      <div className="pd-gallery-grid">
        {gallery.items.map((it, i) => (
          <figure key={i} className={`pd-gallery-item pd-span-${it.span ?? 'l'}`}>
            <ImageOrPlaceholder src={it.image} alt={it.label} />
            <figcaption>
              {it.tag ? <span className="pd-fig-tag">{it.tag}</span> : null}
              {it.label ? <span className="pd-fig-label">{it.label}</span> : null}
              {it.caption ? <span className="pd-fig-caption">{it.caption}</span> : null}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/* ---------- Statement ---------- */
export function StatementSection({ statement }: { statement?: ProductStatement }) {
  if (!statement) return null;
  return (
    <section className="pd-section pd-statement">
      {statement.eyebrow ? <span className="pd-eyebrow">{statement.eyebrow}</span> : null}
      <RichText as="h3" className="pd-statement-headline" html={statement.headline} />
      {statement.body ? <p className="pd-statement-body">{statement.body}</p> : null}
      {statement.sign ? <div className="pd-sign">— {statement.sign}</div> : null}
    </section>
  );
}

/* ---------- Material ---------- */
export function MaterialSection({ material }: { material?: ProductMaterial }) {
  if (!material) return null;
  return (
    <section className="pd-section pd-material">
      <div className="pd-section-head">
        {material.eyebrow ? <span className="pd-eyebrow">{material.eyebrow}</span> : null}
        <RichText as="h3" html={material.headline} />
      </div>
      <div className="pd-material-grid">
        <div className="pd-material-media">
          <ImageOrPlaceholder src={material.image} alt={material.headline?.replace(/<[^>]+>/g, '')} />
        </div>
        <div className="pd-material-callouts">
          {(material.callouts ?? []).map((c, i) => (
            <div className="pd-callout" key={i}>
              <div className="pd-callout-tag">{c.tag}</div>
              <div className="pd-callout-body">
                <RichText as="h4" html={c.title} />
                <RichText as="p" html={c.body} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Features ---------- */
export function FeaturesSection({ features }: { features?: ProductFeatures }) {
  if (!features || !features.items || features.items.length === 0) return null;
  return (
    <section className="pd-section pd-features">
      <div className="pd-section-head">
        {features.eyebrow ? <span className="pd-eyebrow">{features.eyebrow}</span> : null}
        <RichText as="h3" html={features.headline} />
      </div>
      <div className="pd-features-grid">
        {features.items.map((f, i) => (
          <div key={i} className={`pd-feature${f.featured ? ' is-featured' : ''}`}>
            {f.n ? <span className="pd-feature-n">{f.n}</span> : null}
            {f.title ? <h4>{f.title}</h4> : null}
            {f.body ? <p>{f.body}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Spec ---------- */
export function SpecSection({ spec }: { spec?: ProductSpec }) {
  if (!spec) return null;
  const rows = spec.rows ?? [];
  const st = spec.sizeTable;
  if (rows.length === 0 && !st) return null;
  return (
    <section className="pd-section pd-spec">
      <div className="pd-section-head">
        {spec.eyebrow ? <span className="pd-eyebrow">{spec.eyebrow}</span> : null}
        <RichText as="h3" html={spec.headline} />
      </div>
      <div className="pd-spec-grid">
        {rows.length > 0 ? (
          <div className="pd-spec-rows">
            {rows.map((r, i) => (
              <div className="pd-spec-row" key={i}>
                <span className="pd-spec-k">{r.label}</span>
                <span className="pd-spec-v">{r.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div />
        )}
        {st && st.rows && st.rows.length > 0 ? (
          <div className="pd-sizetable">
            <div className="pd-sizetable-unit">단위 · {st.unit ?? 'cm'}</div>
            <table>
              <thead>
                <tr>
                  {(st.headers ?? []).map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {st.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
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

/* ---------- Field ---------- */
export function FieldSection({ field }: { field?: ProductField }) {
  if (!field || !field.items || field.items.length === 0) return null;
  return (
    <section className="pd-section pd-field">
      <div className="pd-section-head">
        {field.eyebrow ? <span className="pd-eyebrow">{field.eyebrow}</span> : null}
        <RichText as="h3" html={field.headline} />
      </div>
      <div className="pd-field-grid">
        {field.items.map((it, i) => (
          <div className="pd-field-item" key={i}>
            <div className="pd-field-head">
              {it.n ? <span className="pd-field-n">{it.n}</span> : null}
              {it.tag ? <span className="pd-field-tag">{it.tag}</span> : null}
            </div>
            {it.title ? <h4>{it.title}</h4> : null}
            {it.body ? <p>{it.body}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Care ---------- */
export function CareSection({ care }: { care?: ProductCare }) {
  if (!care || !care.items || care.items.length === 0) return null;
  return (
    <section className="pd-section pd-care">
      <div className="pd-section-head">
        {care.eyebrow ? <span className="pd-eyebrow">{care.eyebrow}</span> : null}
      </div>
      <div className="pd-care-grid">
        {care.items.map((c, i) => (
          <div key={i} className={`pd-care-item${c.warn ? ' is-warn' : ''}`}>
            {c.icon ? <span className="pd-care-icon">{c.icon}</span> : null}
            {c.title ? <h4>{c.title}</h4> : null}
            {c.body ? <p>{c.body}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Certs ---------- */
export function CertsSection({ certs }: { certs?: ProductCert[] }) {
  if (!certs || certs.length === 0) return null;
  return (
    <section className="pd-section pd-certs">
      <div className="pd-section-head">
        <span className="pd-eyebrow">CERTIFICATIONS</span>
      </div>
      <div className="pd-certs-grid">
        {certs.map((c, i) => (
          <div key={i} className={`pd-cert${c.highlight ? ' is-hi' : ''}`}>
            {c.mark ? <span className="pd-cert-mark">{c.mark}</span> : null}
            {c.title ? <h4>{c.title}</h4> : null}
            {c.sub ? <p>{c.sub}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Order ---------- */
export function OrderSection({ order }: { order?: ProductOrder }) {
  if (!order) return null;
  return (
    <section className="pd-section pd-order">
      <RichText as="h3" className="pd-order-headline" html={order.headline} />
      {order.cells && order.cells.length > 0 ? (
        <div className="pd-order-grid">
          {order.cells.map((c, i) => (
            <div className="pd-order-cell" key={i}>
              {c.label ? <span className="pd-order-k">{c.label}</span> : null}
              {c.value ? <span className="pd-order-v">{c.value}</span> : null}
              {c.body ? <span className="pd-order-b">{c.body}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
      {order.contact && order.contact.length > 0 ? (
        <div className="pd-contact-row">
          {order.contact.map((c, i) => (
            <div className="pd-contact" key={i}>
              <span className="pd-contact-k">{c.label}</span>
              <span className="pd-contact-v">{c.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
