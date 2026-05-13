import Link from 'next/link';
import type { Dictionary, Locale } from '@/lib/i18n';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';

type Props = { locale: Locale; dict: Dictionary; editor?: EditorApi };

export default function Products({ locale, dict, editor }: Props) {
  const p = dict.products;
  const sKeys = p.specKeys;

  return (
    <section className="products" id="products" data-screen-label="02 Products">
      <div className="wrap">
        <div className="section-head">
          <div className="l">
            <EditableText as="span" className="eyebrow" path="products.eyebrow" value={p.eyebrow} editor={editor} />
            <h2 className="title">
              <EditableText path="products.titlePre" value={p.titlePre} editor={editor} />
              <em>
                <EditableText path="products.titleEm" value={p.titleEm} editor={editor} />
              </em>
            </h2>
          </div>
          <Link href={`/${locale}/products`} className="r">
            <EditableText path="products.viewAll" value={p.viewAll} editor={editor} />
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
              </svg>
            </div>
            <div className="meta">
              <EditableText as="span" className="en" path="products.summer.en" value={p.summer.en} editor={editor} />
              <EditableText as="span" className="ko" path="products.summer.ko" value={p.summer.ko} editor={editor} />
              <ul className="spec">
                <li><EditableText as="span" className="k" path="products.specKeys.weight" value={sKeys.weight} editor={editor} /><EditableText as="span" className="v" path="products.summer.weight" value={p.summer.weight} editor={editor} /></li>
                <li><EditableText as="span" className="k" path="products.specKeys.use" value={sKeys.use} editor={editor} /><EditableText as="span" className="v" path="products.summer.use" value={p.summer.use} editor={editor} /></li>
                <li><EditableText as="span" className="k" path="products.specKeys.fit" value={sKeys.fit} editor={editor} /><EditableText as="span" className="v" path="products.summer.fit" value={p.summer.fit} editor={editor} /></li>
              </ul>
              <div className="cert-tags">
                <span>NFPA 2112</span>
                <span>HRC 2</span>
              </div>
            </div>
            <div className="arr-row">
              <EditableText path="products.viewSeries" value={p.viewSeries} editor={editor} />
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
              </svg>
            </div>
            <div className="meta">
              <EditableText as="span" className="en" path="products.sf.en" value={p.sf.en} editor={editor} />
              <EditableText as="span" className="ko" path="products.sf.ko" value={p.sf.ko} editor={editor} />
              <ul className="spec">
                <li><span className="k">{sKeys.weight}</span><EditableText as="span" className="v" path="products.sf.weight" value={p.sf.weight} editor={editor} /></li>
                <li><span className="k">{sKeys.use}</span><EditableText as="span" className="v" path="products.sf.use" value={p.sf.use} editor={editor} /></li>
                <li><span className="k">{sKeys.fit}</span><EditableText as="span" className="v" path="products.sf.fit" value={p.sf.fit} editor={editor} /></li>
              </ul>
              <div className="cert-tags">
                <span>NFPA 2112</span>
                <span>HRC 2</span>
                <EditableText as="span" path="products.sf.testTag" value={p.sf.testTag} editor={editor} />
              </div>
            </div>
            <div className="arr-row">
              <EditableText path="products.viewSeries" value={p.viewSeries} editor={editor} />
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
              </svg>
            </div>
            <div className="meta">
              <EditableText as="span" className="en" path="products.winter.en" value={p.winter.en} editor={editor} />
              <EditableText as="span" className="ko" path="products.winter.ko" value={p.winter.ko} editor={editor} />
              <ul className="spec">
                <li><span className="k">{sKeys.weight}</span><EditableText as="span" className="v" path="products.winter.weight" value={p.winter.weight} editor={editor} /></li>
                <li><span className="k">{sKeys.use}</span><EditableText as="span" className="v" path="products.winter.use" value={p.winter.use} editor={editor} /></li>
                <li><span className="k">{sKeys.fit}</span><EditableText as="span" className="v" path="products.winter.fit" value={p.winter.fit} editor={editor} /></li>
              </ul>
              <div className="cert-tags">
                <span>NFPA 2112</span>
                <span>HRC 2</span>
              </div>
            </div>
            <div className="arr-row">
              <EditableText path="products.viewSeries" value={p.viewSeries} editor={editor} />
              <span className="arr">→</span>
            </div>
          </Link>
        </div>

        <div className="products-foot">
          <EditableText as="span" className="label" path="products.lineupLabel" value={p.lineupLabel} editor={editor} />
          <Link href={`/${locale}/products`} className="link">
            <EditableText path="products.fullCatalogue" value={p.fullCatalogue} editor={editor} />
          </Link>
        </div>
      </div>
    </section>
  );
}
