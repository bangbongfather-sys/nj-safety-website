import fs from 'node:fs';
import path from 'node:path';

const PRODUCTS_DIR = path.join(process.cwd(), 'data', 'products');

export type ProductBadge = {
  text: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  style?: string;
};

export type ProductCounter = {
  value: string;
  unit?: string;
  label: string;
};

export type ProductHero = {
  image?: string;
  imageAlt?: string;
  badges?: ProductBadge[];
  counters?: ProductCounter[];
};

export type ProductGalleryItem = {
  image?: string;
  tag?: string;
  label?: string;
  caption?: string;
  span?: string;
};

export type ProductGallery = {
  eyebrow?: string;
  headline?: string;
  note?: string;
  items?: ProductGalleryItem[];
};

export type ProductStatement = {
  eyebrow?: string;
  headline?: string;
  body?: string;
  sign?: string;
};

export type ProductMaterialCallout = {
  tag?: string;
  title?: string;
  body?: string;
};

export type ProductMaterial = {
  eyebrow?: string;
  headline?: string;
  image?: string;
  callouts?: ProductMaterialCallout[];
};

export type ProductFeatureItem = {
  n?: string;
  title?: string;
  body?: string;
  featured?: boolean;
};

export type ProductFeatures = {
  eyebrow?: string;
  headline?: string;
  items?: ProductFeatureItem[];
};

export type ProductSpecRow = { label: string; value: string };

export type ProductSizeTable = {
  unit?: string;
  headers?: string[];
  rows?: string[][];
};

export type ProductSpec = {
  eyebrow?: string;
  headline?: string;
  rows?: ProductSpecRow[];
  sizeTable?: ProductSizeTable;
};

export type ProductFieldItem = {
  n?: string;
  tag?: string;
  title?: string;
  body?: string;
};

export type ProductField = {
  eyebrow?: string;
  headline?: string;
  items?: ProductFieldItem[];
};

export type ProductCareItem = {
  icon?: string;
  title?: string;
  body?: string;
  warn?: boolean;
};

export type ProductCare = {
  eyebrow?: string;
  items?: ProductCareItem[];
};

export type ProductCert = {
  mark?: string;
  title?: string;
  sub?: string;
  highlight?: boolean;
};

export type ProductOrderCell = {
  label?: string;
  value?: string;
  body?: string;
};

export type ProductOrderContact = {
  label?: string;
  value?: string;
};

export type ProductOrder = {
  headline?: string;
  cells?: ProductOrderCell[];
  contact?: ProductOrderContact[];
};

export type Product = {
  slug: string;
  model?: string;
  category?: string;
  name: string;
  subtitle?: string;
  tagline?: string;
  flavor?: string;
  hero?: ProductHero;
  gallery?: ProductGallery;
  statement?: ProductStatement;
  material?: ProductMaterial;
  features?: ProductFeatures;
  spec?: ProductSpec;
  field?: ProductField;
  care?: ProductCare;
  certs?: ProductCert[];
  order?: ProductOrder;
};

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
