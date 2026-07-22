/**
 * Emit `out/products-index.json` — a tiny machine-readable directory of
 * every live product page, generated from `data/products/*.json` after
 * the static export.
 *
 * Consumer: the catalog-app editor's "웹사이트 연동" panel fetches this
 * to (1) list real website products for the operator to pick from and
 * (2) validate that a linked slug actually exists — so a catalog page
 * can never point at a website product page that isn't there.
 *
 * Served by worker/index.ts with `Access-Control-Allow-Origin: *`
 * (the catalog editor runs on a different origin).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PRODUCTS_DIR = path.join(ROOT, 'data', 'products');
const OUT_FILE = path.join(ROOT, 'out', 'products-index.json');

/** The public name fields may carry inline markup (<br>, styled spans). */
function stripHtml(s) {
  return String(s ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const files = fs
  .readdirSync(PRODUCTS_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort();

const products = files.map((f) => {
  const raw = JSON.parse(fs.readFileSync(path.join(PRODUCTS_DIR, f), 'utf-8'));
  const slug = raw.slug ?? f.replace(/\.json$/, '');
  return {
    slug,
    model: stripHtml(raw.model),
    name: stripHtml(raw.name),
    category: stripHtml(raw.category),
    /** Site-relative detail-page path (ko locale is the canonical one). */
    path: `/ko/products/${slug}/`,
  };
});

fs.writeFileSync(
  OUT_FILE,
  JSON.stringify({ generatedAt: new Date().toISOString(), products }, null, 2) + '\n',
);
console.log(`build-products-index: wrote ${products.length} products to out/products-index.json`);
