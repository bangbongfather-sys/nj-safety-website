import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { Dictionary, Locale } from '@/lib/i18n';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';

type Props = { locale: Locale; dict: Dictionary; editor?: EditorApi };

// When admin has set custom filter values, emit inline CSS that
// overrides the static rule in globals.css. When siteConfig is missing
// we leave inline style empty so the CSS default applies.
function heroImgStyle(dict: Dictionary): CSSProperties | undefined {
  const f = dict.siteConfig?.heroFilter;
  if (!f || (f.brightness == null && f.contrast == null && f.saturate == null)) return undefined;
  const b = f.brightness ?? 0.55;
  const c = f.contrast ?? 1.15;
  const s = f.saturate ?? 0.6;
  return { filter: `brightness(${b}) contrast(${c}) saturate(${s})` };
}

export default function Hero({ locale, dict, editor }: Props) {
  return (
    <section className="hero" data-screen-label="01 Hero">
      <div className="hero-bg">
        <img
          className="hero-img"
          src="/hero.jpg"
          alt=""
          aria-hidden
          loading="eager"
          decoding="async"
          style={heroImgStyle(dict)}
        />
      </div>
      <div className="hero-overlay" />
      <div className="hero-accent" />
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
