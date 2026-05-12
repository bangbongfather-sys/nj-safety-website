import type { Dictionary } from '@/lib/i18n';

type Props = { dict: Dictionary };

export default function Certifications({ dict }: Props) {
  const c = dict.certifications;
  return (
    <section className="certs" id="certs" data-screen-label="05 Certifications">
      <div className="wrap certs-inner">
        <div className="lead">
          <span className="eyebrow">{c.eyebrow}</span>
          <h2>
            <em>{c.titleEm}</em>
            <br />
            {c.titleSuffix}
          </h2>
          <p className="sub">{c.sub}</p>
          <div className="meta">{c.meta}</div>
        </div>
        <div className="certs-grid">
          {c.items.map((item, i) => (
            <div className="cert" key={i}>
              <span className="cert-id">{item.id}</span>
              <span className="cert-name">{item.name}</span>
              <span className="cert-note">{item.note}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
