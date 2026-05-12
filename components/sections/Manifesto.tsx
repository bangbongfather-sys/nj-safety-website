import type { Dictionary } from '@/lib/i18n';

type Props = { dict: Dictionary };

export default function Manifesto({ dict }: Props) {
  const m = dict.manifesto;
  return (
    <section className="statement" id="about" data-screen-label="04 Statement">
      <div className="wrap">
        <div className="eyebrow" style={{ marginBottom: 48, display: 'block' }}>
          {m.eyebrow}
        </div>
        <p className="quote">
          <span className="dim">{m.quotePre}</span> {m.quoteMain}
          <br />
          <em>{m.quoteEm}</em>
          {m.quoteMid}
          <br />
          <span className="dim">{m.quoteEnd}</span>
        </p>
        <div className="sig">
          <span className="num">{m.sigNumber}</span>
          <span className="name">{m.sigName}</span>
        </div>
      </div>
    </section>
  );
}
