import type { Dictionary } from '@/lib/i18n';

type Props = { dict: Dictionary };

export default function Clients({ dict }: Props) {
  const c = dict.clients;
  return (
    <section className="trusted" id="trusted" data-screen-label="06 Trusted">
      <div className="wrap">
        <div className="trusted-head">
          <span className="eyebrow">{c.eyebrow}</span>
          <h2>{c.headline}</h2>
        </div>
        <div className="logos">
          {c.logos.map((label, i) => (
            <div className="logo-cell" key={i}>
              <span className="ph">{label}</span>
            </div>
          ))}
        </div>
        <div className="stats">
          {c.stats.map((s, i) => (
            <div className="stat" key={i}>
              <span className="label">{s.label}</span>
              <span className="num">
                {s.num}
                <sup>{s.sup}</sup>
              </span>
              <span className="desc">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
