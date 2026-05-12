import Link from 'next/link';
import type { Dictionary, Locale } from '@/lib/i18n';

type Props = { locale: Locale; dict: Dictionary };

export default function Products({ locale, dict }: Props) {
  const p = dict.products;
  const sKeys = p.specKeys;

  return (
    <section className="products" id="products" data-screen-label="02 Products">
      <div className="wrap">
        <div className="section-head">
          <div className="l">
            <span className="eyebrow">{p.eyebrow}</span>
            <h2 className="title">
              {p.titlePre}
              <em>{p.titleEm}</em>
            </h2>
          </div>
          <Link href={`/${locale}/products`} className="r">
            {p.viewAll}
          </Link>
        </div>

        <div className="products-grid3">
          {/* SUMMER */}
          <Link className="product product-tall" href={`/${locale}/products#summer`}>
            <div className="frame">
              <span className="idx">SS / 01</span>
              <span className="code">NJ-ARS-SU</span>
              <span className="season-chip summer">SUMMER</span>
              <svg className="ph-svg" viewBox="0 0 500 640" preserveAspectRatio="xMidYMid slice">
                <rect width="500" height="640" fill="#242426" />
                <g className="stripes" strokeOpacity=".35">
                  <line x1="0" y1="100" x2="500" y2="100" />
                  <line x1="0" y1="220" x2="500" y2="220" />
                  <line x1="0" y1="340" x2="500" y2="340" />
                  <line x1="0" y1="460" x2="500" y2="460" />
                </g>
                <g fill="none" stroke="#5a5a5d" strokeWidth="1.5">
                  <path d="M170 180 l-30 26 l0 50 l-10 10 l0 280 l180 0 l0 -280 l-10 -10 l0 -50 l-30 -26 l-100 0z" />
                  <line x1="250" y1="206" x2="250" y2="546" />
                  <path d="M170 300 q80 -20 160 0" strokeDasharray="2 4" />
                  <path d="M170 360 q80 -20 160 0" strokeDasharray="2 4" />
                  <path d="M170 420 q80 -20 160 0" strokeDasharray="2 4" />
                </g>
                <text x="250" y="600" textAnchor="middle">ARAMID · SUMMER COVERALL</text>
              </svg>
            </div>
            <div className="meta">
              <span className="en">{p.summer.en}</span>
              <span className="ko">{p.summer.ko}</span>
              <ul className="spec">
                <li><span className="k">{sKeys.weight}</span><span className="v">{p.summer.weight}</span></li>
                <li><span className="k">{sKeys.use}</span><span className="v">{p.summer.use}</span></li>
                <li><span className="k">{sKeys.fit}</span><span className="v">{p.summer.fit}</span></li>
              </ul>
              <div className="cert-tags">
                <span>NFPA 2112</span>
                <span>HRC 2</span>
              </div>
            </div>
            <div className="arr-row">
              <span>{p.viewSeries}</span>
              <span className="arr">→</span>
            </div>
          </Link>

          {/* SPRING / FALL */}
          <Link className="product product-tall" href={`/${locale}/products#sf`}>
            <div className="frame">
              <span className="idx">SS / 02</span>
              <span className="code">NJ-ARS-SF</span>
              <span className="season-chip sf">S / F</span>
              <svg className="ph-svg" viewBox="0 0 500 640" preserveAspectRatio="xMidYMid slice">
                <rect width="500" height="640" fill="#202022" />
                <g className="stripes" strokeOpacity=".35">
                  <line x1="0" y1="80"  x2="500" y2="80" />
                  <line x1="0" y1="200" x2="500" y2="200" />
                  <line x1="0" y1="320" x2="500" y2="320" />
                  <line x1="0" y1="440" x2="500" y2="440" />
                </g>
                <g fill="none" stroke="#5a5a5d" strokeWidth="1.5">
                  <path d="M170 170 l-30 30 l0 60 l-10 10 l0 270 l180 0 l0 -270 l-10 -10 l0 -60 l-30 -30 l-100 0z" />
                  <line x1="250" y1="200" x2="250" y2="540" />
                  <rect x="175" y="330" width="60" height="70" strokeDasharray="3 3" />
                  <rect x="265" y="330" width="60" height="70" strokeDasharray="3 3" />
                </g>
                <text x="250" y="600" textAnchor="middle">ARAMID · SPRING / FALL</text>
              </svg>
            </div>
            <div className="meta">
              <span className="en">{p.sf.en}</span>
              <span className="ko">{p.sf.ko}</span>
              <ul className="spec">
                <li><span className="k">{sKeys.weight}</span><span className="v">{p.sf.weight}</span></li>
                <li><span className="k">{sKeys.use}</span><span className="v">{p.sf.use}</span></li>
                <li><span className="k">{sKeys.fit}</span><span className="v">{p.sf.fit}</span></li>
              </ul>
              <div className="cert-tags">
                <span>NFPA 2112</span>
                <span>HRC 2</span>
                <span>{p.sf.testTag}</span>
              </div>
            </div>
            <div className="arr-row">
              <span>{p.viewSeries}</span>
              <span className="arr">→</span>
            </div>
          </Link>

          {/* WINTER */}
          <Link className="product product-tall" href={`/${locale}/products#winter`}>
            <div className="frame">
              <span className="idx">SS / 03</span>
              <span className="code">NJ-ARS-WI</span>
              <span className="season-chip winter">WINTER</span>
              <svg className="ph-svg" viewBox="0 0 500 640" preserveAspectRatio="xMidYMid slice">
                <rect width="500" height="640" fill="#1e1e20" />
                <g className="stripes" strokeOpacity=".35">
                  <line x1="0" y1="90"  x2="500" y2="90" />
                  <line x1="0" y1="210" x2="500" y2="210" />
                  <line x1="0" y1="330" x2="500" y2="330" />
                  <line x1="0" y1="450" x2="500" y2="450" />
                </g>
                <g fill="none" stroke="#5a5a5d" strokeWidth="1.5">
                  <path d="M155 160 l-35 30 l0 70 l-10 10 l0 280 l210 0 l0 -280 l-10 -10 l0 -70 l-35 -30 l-120 0z" />
                  <line x1="250" y1="190" x2="250" y2="550" />
                  <ellipse cx="250" cy="180" rx="45" ry="22" strokeDasharray="3 3" />
                </g>
                <text x="250" y="600" textAnchor="middle">ARAMID · WINTER LAYERED</text>
              </svg>
            </div>
            <div className="meta">
              <span className="en">{p.winter.en}</span>
              <span className="ko">{p.winter.ko}</span>
              <ul className="spec">
                <li><span className="k">{sKeys.weight}</span><span className="v">{p.winter.weight}</span></li>
                <li><span className="k">{sKeys.use}</span><span className="v">{p.winter.use}</span></li>
                <li><span className="k">{sKeys.fit}</span><span className="v">{p.winter.fit}</span></li>
              </ul>
              <div className="cert-tags">
                <span>NFPA 2112</span>
                <span>HRC 2</span>
              </div>
            </div>
            <div className="arr-row">
              <span>{p.viewSeries}</span>
              <span className="arr">→</span>
            </div>
          </Link>
        </div>

        <div className="products-foot">
          <span className="label">{p.lineupLabel}</span>
          <Link href={`/${locale}/products`} className="link">
            {p.fullCatalogue}
          </Link>
        </div>
      </div>
    </section>
  );
}
