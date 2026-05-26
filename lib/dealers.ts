/**
 * Authorised dealer registry — drives the /dealers public page.
 *
 * Edited from `/admin/dealers`. Two top-level arrays:
 *   - `regions`: ordered region buckets shown as headers on the public
 *     page. Each carries ko/en labels so the dealer list groups
 *     stay localised.
 *   - `dealers`: flat list. Each dealer has a `regionId` pointing at
 *     one of the regions above. Empty regions render as a placeholder
 *     band ("등록 예정") on the public page so the layout reads as a
 *     complete national grid even when a region has no entries yet.
 */
import fs from 'node:fs';
import path from 'node:path';
import raw from '@/data/dealers.json';

export type DealerRegion = {
  id: string;
  ko: string;
  en: string;
};

export type Dealer = {
  /** Stable internal id — used as React key + admin reference. */
  id: string;
  /** Foreign key into regions[].id. */
  regionId: string;
  /** Dealer storefront name. */
  name: string;
  /** Street address (single line; admin can include line breaks). */
  addr?: string;
  tel?: string;
  fax?: string;
  email?: string;
  /** Business hours — free text, e.g. "평일 09:00 – 18:00". */
  hours?: string;
  /** Contact person / role. */
  manager?: string;
  /** Free-text note shown beneath the card body. */
  note?: string;
};

export type DealersFile = {
  regions: DealerRegion[];
  dealers: Dealer[];
};

const FILE = path.join(process.cwd(), 'data', 'dealers.json');

export function getDealersFile(): DealersFile {
  try {
    const text = fs.readFileSync(FILE, 'utf-8');
    const parsed = JSON.parse(text) as DealersFile;
    return {
      regions: Array.isArray(parsed.regions) ? parsed.regions : [],
      dealers: Array.isArray(parsed.dealers) ? parsed.dealers : [],
    };
  } catch {
    return raw as DealersFile;
  }
}

/** Region label by current locale; falls back to id on missing. */
export function regionName(r: DealerRegion, locale: 'ko' | 'en'): string {
  if (locale === 'en') return r.en || r.ko || r.id;
  return r.ko || r.en || r.id;
}
