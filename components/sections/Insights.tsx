import Link from 'next/link';
import type { Dictionary, Locale } from '@/lib/i18n';

type Props = { locale: Locale; dict: Dictionary };

const FRAMES = [
  // article 0 — arc flash
  (
    <svg className="ph-svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" key="0">
      <rect width="400" height="300" fill="#1a1a1c" />
      <g className="stripes">
        <line x1="0" y1="50"  x2="400" y2="50" />
        <line x1="0" y1="100" x2="400" y2="100" />
        <line x1="0" y1="150" x2="400" y2="150" />
        <line x1="0" y1="200" x2="400" y2="200" />
        <line x1="0" y1="250" x2="400" y2="250" />
      </g>
      <g fill="#ff6b1a" opacity=".5">
        <circle cx="280" cy="160" r="2" />
        <circle cx="300" cy="140" r="1.5" />
        <circle cx="260" cy="180" r="1" />
        <circle cx="320" cy="170" r="1.5" />
      </g>
      <text x="20" y="285" opacity=".4">[ ARC FLASH PHOTO ]</text>
    </svg>
  ),
  // article 1 — test lab
  (
    <svg className="ph-svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" key="1">
      <rect width="400" height="300" fill="#1f1f21" />
      <g className="stripes" strokeOpacity=".5">
        <line x1="60"  y1="50" x2="60"  y2="250" />
        <line x1="120" y1="50" x2="120" y2="250" />
        <line x1="180" y1="50" x2="180" y2="250" />
        <line x1="240" y1="50" x2="240" y2="250" />
        <line x1="300" y1="50" x2="300" y2="250" />
        <line x1="360" y1="50" x2="360" y2="250" />
      </g>
      <text x="20" y="285" opacity=".4">[ TEST LAB · NFPA RIG ]</text>
    </svg>
  ),
  // article 2 — fabric macro
  (
    <svg className="ph-svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" key="2">
      <rect width="400" height="300" fill="#1c1c1e" />
      <g className="stripes" strokeOpacity=".5">
        <path d="M0 60 Q100 30 200 60 T400 60" fill="none" />
        <path d="M0 120 Q100 90 200 120 T400 120" fill="none" />
        <path d="M0 180 Q100 150 200 180 T400 180" fill="none" />
        <path d="M0 240 Q100 210 200 240 T400 240" fill="none" />
      </g>
      <text x="20" y="285" opacity=".4">[ FABRIC WEAVE MACRO ]</text>
    </svg>
  ),
];

export default function Insights({ locale, dict }: Props) {
  const ins = dict.insights;
  return (
    <section className="insights" id="insights" data-screen-label="07 Insights">
      <div className="wrap">
        <div className="section-head">
          <div className="l">
            <span className="eyebrow">{ins.eyebrow}</span>
            <h2 className="title">
              {ins.titlePre}
              <em>{ins.titleEm}</em>
            </h2>
          </div>
          <Link href={`/${locale}/news`} className="r">
            {ins.all}
          </Link>
        </div>

        <div className="insights-grid">
          {ins.items.map((item, i) => (
            <Link className="article" href={`/${locale}/news`} key={i}>
              <div className="frame">
                <span className="cat">{item.cat}</span>
                <span className="read">Read →</span>
                {FRAMES[i] ?? FRAMES[0]}
              </div>
              <span className="date">{item.date}</span>
              <h3>{item.title}</h3>
              <p>{item.excerpt}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
