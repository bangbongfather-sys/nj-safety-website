/**
 * Types and constants for site-wide resources, shared between the
 * server-rendered /resources page and the client-side admin screen.
 *
 * Split out from `lib/site-resources.ts` because that module reads the
 * JSON with `node:fs`, which webpack refuses to bundle into a
 * `'use client'` component. Anything the admin needs lives here; the
 * filesystem readers stay in the server-only module.
 */

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

/** One row on the general 자료실 board. */
export type SiteDocument = {
  /** Stable id — also the React key and the target of edit/delete. */
  id: string;
  title: string;
  /** Optional English title; falls back to `title` when absent. */
  titleEn?: string;
  desc?: string;
  descEn?: string;
  /** One of DOCUMENT_CATEGORIES[].key. Unknown values fall back to 'general'. */
  category: string;
  /** Public R2 URL. */
  fileUrl: string;
  /** Original filename, shown to the visitor and used for the download name. */
  fileName: string;
  /** Uppercase extension for the badge (PDF, XLSX, HWP …). */
  ext?: string;
  size?: number;
  uploadedAt?: string;
};

export type SiteResources = {
  catalog?: CatalogFile;
  documents?: SiteDocument[];
};

/**
 * Board categories. Structural (the key is stored in JSON), so these
 * are defined in code rather than the editable dictionary — renaming a
 * label here is safe, changing a key would orphan existing documents.
 */
export const DOCUMENT_CATEGORIES = [
  { key: 'general', ko: '일반 자료', en: 'General' },
  { key: 'guide', ko: '안내서·매뉴얼', en: 'Guides & manuals' },
  { key: 'form', ko: '서식·양식', en: 'Forms' },
  { key: 'cert', ko: '인증서', en: 'Certificates' },
  { key: 'price', ko: '단가표', en: 'Price lists' },
] as const;

export function documentCategoryLabel(key: string, locale: 'ko' | 'en'): string {
  const found = DOCUMENT_CATEGORIES.find((c) => c.key === key);
  const fallback = DOCUMENT_CATEGORIES[0];
  return (found ?? fallback)[locale];
}

/** Uppercase extension from a filename, for the file-type badge. */
export function fileExt(fileName: string): string {
  const m = /\.([a-z0-9]{1,8})$/i.exec(fileName.trim());
  return m ? m[1].toUpperCase() : 'FILE';
}
