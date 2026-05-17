import ko from '@/locales/ko.json';
import en from '@/locales/en.json';

export const locales = ['ko', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ko';

const dictionaries = { ko, en } as const;

/**
 * Per-field visual override produced by the WYSIWYG editor's floating
 * toolbar. Stored on Dictionary.styles keyed by a `data-fp` path
 * (e.g. `hero.headlineLine1`, `clients.stats[0].num`). StyleInjector
 * emits a CSS rule per entry that targets `[data-fp="..."]` so the
 * override applies to every render of that field on every page.
 */
export type FieldStyle = {
  /** CSS font-size value (e.g. '1.1em', '24px'). */
  size?: string;
  /** CSS color (e.g. '#ff6b1a'). */
  color?: string;
  /** CSS font-weight ('300' | '500' | '700' | '900' etc.). */
  weight?: string;
  /** CSS width — applied with display:inline-block so it sticks on inline hosts. */
  width?: string;
  align?: 'left' | 'center' | 'right';
};

/**
 * Hero background CSS filter values, set via the admin edit panel.
 * Each value is a CSS filter coefficient (1.0 = unchanged):
 *   brightness — 0 (black) to 1 (original); we cap UI at 1.0
 *   contrast   — 0.5 (flat) to 2.0 (strong)
 *   saturate   — 0 (greyscale) to 1.5 (vivid)
 * When `siteConfig.heroFilter` is missing on a Dictionary the CSS
 * fallback in globals.css applies instead.
 */
export type HeroFilter = {
  brightness?: number;
  contrast?: number;
  saturate?: number;
};

export type SiteConfig = {
  heroFilter?: HeroFilter;
};

/**
 * One slide in the hero carousel. All fields optional so the renderer can
 * project the legacy single-slide schema (top-level hero.{eyebrow, headline*,
 * tagline, sub, ctaPrimary, ctaSecondary, bgImage}) into a virtual one-item
 * slides[] array when no real slides have been created yet.
 *
 * As soon as the admin clicks "+ 새 슬라이드", the editor migrates the
 * legacy fields into slides[0] and appends a fresh blank slides[1]; from
 * then on every hero edit writes into hero.slides[i].*.
 */
export type HeroSlide = {
  image?: string;
  eyebrow?: string;
  headlineLine1?: string;
  headlineLine2Pre?: string;
  headlineLine2Em?: string;
  tagline?: string;
  sub?: string;
  ctaPrimary?: string;
  /** Per-slide override; defaults to /<locale>/products when missing. */
  ctaPrimaryHref?: string;
  ctaSecondary?: string;
  /** Per-slide override; defaults to /<locale>/contact when missing. */
  ctaSecondaryHref?: string;
  /**
   * Whole-slide click target — when set, clicking the slide background
   * (anywhere outside the CTA buttons / nav / admin controls) navigates
   * here. Use to point a slide at the relevant product detail page.
   * Empty/missing → background is not clickable.
   */
  linkHref?: string;
};

type RawDict = typeof ko;

type RawHero = RawDict['hero'];
type HeroWithSlides = RawHero & {
  /** Legacy single-image background (used when slides[] is empty). */
  bgImage?: string;
  /** Multi-slide carousel data. When set, replaces all top-level hero text. */
  slides?: HeroSlide[];
};

// Both `styles` and `siteConfig` need to be Omit'd from RawDict because
// every save the editor performs further specialises the JSON-inferred
// shape of these fields. Same Omit trick for `hero` so the optional
// `slides[]` we layer in stays open-shape regardless of how the JSON
// has been edited.
export type Dictionary = Omit<RawDict, 'styles' | 'siteConfig' | 'hero'> & {
  hero: HeroWithSlides;
  /** Per-field style overrides keyed by `data-fp` path. */
  styles?: Record<string, FieldStyle>;
  /** Site-wide visual config (hero filter etc.), edited via admin. */
  siteConfig?: SiteConfig;
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] as Dictionary;
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
