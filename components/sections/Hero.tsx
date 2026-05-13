import Link from 'next/link';
import type { Dictionary, Locale } from '@/lib/i18n';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';

type Props = { locale: Locale; dict: Dictionary; editor?: EditorApi };

export default function Hero({ locale, dict, editor }: Props) {
  return (
    <section className="hero" data-screen-label="01 Hero">
      <div className="hero-bg">
        <svg
          className="ph-svg"
          viewBox="0 0 1920 1080"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <linearGradient id="hbg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1a1a1c" />
              <stop offset=".55" stopColor="#0e0e10" />
              <stop offset="1" stopColor="#050506" />
            </linearGradient>
            <radialGradient id="emb" cx=".72" cy=".62" r=".55">
              <stop offset="0" stopColor="#ff6b1a" stopOpacity=".22" />
              <stop offset=".4" stopColor="#ff6b1a" stopOpacity=".08" />
              <stop offset="1" stopColor="#ff6b1a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1920" height="1080" fill="url(#hbg)" />
          <g className="stripes" strokeOpacity=".35">
            <line x1="0"    y1="780" x2="1920" y2="640" />
            <line x1="0"    y1="820" x2="1920" y2="680" />
            <line x1="0"    y1="860" x2="1920" y2="720" />
            <line x1="0"    y1="900" x2="1920" y2="760" />
            <line x1="0"    y1="940" x2="1920" y2="800" />
            <line x1="1200" y1="0"   x2="1350" y2="1080" />
            <line x1="1380" y1="0"   x2="1520" y2="1080" />
            <line x1="1560" y1="0"   x2="1690" y2="1080" />
          </g>
          <g opacity=".18" fill="#fff">
            <rect x="1100" y="100" width="2" height="980" />
            <rect x="1280" y="100" width="2" height="980" />
            <rect x="1460" y="100" width="2" height="980" />
            <rect x="1640" y="100" width="2" height="980" />
          </g>
          <rect width="1920" height="1080" fill="url(#emb)" />
          <g fill="#ff8a3a">
            <circle cx="1340" cy="640" r="3" />
            <circle cx="1380" cy="612" r="2" />
            <circle cx="1420" cy="660" r="2.5" />
            <circle cx="1300" cy="690" r="1.5" />
            <circle cx="1460" cy="600" r="2" />
            <circle cx="1500" cy="630" r="1.5" />
            <circle cx="1240" cy="720" r="2" />
            <circle cx="1560" cy="680" r="1.5" />
            <circle cx="1600" cy="650" r="1" />
            <circle cx="1180" cy="700" r="1" />
          </g>
        </svg>
      </div>
      <div className="hero-overlay" />
      <div className="hero-grain" />

      <div className="hero-content">
        <div className="wrap">
          <div className="hero-tag">
            <span className="hairline" />
            <EditableText as="span" className="eyebrow" path="hero.eyebrow" value={dict.hero.eyebrow} editor={editor} />
          </div>
          <h1 className="hero-headline">
            <span className="line">
              <EditableText path="hero.headlineLine1" value={dict.hero.headlineLine1} editor={editor} />
            </span>
            <span className="line">
              <EditableText path="hero.headlineLine2Pre" value={dict.hero.headlineLine2Pre} editor={editor} />
              <em>
                <EditableText path="hero.headlineLine2Em" value={dict.hero.headlineLine2Em} editor={editor} />
              </em>
            </span>
          </h1>
          <EditableText as="p" className="hero-tagline" path="hero.tagline" value={dict.hero.tagline} editor={editor} />
          <EditableText as="p" className="hero-sub" path="hero.sub" value={dict.hero.sub} editor={editor} multiline />
          <div className="hero-cta">
            <Link href={`/${locale}/products`} className="btn btn-primary">
              <EditableText path="hero.ctaPrimary" value={dict.hero.ctaPrimary} editor={editor} />
              <span className="arr">→</span>
            </Link>
            <Link href={`/${locale}/contact`} className="btn btn-ghost">
              <EditableText path="hero.ctaSecondary" value={dict.hero.ctaSecondary} editor={editor} />
              <span className="arr">→</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="hero-meta">
        <div className="scroll">
          <EditableText path="hero.scroll" value={dict.hero.scroll} editor={editor} />
          <span className="scroll-line" />
        </div>
        <div className="hero-locator">
          <div className="col">
            <EditableText as="span" className="v" path="hero.locatorName" value={dict.hero.locatorName} editor={editor} />
            <EditableText as="span" path="hero.locatorSub" value={dict.hero.locatorSub} editor={editor} />
          </div>
        </div>
      </div>
    </section>
  );
}
