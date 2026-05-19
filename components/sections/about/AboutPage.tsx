/**
 * /ko/about — 회사소개 페이지.
 *
 * 9-section narrative built from design_handoff_about_page. Now reads
 * all copy + the CEO portrait URL from `dict.about.*`, so the homepage
 * WYSIWYG admin (and a dedicated /admin/about/edit later) can edit
 * every field inline via the same EditableText / EditableImage
 * components used elsewhere.
 *
 * Section order:
 *   01. Hero (38년 / 방염, 한 길)
 *   02. Stats strip (4 cells)
 *   03. CEO Message (editable portrait)
 *   04. Heritage Timeline (3 phases)
 *   05. Core Values (5 cards)
 *   06. One-Stop System (4 stages)
 *   07. Industries Served (4 cards)
 *   08. Recent Certification Milestones
 *   09. CTA
 *
 * Site nav + footer are mounted by `app/[locale]/layout.tsx`
 * automatically, so this component renders only the page body.
 */

import Link from 'next/link';
import type { Dictionary, Locale } from '@/lib/i18n';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';
import EditableImage from '@/components/admin/EditableImage';
import { CustomBlocksLayer } from '@/components/admin/CustomBlocks';
import './about.css';

type Props = {
  locale: Locale;
  dict: Dictionary;
  editor?: EditorApi;
  /**
   * Which slice of the 9-section narrative to render.
   *   'full'         — every section (used by /admin/about/edit so the
   *                    admin can edit the whole page on one screen).
   *   'story'        — Hero + Stats + CEO + Heritage. The public /about
   *                    landing. "누구인가" 흐름.
   *   'capabilities' — Values + OneStop + Industries + Recent. The
   *                    public /about/capabilities page. "어떻게
   *                    만드는가" 흐름.
   * Both public views still render the CTA at the bottom so each page
   * has a conversion exit.
   */
  view?: 'full' | 'story' | 'capabilities';
};

// Narrow guard: anything under `about` is admin-authored, so it might be
// missing fields when the JSON has been hand-edited. We keep the
// renderer defensive by using `?? ''` / `?? []` everywhere.
type AboutDict = NonNullable<Dictionary['about']>;

export default function AboutPage({ locale, dict, editor, view = 'full' }: Props) {
  const about = dict.about as AboutDict;

  // Split the 9 sections into story / capabilities. The selectors are
  // derived from the section names rather than the original order so
  // adding a new section later only needs the case added in one place.
  const showStory = view === 'full' || view === 'story';
  const showCapabilities = view === 'full' || view === 'capabilities';

  return (
    <div className="about-page cb-page-root">
      {/* Hero only fronts the full view + the story view. The
       * capabilities page gets its own smaller intro below. */}
      {showStory ? <AboutHero about={about} editor={editor} /> : null}
      {showStory ? <AboutStats about={about} editor={editor} /> : null}
      {showStory ? <AboutCeo about={about} editor={editor} /> : null}
      {showStory ? <AboutHeritage about={about} editor={editor} /> : null}

      {/* Capabilities sub-page gets its own intro band so the screen
       * doesn't open mid-content. Hidden on the full admin view to
       * avoid duplicating headings during editing. */}
      {view === 'capabilities' ? <CapabilitiesIntro about={about} /> : null}

      {showCapabilities ? <AboutValues about={about} editor={editor} /> : null}
      {showCapabilities ? <AboutOneStop about={about} editor={editor} /> : null}
      {showCapabilities ? <AboutIndustries about={about} editor={editor} /> : null}
      {showCapabilities ? <AboutRecent about={about} editor={editor} /> : null}

      {/* CTA closes every public view — story page sends the visitor
       * to capabilities OR to product/contact; capabilities page sends
       * them straight to product/contact. Inline cross-link to the
       * other half lives in AboutCta when `view !== 'full'`. */}
      <AboutCta about={about} locale={locale} editor={editor} view={view} />
      <CustomBlocksLayer blocks={dict.customBlocks} route="about" editor={editor} />
    </div>
  );
}

/* ─── Capabilities sub-page intro ────────────────────────────────────
 * Small band shown above the Values section on /about/capabilities, so
 * the visitor lands on something framed rather than diving straight
 * into a list. Pulled from dict.about.capHero, with hard-coded fallback
 * copy when the dict hasn't been seeded yet (won't break the page).
 */
function CapabilitiesIntro({ about }: { about: AboutDict }) {
  const h = (about as unknown as { capHero?: { eyebrow?: string; titleLine1?: string; titleLine2Em?: string; sub?: string } }).capHero;
  const eyebrow = h?.eyebrow ?? '— 회사소개 · 역량';
  const titleLine1 = h?.titleLine1 ?? '제조 시스템과';
  const titleLine2Em = h?.titleLine2Em ?? '검증된 역량.';
  const sub = h?.sub ?? '원단부터 출하까지, NJ Safety 가 어떻게 만들고 어디서 쓰이는지. 가치·시스템·산업군·인증을 한 페이지에 담았습니다.';
  return (
    <section className="ab-caphero" data-screen-label="Capabilities intro">
      <div className="wrap" style={{ padding: '88px 0 32px' }}>
        <span className="eyebrow">{eyebrow}</span>
        <h1 style={{ fontFamily: 'var(--display)', fontWeight: 900, letterSpacing: '-.03em', fontSize: 'clamp(40px, 6vw, 96px)', lineHeight: 1.05, marginTop: 18 }}>
          <span style={{ display: 'block' }}>{titleLine1}</span>
          <em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>{titleLine2Em}</em>
        </h1>
        <p style={{ marginTop: 24, maxWidth: 720, color: 'var(--muted)', fontSize: 17, lineHeight: 1.65 }}>{sub}</p>
      </div>
    </section>
  );
}

/* ─── 01. Hero ───────────────────────────────────────────────────── */
function AboutHero({ about, editor }: { about: AboutDict; editor?: EditorApi }) {
  const h = about.hero;
  return (
    <section className="ab-hero" data-screen-label="01 Hero">
      <div className="ab-hero-bg" aria-hidden>
        <svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
          <g fill="none" stroke="#ff6b1a" strokeWidth="1">
            <path d="M100 500 L100 100 L500 100 L500 500 Z" opacity=".3" />
            <path d="M150 460 L150 140 L450 140 L450 460 Z" opacity=".2" />
            <path d="M200 420 L200 180 L400 180 L400 420 Z" opacity=".15" />
            <line x1="100" y1="200" x2="500" y2="200" opacity=".3" />
            <line x1="100" y1="300" x2="500" y2="300" opacity=".3" />
            <line x1="100" y1="400" x2="500" y2="400" opacity=".3" />
          </g>
        </svg>
      </div>
      <div className="wrap">
        <div className="ab-hero-content">
          <div className="ab-hero-l">
            <div className="ab-hero-meta">
              <span className="ab-hairline" />
              <EditableText
                as="span"
                className="ab-eyebrow"
                path="about.hero.eyebrow"
                value={h.eyebrow ?? ''}
                editor={editor}
              />
            </div>
            <div className="ab-hero-year">
              <EditableText
                as="span"
                className="num"
                path="about.hero.yearNum"
                value={h.yearNum ?? ''}
                editor={editor}
              />
              <span className="lbl">
                <EditableText
                  as="span"
                  className="k"
                  path="about.hero.yearLabelK"
                  value={h.yearLabelK ?? ''}
                  editor={editor}
                />
                <EditableText
                  as="span"
                  className="v"
                  path="about.hero.yearLabelV"
                  value={h.yearLabelV ?? ''}
                  editor={editor}
                />
              </span>
            </div>
            {/* Hero title is rendered with the orange <em> on its own
              * block-level line, so the admin can type a long pre-em
              * statement and the brand line below it wraps cleanly
              * instead of mid-syllable. The optional `titleLine2` only
              * renders when it has content — avoids the empty <br>
              * from leaving a ghost line. */}
            <h1>
              <EditableText
                as="span"
                className="ab-hero-h1-pre"
                path="about.hero.titleLine1Pre"
                value={h.titleLine1Pre ?? ''}
                editor={editor}
              />
              {h.titleLine1Em || editor ? (
                <em>
                  <EditableText
                    as="span"
                    path="about.hero.titleLine1Em"
                    value={h.titleLine1Em ?? ''}
                    editor={editor}
                  />
                </em>
              ) : null}
              {h.titleLine2 || editor ? (
                <EditableText
                  as="span"
                  className="ab-hero-h1-line2"
                  path="about.hero.titleLine2"
                  value={h.titleLine2 ?? ''}
                  editor={editor}
                />
              ) : null}
            </h1>
            <EditableText
              as="p"
              className="ab-hero-sub"
              path="about.hero.sub"
              value={h.sub ?? ''}
              editor={editor}
              multiline
            />
          </div>
          <aside className="ab-hero-aside">
            <div>
              <EditableText
                as="div"
                className="tag"
                path="about.hero.asideTag"
                value={h.asideTag ?? ''}
                editor={editor}
              />
              <p className="pull">
                <EditableText path="about.hero.asidePullPre" value={h.asidePullPre ?? ''} editor={editor} />
                <br />
                <em>
                  <EditableText path="about.hero.asidePullEm" value={h.asidePullEm ?? ''} editor={editor} />
                </em>
                <EditableText path="about.hero.asidePullPost" value={h.asidePullPost ?? ''} editor={editor} />
              </p>
            </div>
            <div className="corp">
              <EditableText as="span" path="about.hero.corpName" value={h.corpName ?? ''} editor={editor} />
              <EditableText as="strong" path="about.hero.corpEst" value={h.corpEst ?? ''} editor={editor} />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

/* ─── 02. Stats Strip ────────────────────────────────────────────── */
function AboutStats({ about, editor }: { about: AboutDict; editor?: EditorApi }) {
  const stats = about.stats ?? [];
  return (
    <section className="ab-stats" data-screen-label="02 Stats">
      <div className="ab-stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="ab-stat">
            <EditableText as="span" className="lbl" path={`about.stats[${i}].lbl`} value={s.lbl ?? ''} editor={editor} />
            <span className="val">
              <EditableText as="span" path={`about.stats[${i}].num`} value={s.num ?? ''} editor={editor} />
              {(s.unit ?? '') || editor ? (
                <EditableText as="span" className="u" path={`about.stats[${i}].unit`} value={s.unit ?? ''} editor={editor} />
              ) : null}
            </span>
            <EditableText
              as="span"
              className="desc"
              path={`about.stats[${i}].desc`}
              value={s.desc ?? ''}
              editor={editor}
              multiline
            />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── 03. CEO Message ────────────────────────────────────────────── */
function AboutCeo({ about, editor }: { about: AboutDict; editor?: EditorApi }) {
  const c = about.ceo;
  return (
    <section className="ab-ceo ab-section" data-screen-label="03 CEO Message">
      <div className="wrap">
        <div className="ab-ceo-grid">
          <div className="ab-ceo-portrait">
            <EditableText
              as="span"
              className="badge"
              path="about.ceo.badge"
              value={c.badge ?? ''}
              editor={editor}
            />
            <EditableImage
              path="about.ceo.portraitImage"
              src={c.portraitImage ?? ''}
              alt="대표이사 포트레이트"
              className="ab-ceo-portrait-img"
              fallback={
                <svg className="ab-ph-svg" viewBox="0 0 500 625" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <defs>
                    <linearGradient id="ab-pg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#252527" />
                      <stop offset="1" stopColor="#0d0d0e" />
                    </linearGradient>
                  </defs>
                  <rect width="500" height="625" fill="url(#ab-pg)" />
                  <g className="stripes" opacity=".25">
                    <line x1="0" y1="120" x2="500" y2="120" />
                    <line x1="0" y1="240" x2="500" y2="240" />
                    <line x1="0" y1="360" x2="500" y2="360" />
                    <line x1="0" y1="480" x2="500" y2="480" />
                  </g>
                  <g fill="none" stroke="#4a4a4d" strokeWidth="1.5">
                    <ellipse cx="250" cy="260" rx="80" ry="100" />
                    <path d="M120 625 L120 480 Q120 400 200 380 L300 380 Q380 400 380 480 L380 625" />
                  </g>
                  <g fill="#ff6b1a" opacity=".5">
                    <circle cx="250" cy="260" r="3" />
                  </g>
                </svg>
              }
              editor={editor}
            />
            {!c.portraitImage ? (
              <EditableText
                as="span"
                className="ph-name"
                path="about.ceo.portraitPlaceholder"
                value={c.portraitPlaceholder ?? ''}
                editor={editor}
              />
            ) : null}
            <EditableText
              as="span"
              className="stamp"
              path="about.ceo.stamp"
              value={c.stamp ?? ''}
              editor={editor}
            />
          </div>
          <div className="ab-ceo-body">
            <EditableText
              as="span"
              className="ab-eyebrow"
              path="about.ceo.eyebrow"
              value={c.eyebrow ?? ''}
              editor={editor}
            />
            <h2>
              <EditableText path="about.ceo.titleLine1" value={c.titleLine1 ?? ''} editor={editor} />
              <br />
              <em>
                <EditableText path="about.ceo.titleLine2Em" value={c.titleLine2Em ?? ''} editor={editor} />
              </em>
            </h2>
            <EditableText as="p" path="about.ceo.paragraph1" value={c.paragraph1 ?? ''} editor={editor} multiline />
            <EditableText as="p" path="about.ceo.paragraph2" value={c.paragraph2 ?? ''} editor={editor} multiline />
            <EditableText as="p" path="about.ceo.paragraph3" value={c.paragraph3 ?? ''} editor={editor} multiline />
            <div className="signoff">
              <span className="ab-hairline" style={{ background: 'var(--accent)' }} />
              <EditableText as="span" path="about.ceo.signoffTitle" value={c.signoffTitle ?? ''} editor={editor} />
              <EditableText
                as="span"
                className="who"
                path="about.ceo.signoffName"
                value={c.signoffName ?? ''}
                editor={editor}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── 04. Heritage Timeline ──────────────────────────────────────── */
function AboutHeritage({ about, editor }: { about: AboutDict; editor?: EditorApi }) {
  const h = about.heritage;
  const phases = h.phases ?? [];
  return (
    <section className="ab-heritage ab-section" data-screen-label="04 Heritage">
      <div className="wrap">
        <div className="ab-section-head">
          <div className="l">
            <EditableText as="span" className="ab-eyebrow" path="about.heritage.eyebrow" value={h.eyebrow ?? ''} editor={editor} />
            <h2 className="ab-title">
              <EditableText path="about.heritage.titlePre" value={h.titlePre ?? ''} editor={editor} />
              <em>
                <EditableText path="about.heritage.titleEm" value={h.titleEm ?? ''} editor={editor} />
              </em>
            </h2>
          </div>
          <EditableText as="div" className="r" path="about.heritage.no" value={h.no ?? ''} editor={editor} />
        </div>

        <div className="ab-timeline">
          {phases.map((p, pi) => (
            <div key={pi} className={`ab-tl-step${p.current ? ' current' : ''}`}>
              <span className="dot" />
              <div className="yr">
                <EditableText as="span" path={`about.heritage.phases[${pi}].yearPre`} value={p.yearPre ?? ''} editor={editor} />
                <em>
                  <EditableText as="span" path={`about.heritage.phases[${pi}].yearEm`} value={p.yearEm ?? ''} editor={editor} />
                </em>
                <EditableText as="span" path={`about.heritage.phases[${pi}].yearPost`} value={p.yearPost ?? ''} editor={editor} />
              </div>
              <EditableText as="div" className="yr-sub" path={`about.heritage.phases[${pi}].yearSub`} value={p.yearSub ?? ''} editor={editor} />
              <h3>
                <EditableText path={`about.heritage.phases[${pi}].h3Line1`} value={p.h3Line1 ?? ''} editor={editor} />
                <br />
                <EditableText path={`about.heritage.phases[${pi}].h3Line2`} value={p.h3Line2 ?? ''} editor={editor} />
              </h3>
              <ul>
                <EditableText
                  as="li"
                  className="lede"
                  path={`about.heritage.phases[${pi}].lede`}
                  value={p.lede ?? ''}
                  editor={editor}
                  multiline
                />
                {(p.items ?? []).map((it, ii) => (
                  <li key={ii}>
                    <EditableText
                      as="span"
                      className="yr-mini"
                      path={`about.heritage.phases[${pi}].items[${ii}].y`}
                      value={it.y ?? ''}
                      editor={editor}
                    />
                    <EditableText
                      as="span"
                      path={`about.heritage.phases[${pi}].items[${ii}].t`}
                      value={it.t ?? ''}
                      editor={editor}
                      multiline
                    />
                  </li>
                ))}
              </ul>
              {((p.clients ?? []).length > 0 || editor) ? (
                <div className="client-strip">
                  {(p.clients ?? []).map((cl, ci) => (
                    <EditableText
                      key={ci}
                      as="span"
                      path={`about.heritage.phases[${pi}].clients[${ci}]`}
                      value={cl ?? ''}
                      editor={editor}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 05. Core Values ────────────────────────────────────────────── */
const VALUE_ICONS = [
  <svg key="i1" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18" /></svg>,
  <svg key="i2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></svg>,
  <svg key="i3" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2 4 5v7c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3Z" /></svg>,
  <svg key="i4" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 11l-3 3-2-2" /></svg>,
  <svg key="i5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 7h16M4 12h16M4 17h10" /></svg>,
];

function AboutValues({ about, editor }: { about: AboutDict; editor?: EditorApi }) {
  const v = about.values;
  const items = v.items ?? [];
  return (
    <section className="ab-values ab-section" data-screen-label="05 Values">
      <div className="wrap">
        <div className="ab-section-head">
          <div className="l">
            <EditableText as="span" className="ab-eyebrow" path="about.values.eyebrow" value={v.eyebrow ?? ''} editor={editor} />
            <h2 className="ab-title">
              <EditableText path="about.values.titleLine1" value={v.titleLine1 ?? ''} editor={editor} />
              <br />
              <em>
                <EditableText path="about.values.titleLine2Em" value={v.titleLine2Em ?? ''} editor={editor} />
              </em>
            </h2>
          </div>
          <EditableText as="div" className="r" path="about.values.rMicro" value={v.rMicro ?? ''} editor={editor} />
        </div>

        <div className="ab-values-grid">
          {items.map((it, i) => (
            <div key={i} className="ab-value">
              <div className="top">
                <EditableText as="span" className="n" path={`about.values.items[${i}].n`} value={it.n ?? ''} editor={editor} />
                <span className="ic">{VALUE_ICONS[i] ?? null}</span>
              </div>
              <div>
                <EditableText as="h3" path={`about.values.items[${i}].en`} value={it.en ?? ''} editor={editor} />
                <EditableText as="div" className="ko" path={`about.values.items[${i}].ko`} value={it.ko ?? ''} editor={editor} />
              </div>
              <EditableText as="p" path={`about.values.items[${i}].body`} value={it.body ?? ''} editor={editor} multiline />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 06. One-Stop System ────────────────────────────────────────── */
const STEP_ICONS = [
  <svg key="s1" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 6h18M3 12h18M3 18h18" strokeDasharray="2 3" /></svg>,
  <svg key="s2" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2 4 7v10l8 5 8-5V7l-8-5Z" /><path d="M12 12 4 7" /><path d="m12 12 8-5" /><path d="M12 12v10" /></svg>,
  <svg key="s3" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 10h18M9 14h6" /></svg>,
  <svg key="s4" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 9l9-5 9 5v6l-9 5-9-5z" /><path d="M3 9l9 5 9-5" /><path d="M12 14v6" /></svg>,
];

function AboutOneStop({ about, editor }: { about: AboutDict; editor?: EditorApi }) {
  const o = about.oneStop;
  const steps = o.steps ?? [];
  return (
    <section className="ab-onestop ab-section" data-screen-label="06 One-stop">
      <div className="wrap">
        <div className="ab-section-head">
          <div className="l">
            <EditableText as="span" className="ab-eyebrow" path="about.oneStop.eyebrow" value={o.eyebrow ?? ''} editor={editor} />
            <h2 className="ab-title">
              <EditableText path="about.oneStop.titleLine1" value={o.titleLine1 ?? ''} editor={editor} />
              <br />
              <em>
                <EditableText path="about.oneStop.titleLine2Em" value={o.titleLine2Em ?? ''} editor={editor} />
              </em>
            </h2>
          </div>
          <EditableText as="div" className="r" path="about.oneStop.rMicro" value={o.rMicro ?? ''} editor={editor} />
        </div>

        <div className="ab-onestop-grid">
          {steps.map((s, i) => (
            <div key={i} className="ab-step">
              <div className="icon">{STEP_ICONS[i] ?? null}</div>
              <EditableText as="span" className="n" path={`about.oneStop.steps[${i}].n`} value={s.n ?? ''} editor={editor} />
              <EditableText as="h4" path={`about.oneStop.steps[${i}].ko`} value={s.ko ?? ''} editor={editor} />
              <EditableText as="span" className="en" path={`about.oneStop.steps[${i}].en`} value={s.en ?? ''} editor={editor} />
              <EditableText as="p" path={`about.oneStop.steps[${i}].body`} value={s.body ?? ''} editor={editor} multiline />
            </div>
          ))}
        </div>

        <div className="ab-onestop-foot">
          <p className="quote">
            <EditableText path="about.oneStop.footQuotePre" value={o.footQuotePre ?? ''} editor={editor} />
            <em>
              <EditableText path="about.oneStop.footQuoteEm" value={o.footQuoteEm ?? ''} editor={editor} />
            </em>
          </p>
          <EditableText as="span" className="badge" path="about.oneStop.footBadge" value={o.footBadge ?? ''} editor={editor} />
        </div>
      </div>
    </section>
  );
}

/* ─── 07. Industries Served ──────────────────────────────────────── */
const IND_ICONS = [
  <svg key="d1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" /></svg>,
  <svg key="d2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M5 4v16M19 4v16M3 8h4M17 8h4M3 16h4M17 16h4M5 12c5 0 9 0 14 0" /></svg>,
  <svg key="d3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3v18M5 5l14 14M19 5L5 19" /></svg>,
  <svg key="d4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M12 2c0 6-6 8-6 14a6 6 0 0 0 12 0c0-6-6-8-6-14z" /></svg>,
];

function AboutIndustries({ about, editor }: { about: AboutDict; editor?: EditorApi }) {
  const ind = about.industries;
  const items = ind.items ?? [];
  return (
    <section className="ab-industries ab-section" data-screen-label="07 Industries">
      <div className="wrap">
        <div className="ab-section-head">
          <div className="l">
            <EditableText as="span" className="ab-eyebrow" path="about.industries.eyebrow" value={ind.eyebrow ?? ''} editor={editor} />
            <h2 className="ab-title">
              <EditableText path="about.industries.titleLine1" value={ind.titleLine1 ?? ''} editor={editor} />
              <br />
              <em>
                <EditableText path="about.industries.titleLine2Em" value={ind.titleLine2Em ?? ''} editor={editor} />
              </em>
            </h2>
          </div>
          <EditableText as="div" className="r" path="about.industries.rMicro" value={ind.rMicro ?? ''} editor={editor} />
        </div>

        <div className="ab-industries-grid">
          {items.map((it, i) => (
            <div key={i} className="ab-ind">
              <EditableText as="span" className="n" path={`about.industries.items[${i}].n`} value={it.n ?? ''} editor={editor} />
              <div>
                <EditableText as="h3" path={`about.industries.items[${i}].ko`} value={it.ko ?? ''} editor={editor} />
                <EditableText as="div" className="en" path={`about.industries.items[${i}].en`} value={it.en ?? ''} editor={editor} />
              </div>
              <EditableText as="p" path={`about.industries.items[${i}].body`} value={it.body ?? ''} editor={editor} multiline />
              <div className="icon" aria-hidden>{IND_ICONS[i] ?? null}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 08. Recent Certification Milestones ────────────────────────── */
function AboutRecent({ about, editor }: { about: AboutDict; editor?: EditorApi }) {
  const r = about.recent;
  const rows = r.rows ?? [];
  return (
    <section className="ab-recent ab-section" data-screen-label="08 Recent">
      <div className="wrap">
        <div className="ab-recent-grid">
          <div className="ab-recent-l">
            <EditableText as="span" className="ab-eyebrow" path="about.recent.eyebrow" value={r.eyebrow ?? ''} editor={editor} />
            <h2>
              <EditableText path="about.recent.titlePre" value={r.titlePre ?? ''} editor={editor} />
              <em>
                <EditableText path="about.recent.titleEm" value={r.titleEm ?? ''} editor={editor} />
              </em>
            </h2>
            <EditableText as="p" path="about.recent.body" value={r.body ?? ''} editor={editor} multiline />
          </div>
          <div className="ab-recent-r">
            {rows.map((row, i) => (
              <div key={i} className="ab-cert-row">
                <EditableText as="span" className="y" path={`about.recent.rows[${i}].y`} value={row.y ?? ''} editor={editor} />
                <div className="body">
                  <EditableText as="h4" path={`about.recent.rows[${i}].title`} value={row.title ?? ''} editor={editor} />
                  <EditableText as="p" path={`about.recent.rows[${i}].body`} value={row.body ?? ''} editor={editor} multiline />
                </div>
                <EditableText
                  as="span"
                  className={`status ${row.done ? 'done' : 'ongoing'}`}
                  path={`about.recent.rows[${i}].status`}
                  value={row.status ?? ''}
                  editor={editor}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── 09. CTA ────────────────────────────────────────────────────── */
function AboutCta({
  about,
  locale,
  editor,
  view,
}: {
  about: AboutDict;
  locale: Locale;
  editor?: EditorApi;
  view?: 'full' | 'story' | 'capabilities';
}) {
  const c = about.cta;
  // Cross-link sends the visitor to the OTHER half of /about. Hidden on
  // the full admin view (which already shows everything on one page).
  const cross = view === 'story'
    ? { href: `/${locale}/about/capabilities/`, label: locale === 'ko' ? '제조 시스템 보기 →' : 'View capabilities →' }
    : view === 'capabilities'
      ? { href: `/${locale}/about/`, label: locale === 'ko' ? '← 회사 이야기로' : '← Our story' }
      : null;
  return (
    <section className="ab-cta" data-screen-label="09 CTA">
      <div className="wrap">
        <EditableText as="span" className="ab-eyebrow" path="about.cta.eyebrow" value={c.eyebrow ?? ''} editor={editor} />
        <h2>
          <EditableText path="about.cta.titleLine1" value={c.titleLine1 ?? ''} editor={editor} />
          <br />
          <em>
            <EditableText path="about.cta.titleLine2Em" value={c.titleLine2Em ?? ''} editor={editor} />
          </em>
        </h2>
        <EditableText as="p" path="about.cta.sub" value={c.sub ?? ''} editor={editor} />
        <div className="ab-cta-actions">
          <Link href={`/${locale}/contact`} className="ab-btn ab-btn-primary">
            <EditableText path="about.cta.btnPrimary" value={c.btnPrimary ?? ''} editor={editor} />
          </Link>
          <Link href={`/${locale}/products`} className="ab-btn ab-btn-ghost">
            <EditableText path="about.cta.btnSecondary" value={c.btnSecondary ?? ''} editor={editor} />
          </Link>
        </div>
        {cross ? (
          <div style={{ marginTop: 32 }}>
            <Link
              href={cross.href}
              style={{
                color: 'var(--muted)',
                fontSize: 14,
                textDecoration: 'underline',
                letterSpacing: '-.01em',
              }}
            >
              {cross.label}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
