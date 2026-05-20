/**
 * Brand-level downloadable resources (currently: the catalog PDF).
 *
 * Lives at `data/site-resources.json` and is managed from
 * `/admin/resources`. Separate from `data/product-categories.json`
 * and per-product `data/products/<slug>.json` so a single
 * single-file write covers all "site-wide" downloads — the catalog
 * card on /resources, future site-wide PDFs etc.
 *
 * Test-report PDFs are still per-product (they live on each
 * product's `testReports.files`) because each cert is tied to a
 * specific SKU. Only files that are not product-specific belong here.
 */
import fs from 'node:fs';
import path from 'node:path';
import raw from '@/data/site-resources.json';

export type CatalogFile = {
  /** Public R2 URL (with cache-bust query). Empty string = no file yet. */
  pdfUrl?: string;
  /** ISO timestamp of last upload. */
  uploadedAt?: string;
  /** Byte size — drives the "1.2 MB" hint on the resources card. */
  size?: number;
  /** Display label on the resources card. Edited via /admin/resources. */
  label?: string;
};

export type SiteResources = {
  catalog?: CatalogFile;
};

const RESOURCES_PATH = path.join(process.cwd(), 'data', 'site-resources.json');

export function getSiteResources(): SiteResources {
  try {
    const text = fs.readFileSync(RESOURCES_PATH, 'utf-8');
    return JSON.parse(text) as SiteResources;
  } catch {
    // Fall back to the bundled JSON if the file is missing/unreadable.
    return raw as SiteResources;
  }
}

export function hasCatalogPdf(s: SiteResources): boolean {
  return !!s.catalog?.pdfUrl;
}
