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

type RawDict = typeof ko;

// Both `styles` and `siteConfig` need to be Omit'd from RawDict because
// every save the editor performs further specialises the JSON-inferred
// shape of these fields. Without the Omit the intersection narrows them
// past the open shape we want, and code that does `delete d.siteConfig`
// or spreads a Record fails to type-check.
export type Dictionary = Omit<RawDict, 'styles' | 'siteConfig'> & {
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
