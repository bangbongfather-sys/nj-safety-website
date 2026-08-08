/**
 * Site-wide downloadable resources — server-side readers.
 *
 * Lives at `data/site-resources.json` and is managed from
 * `/admin/resources`. Two kinds live here:
 *
 *   - `catalog` — the single brand catalog PDF, which keeps its own
 *     featured card at the top of /resources.
 *   - `documents` — the general 자료실 board. Any file the admin wants
 *     to publish (단가표, 서식, 안내서, 인증서 …) with a free-text title
 *     and description. This is the open-ended list; `catalog` stays
 *     separate only because it has a dedicated card design.
 *
 * Test-report PDFs are still per-product (they live on each product's
 * `testReports.files`) because each cert is tied to a specific SKU.
 * Only files that are not product-specific belong here.
 *
 * Types and category constants live in `site-resources-shared.ts` so
 * the client-side admin can import them without dragging `node:fs`
 * into its bundle.
 */
import fs from 'node:fs';
import path from 'node:path';
import raw from '@/data/site-resources.json';
import type { SiteDocument, SiteResources } from './site-resources-shared';

export type { CatalogFile, SiteDocument, SiteResources } from './site-resources-shared';
export { DOCUMENT_CATEGORIES, documentCategoryLabel, fileExt } from './site-resources-shared';

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

/**
 * Board rows, newest first, with anything missing a file dropped —
 * a half-written entry shouldn't render as a dead link.
 */
export function getDocuments(s: SiteResources): SiteDocument[] {
  return (s.documents ?? [])
    .filter((d) => !!d?.fileUrl && !!d?.title)
    .slice()
    .sort((a, b) => ((a.uploadedAt ?? '') < (b.uploadedAt ?? '') ? 1 : -1));
}
