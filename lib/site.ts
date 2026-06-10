/**
 * Single source of truth for the production URL. Used by:
 *   • metadataBase in app/layout.tsx
 *   • app/sitemap.ts (full URLs are required)
 *   • app/robots.ts
 *   • OG image / canonical URL builders
 *
 * Change here only — never hard-code the domain in components.
 */
export const SITE_URL = 'https://www.njfashion.co.kr';
