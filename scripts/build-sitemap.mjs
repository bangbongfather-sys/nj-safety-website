// Emits out/sitemap.xml from whatever `next build` actually produced.
//
// Walking out/ rather than declaring routes by hand means the sitemap
// can't drift from reality — new products, notices and category pages
// appear the moment their static page does.
//
// Each ko page is paired with its en twin via hreflang alternates, so
// search engines serve the right language instead of picking one and
// treating the other as duplicate content.

import { promises as fs } from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('out');
const SITE_TS = path.resolve('lib', 'site.ts');

// lib/site.ts is the single source of truth for the canonical origin.
// Read it with a regex rather than importing — this is a plain .mjs
// script and the export lives in TypeScript.
const siteSrc = await fs.readFile(SITE_TS, 'utf8');
const match = siteSrc.match(/SITE_URL\s*=\s*['"]([^'"]+)['"]/);
if (!match) {
  console.error('build-sitemap: could not read SITE_URL from lib/site.ts');
  process.exit(1);
}
const ORIGIN = match[1].replace(/\/+$/, '');

/** Every directory under out/ that holds an index.html, as a URL path. */
async function collectPaths(dir, base = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const paths = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    // Admin screens are private tooling and 404/_next are plumbing.
    if (e.name === 'admin' || e.name === '_next' || e.name.startsWith('.')) continue;
    const child = path.join(dir, e.name);
    const urlPath = `${base}/${e.name}`;
    try {
      await fs.access(path.join(child, 'index.html'));
      paths.push(urlPath);
    } catch {
      // No page at this level — keep descending for nested routes.
    }
    paths.push(...(await collectPaths(child, urlPath)));
  }
  return paths;
}

const all = await collectPaths(OUT_DIR);

// Pair /ko/x with /en/x. Locale-less paths (there shouldn't be any left)
// are emitted on their own.
const koPaths = all.filter((p) => p === '/ko' || p.startsWith('/ko/'));
const enSet = new Set(all.filter((p) => p === '/en' || p.startsWith('/en/')));

const today = new Date().toISOString().slice(0, 10);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const entries = koPaths.map((ko) => {
  const rest = ko.slice(3); // strip '/ko'
  const en = `/en${rest}`;
  const hasEn = enSet.has(en);
  const alternates = [
    `    <xhtml:link rel="alternate" hreflang="ko" href="${esc(ORIGIN + ko + '/')}"/>`,
    hasEn ? `    <xhtml:link rel="alternate" hreflang="en" href="${esc(ORIGIN + en + '/')}"/>` : null,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(ORIGIN + ko + '/')}"/>`,
  ].filter(Boolean);
  return [
    '  <url>',
    `    <loc>${esc(ORIGIN + ko + '/')}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    ...alternates,
    '  </url>',
  ].join('\n');
});

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ...entries,
  '</urlset>',
  '',
].join('\n');

await fs.writeFile(path.join(OUT_DIR, 'sitemap.xml'), xml, 'utf8');

// robots.txt is generated here too so its Sitemap: line always points at
// the same origin the sitemap was built for. Shipping it as a static
// public/ file would hardcode a domain and go stale the moment the site
// moves. Without our own file Cloudflare serves a synthesized default
// that has no Sitemap: line at all.
const robots = [
  'User-agent: *',
  'Allow: /',
  'Disallow: /admin/',
  '',
  `Sitemap: ${ORIGIN}/sitemap.xml`,
  '',
].join('\n');
await fs.writeFile(path.join(OUT_DIR, 'robots.txt'), robots, 'utf8');

console.log(`build-sitemap: wrote ${koPaths.length} URLs to out/sitemap.xml + robots.txt (origin ${ORIGIN})`);
