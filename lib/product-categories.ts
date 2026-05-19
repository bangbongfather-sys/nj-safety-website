/**
 * Product subcategories — drives the "제품" nav dropdown and the
 * /<locale>/products/category/[id] landing pages. Edited from the
 * admin (`/admin/products/categories`) and committed straight to
 * `data/product-categories.json`, so the next Cloudflare build picks
 * up new/renamed categories automatically.
 *
 * One canonical source for both locales — each category carries
 * `nameKo` + `nameEn` so the dropdown renders the right label and
 * the relationship (which products live under which category) stays
 * shared. Product slugs are simple strings; an unknown slug is just
 * dropped at render time so a stale assignment can't break the page.
 */
import fs from 'node:fs';
import path from 'node:path';
import raw from '@/data/product-categories.json';

export type ProductCategory = {
  id: string;
  nameKo: string;
  nameEn: string;
  productSlugs: string[];
};

type CategoriesFile = { categories: ProductCategory[] };

// Used at build time on the server. We re-read the file from disk
// instead of relying on the JSON import alone so that admin edits
// during `next build` (very unusual, but possible) take effect — the
// import is otherwise frozen at module-eval time.
const CATEGORIES_PATH = path.join(process.cwd(), 'data', 'product-categories.json');

export function getAllCategories(): ProductCategory[] {
  try {
    const text = fs.readFileSync(CATEGORIES_PATH, 'utf-8');
    const parsed = JSON.parse(text) as CategoriesFile;
    return Array.isArray(parsed.categories) ? parsed.categories : [];
  } catch {
    // Fall back to the bundled JSON if the file is missing/unreadable —
    // the build-time import below is the same shape.
    return (raw as CategoriesFile).categories ?? [];
  }
}

export function getCategory(id: string): ProductCategory | null {
  return getAllCategories().find((c) => c.id === id) ?? null;
}

/** Pick the label for the current locale, falling back to whichever side is filled. */
export function categoryName(c: ProductCategory, locale: 'ko' | 'en'): string {
  if (locale === 'en') return c.nameEn || c.nameKo || c.id;
  return c.nameKo || c.nameEn || c.id;
}
