import ko from '@/locales/ko.json';
import en from '@/locales/en.json';

export const locales = ['ko', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ko';

const dictionaries = { ko, en } as const;

export type Dictionary = typeof ko;

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
