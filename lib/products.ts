import fs from 'node:fs';
import path from 'node:path';
import type { ProductPageData } from './product-page-types';

export type Product = ProductPageData;

const PRODUCTS_DIR = path.join(process.cwd(), 'data', 'products');

function readDirSafe(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

export function getAllProductSlugs(): string[] {
  return readDirSafe(PRODUCTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
}

export function getProduct(slug: string): Product | null {
  const file = path.join(PRODUCTS_DIR, `${slug}.json`);
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    const data = JSON.parse(raw) as Product;
    if (!data.slug) data.slug = slug;
    return data;
  } catch {
    return null;
  }
}

export function getAllProducts(): Product[] {
  return getAllProductSlugs()
    .map((s) => getProduct(s))
    .filter((p): p is Product => p !== null);
}
