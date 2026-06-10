import type { MetadataRoute } from 'next';
import fs from 'node:fs';
import path from 'node:path';
import { SITE_URL } from '@/lib/site';
import { locales } from '@/lib/i18n';
import { getAllProductSlugs } from '@/lib/products';

export const dynamic = 'force-static';

type NoticeFile = { notices?: Array<{ id: string }> };

function readNoticeIds(): string[] {
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), 'data', 'notices.json'),
      'utf-8',
    );
    const parsed = JSON.parse(raw) as NoticeFile;
    return (parsed.notices ?? []).map((n) => n.id);
  } catch {
    return [];
  }
}

function readCategoryIds(): string[] {
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), 'data', 'product-categories.json'),
      'utf-8',
    );
    const parsed = JSON.parse(raw) as { categories?: Array<{ id: string }> };
    return (parsed.categories ?? []).map((c) => c.id);
  } catch {
    return [];
  }
}

/**
 * Static routes that exist for every locale. Product/notice/category routes
 * are appended dynamically.
 */
const STATIC_ROUTES = [
  '/',
  '/about/',
  '/about/capabilities/',
  '/products/',
  '/notices/',
  '/contact/',
  '/resources/',
  '/resources/size-guide/',
  '/resources/test-reports/',
  '/privacy/',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const products = getAllProductSlugs();
  const notices = readNoticeIds();
  const categories = readCategoryIds();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const route of STATIC_ROUTES) {
      entries.push({
        url: `${SITE_URL}/${locale}${route}`,
        lastModified: now,
        changeFrequency: route === '/' ? 'weekly' : 'monthly',
        priority: route === '/' ? 1 : 0.7,
      });
    }
    for (const slug of products) {
      entries.push({
        url: `${SITE_URL}/${locale}/products/${slug}/`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.8,
      });
    }
    for (const id of categories) {
      entries.push({
        url: `${SITE_URL}/${locale}/products/category/${id}/`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }
    for (const id of notices) {
      entries.push({
        url: `${SITE_URL}/${locale}/notices/${id}/`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.4,
      });
    }
  }

  return entries;
}
