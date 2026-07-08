'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Dictionary, HeroSlide, Locale } from '@/lib/i18n';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';
import EditableImage from '@/components/admin/EditableImage';

type Props = { locale: Locale; dict: Dictionary; editor?: EditorApi };

const AUTO_ROTATE_MS = 7000;

// When admin has set custom filter values, emit inline CSS that overrides
// the static rule in globals.css. When siteConfig is missing we leave
// inline style empty so the CSS default applies.
//
// IMPORTANT: returned as a CSS custom property (`--hero-filter`) on the
// section, not as `filter:` on the <img>. Reason: the real slide image
// is rendered by <EditableImage>, which renders its own internal <img>
// and won't accept a style prop from us. Instead, globals.css has a
// rule `.hero-bg-slide img { filter: var(--hero-filter, ...) }` so the
// variable applies to every slide image (active or fading) at once.
function heroImgStyle(dict: Dictionary): CSSProperties | undefined {
  const f = dict.siteConfig?.heroFilter;
  if (!f || (f.brightness == null && f.contrast == null && f.saturate == null)) return undefined;
  const b = f.brightness ?? 0.85;
  const c = f.contrast ?? 1.15;
  const s = f.saturate ?? 0.6;
  return {
    ['--hero-filter' as string]: `brightness(${b}) contrast(${c}) saturate(${s})`,
  };
}

// Project the (possibly slide-less) hero dict into a normalised array.
// When the user hasn't created any slides yet, we synthesise a single
// virtual slide from the legacy top-level fields so the rendered carousel
// still has exactly one slot to render.
function getEffectiveSlides(hero: Dictionary['hero']): HeroSlide[] {
  if (hero.slides && hero.slides.length > 0) return hero.slides;
  return [{
    image: hero.bgImage ?? '',
    eyebrow: hero.eyebrow,
    headlineLine1: hero.headlineLine1,
    headlineLine2Pre: hero.headlineLine2Pre,
    headlineLine2Em: hero.headlineLine2Em,
    tagline: hero.tagline,
    sub: hero.sub,
    ctaPrimary: hero.ctaPrimary,
    ctaSecondary: hero.ctaSecondary,
  }];
}

export default function Hero({ locale, dict, editor }: Props) {
  const hero = dict.hero;
  const slides = getEffectiveSlides(hero);
  const usingSlides = !!(hero.slides && hero.slides.length > 0);
  const total = slides.length;

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  // Bumped when the BrandIntro curtain lifts — feeding it into the text
  // wrap's key re-mounts the headline block, so the staggered entrance
  // fires exactly as the splash reveals the hero (skip or natural end).
  const [introEpoch, setIntroEpoch] = useState(0);
  useEffect(() => {
    const onIntroDone = () => setIntroEpoch((e) => e + 1);
    window.addEventListener('nj:intro-done', onIntroDone);
    return () => window.removeEventListener('nj:intro-done', onIntroDone);
  }, []);

  // Clamp when total shrinks (e.g. a slide was deleted).
  useEffect(() => {
    if (current >= total) setCurrent(Math.max(0, total - 1));
  }, [current, total]);

  // Public-side auto-rotate. Disabled while the admin is editing so the
  // user doesn't lose focus mid-typing.
  useEffect(() => {
    if (editor || total <= 1 || paused) return;
    const t = window.setInterval(() => {
      setCurrent((c) => (c + 1) % total);
    }, AUTO_ROTATE_MS);
    return () => window.clearInterval(t);
  }, [editor, total, paused]);

  const idx = Math.min(current, total - 1);
  const slide = slides[idx];
  // Edits in slide-mode write into hero.slides[i]; in legacy fallback mode
  // they still go to hero.* so existing JSON without slides keeps working.
  const basePath = usingSlides ? `hero.slides[${idx}]` : 'hero';

  const goPrev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total]);
  const goNext = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);

  // Resolve the slide link. We let the admin type either:
  //   • absolute external: "https://example.com/..."
  //   • locale-prefixed:   "/ko/products/aramid-pk"
  //   • shorthand:         "/products/aramid-pk"   → auto-prefix /<locale>
  // The shorthand keeps the same URL working for both ko + en visitors
  // without forcing the admin to maintain two values.
  const rawLink = (slide.linkHref ?? '').trim();
  let resolvedLink = '';
  if (rawLink) {
    if (/^https?:\/\//i.test(rawLink)) resolvedLink = rawLink;
    else if (/^\/(ko|en)\//.test(rawLink)) resolvedLink = rawLink;
    else if (rawLink.startsWith('/')) resolvedLink = `/${locale}${rawLink}`;
    else resolvedLink = `/${locale}/${rawLink}`;
  }

  return (
    <section
      className={`hero${!editor && resolvedLink ? ' hero--linked' : ''}`}
      data-screen-label="01 Hero"
      style={heroImgStyle(dict)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      // Mobile: pause auto-rotate the moment the visitor touches the hero so
      // a slide doesn't swap out from under them while they swipe the photo.
      onTouchStart={() => setPaused(true)}
    >
      <div className="hero-bg">
        {/*
         * All slide images are rendered stacked. The active one fades in
         * (.is-active → opacity 1) while the others fade out (opacity 0,
         * pointer-events: none so their EditableImage overlays don't
         * intercept clicks for hidden slides).
         *
         * When the slide has `linkHref` AND we're not in edit mode, the
         * active image is wrapped in a Next Link so the user can click
         * the background to open the related product page. The CTA
         * buttons / nav arrows / dots / admin bar are siblings outside
         * this Link, so they keep handling their own clicks normally.
         */}
        {slides.map((s, i) => {
          const active = i === idx;
          const sBase = usingSlides ? `hero.slides[${i}]` : 'hero';
          const inner = (
            <EditableImage
              path={`${sBase}.image`}
              src={s.image}
              alt=""
              className="hero-bg-edit"
              fallback={
                <img
                  className="hero-img"
                  src="/hero.jpg"
                  alt=""
                  aria-hidden
                  // Hero spans the full viewport on every breakpoint.
                  sizes="100vw"
                  loading={active ? 'eager' : 'lazy'}
                  // LCP candidate: only the first/active slide gets
                  // high fetch priority. Older browsers ignore this
                  // hint so it's safe to set unconditionally.
                  fetchPriority={active ? 'high' : undefined}
                  decoding="async"
                />
              }
              editor={active ? editor : undefined}
            />
          );
          // Only the active slide gets wrapped, and only outside edit
          // mode — the admin needs un-linked clicks for the EditableImage
          // "사진 교체" overlay. We resolve the link the same way the
          // public-side does (handled below via resolvedLink) but that
          // value is for the *current* active slide. Inactive slides
          // never receive clicks (opacity 0 + pointer-events: none) so
          // their link state doesn't matter visually.
          const slideLink =
            active && !editor && resolvedLink ? resolvedLink : '';
          return (
            <div key={i} className={`hero-bg-slide${active ? ' is-active' : ''}`}>
              {slideLink ? (
                <Link
                  href={slideLink}
                  className="hero-bg-link"
                  aria-label={s.headlineLine1 || s.eyebrow || '슬라이드 상세 페이지로 이동'}
                >
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </div>
          );
        })}
      </div>
      <div className="hero-overlay" />
      <div className="hero-accent" />
      <div className="hero-grain" />

      {/* Swipe affordance — mobile only (CSS hides it ≥640px). On phones the
       * hero photo is a horizontal scroller so the full wide image can be
       * panned into view; this pill nudges the visitor to swipe, then
       * auto-fades after a few seconds. */}
      <div className="hero-scroll-hint" aria-hidden="true">
        <span className="hsh-arrows">↔</span> 좌우로 밀어 전체 사진 보기
      </div>

      {/*
       * key={idx} on the inner wrap re-mounts the text every slide change,
       * which re-fires the CSS `hero-content-enter` keyframe so the new
       * slide's headline / tagline / sub fade-up cleanly. Outer container
       * stays mounted so the layout doesn't reflow.
       */}
      <div className="hero-content">
        <div className="wrap hero-content-anim" key={`slide-text-${idx}-${introEpoch}`}>
          <div className="hero-tag">
            <span className="hairline" />
            <EditableText as="span" className="eyebrow" path={`${basePath}.eyebrow`} value={slide.eyebrow ?? ''} editor={editor} />
          </div>
          <h1 className="hero-headline">
            <span className="line">
              <EditableText path={`${basePath}.headlineLine1`} value={slide.headlineLine1 ?? ''} editor={editor} />
            </span>
            <span className="line">
              <EditableText path={`${basePath}.headlineLine2Pre`} value={slide.headlineLine2Pre ?? ''} editor={editor} />
              <em>
                <EditableText path={`${basePath}.headlineLine2Em`} value={slide.headlineLine2Em ?? ''} editor={editor} />
              </em>
            </span>
          </h1>
          <EditableText as="p" className="hero-tagline" path={`${basePath}.tagline`} value={slide.tagline ?? ''} editor={editor} />
          <EditableText as="p" className="hero-sub" path={`${basePath}.sub`} value={slide.sub ?? ''} editor={editor} multiline />
          {/* CTA buttons removed — the entire slide background is now a
           * click-through link (set per-slide via the admin 연결 페이지
           * field), so the redundant 자세히 보기 / 문의 buttons just
           * crowded the layout. The "consider whole slide clickable"
           * affordance comes from the pointer cursor + hover-arrows. */}
        </div>
      </div>

      <div className="hero-meta">
        <div className="scroll">
          <EditableText path="hero.scroll" value={hero.scroll} editor={editor} />
          <span className="scroll-line" />
        </div>
        <div className="hero-locator">
          <div className="col">
            <EditableText as="span" className="v" path="hero.locatorName" value={hero.locatorName} editor={editor} />
            <EditableText as="span" path="hero.locatorSub" value={hero.locatorSub} editor={editor} />
          </div>
        </div>
      </div>

      {/* Carousel controls — only show when there's more than one slide. */}
      {total > 1 ? (
        <>
          <button
            type="button"
            className="hero-nav-arrow hero-nav-prev"
            onClick={goPrev}
            aria-label="이전 슬라이드"
          >
            ‹
          </button>
          <button
            type="button"
            className="hero-nav-arrow hero-nav-next"
            onClick={goNext}
            aria-label="다음 슬라이드"
          >
            ›
          </button>
          <div className="hero-dots" role="tablist" aria-label="히어로 슬라이드">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === idx}
                aria-label={`슬라이드 ${i + 1}`}
                className={`hero-dot${i === idx ? ' is-on' : ''}`}
                onClick={() => setCurrent(i)}
              />
            ))}
          </div>
        </>
      ) : null}

      {/* Admin slide management bar — only renders in edit mode. */}
      {editor ? (
        <div className="hero-admin-bar">
          <div className="hero-admin-row">
            <span className="hero-admin-counter">
              슬라이드 <strong>{idx + 1}</strong> / {total}
            </span>
            <div className="hero-admin-actions">
              {editor.onAddHeroSlide ? (
                <button
                  type="button"
                  className="hero-admin-btn"
                  onClick={() => editor.onAddHeroSlide?.()}
                  title="현재 슬라이드 뒤에 새 슬라이드 추가 (양쪽 언어 동시)"
                >
                  + 새 슬라이드
                </button>
              ) : null}
              {editor.onDeleteHeroSlide && total > 1 ? (
                <button
                  type="button"
                  className="hero-admin-btn danger"
                  onClick={() => {
                    if (window.confirm(`슬라이드 ${idx + 1}을(를) 삭제할까요?`)) {
                      editor.onDeleteHeroSlide?.(idx);
                    }
                  }}
                  title="이 슬라이드를 양쪽 언어에서 삭제"
                >
                  현재 슬라이드 삭제
                </button>
              ) : null}
            </div>
          </div>
          <SlideLinkInput
            key={`link-${idx}`}
            slideIndex={idx}
            basePath={basePath}
            initialValue={slide.linkHref ?? ''}
            editor={editor}
          />
        </div>
      ) : null}
    </section>
  );
}

/**
 * Link input for the active slide. Extracted into its own component so we
 * can `key={idx}` on the parent and force a fresh mount every time the
 * admin switches slides — that way the input always shows the URL for
 * the slide currently on screen instead of the stale value typed for
 * a previous slide (uncontrolled defaultValue was leaking across slides).
 *
 * Local state holds the in-progress edit so typing stays snappy; we only
 * push to the dict on blur so the dirty flag / autosave doesn't fire on
 * every keystroke.
 */
function SlideLinkInput({
  slideIndex,
  basePath,
  initialValue,
  editor,
}: {
  slideIndex: number;
  basePath: string;
  initialValue: string;
  editor: EditorApi;
}) {
  const [val, setVal] = useState(initialValue);
  // The initial-value snapshot is captured once when this instance mounts
  // (per slideIndex thanks to the parent key). We expose `lastFlushed` so
  // blur can skip a no-op write when the user didn't actually change it.
  const lastFlushed = useRef(initialValue);
  const flush = () => {
    const v = val.trim();
    if (v === lastFlushed.current) return;
    lastFlushed.current = v;
    // URL is structural — write to both locales so ko + en visitors land
    // on the same product page. Falls back to single-locale patch if
    // onImagePatch isn't wired.
    if (editor.onImagePatch) editor.onImagePatch(`${basePath}.linkHref`, v || null);
    else editor.onPatch(`${basePath}.linkHref`, v);
  };
  return (
    <div className="hero-admin-row hero-admin-link">
      <label className="hero-admin-label" htmlFor={`hero-link-${slideIndex}`}>
        🔗 연결 페이지
      </label>
      <input
        id={`hero-link-${slideIndex}`}
        type="text"
        className="hero-admin-input"
        placeholder="/products/제품ID  또는  https://..."
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={flush}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        title="슬라이드 배경을 클릭했을 때 이동할 페이지. 비워두면 클릭 불가. 짧게 /products/xxx 처럼 입력하면 언어가 자동으로 붙습니다."
      />
      <span className="hero-admin-hint">
        {val.trim() ? '✅ 클릭 가능' : '비어있음 (클릭 불가)'}
      </span>
    </div>
  );
}

