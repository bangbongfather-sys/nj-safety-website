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

type RawDict = typeof ko;

export type Dictionary = Omit<RawDict, 'styles'> & {
  /** Per-field style overrides. Optional — most dicts won't have this. */
  styles?: Record<string, FieldStyle>;
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] as Dictionary;
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
