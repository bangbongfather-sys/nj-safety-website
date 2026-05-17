/**
 * Server entry for the per-product WYSIWYG editor route.
 *
 * Reason this is split from the client component: we use Next's static
 * `output: export` mode, so every dynamic [slug] route must be enumerable
 * at build time via `generateStaticParams`. That export has to live on
 * the server side; `EditProductPageClient` carries the actual editing
 * logic with `'use client'`.
 */

import { getAllProductSlugs } from '@/lib/products';
import EditProductPageClient from './EditProductPageClient';

export function generateStaticParams() {
  return getAllProductSlugs().map((slug) => ({ slug }));
}

export default function EditProductRoute() {
  // Slug is read via `useParams()` in the client component — keeping
  // this server entry stateless means we don't need to await/forward
  // the route params here.
  return <EditProductPageClient />;
}
