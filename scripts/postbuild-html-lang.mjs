// Rewrites <html lang="ko"> → <html lang="en"> on every static page under
// out/en/ after `next build`. Needed because Next 14's root layout sits
// above [locale]/ and can't read params, so SSR/static export emits a
// single hardcoded lang attribute for all routes. The HtmlLang client
// component corrects this post-hydration; this script fixes the initial
// markup that crawlers and screen readers see.

import { promises as fs } from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('out', 'en');

async function walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
  const files = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(p)));
    else if (e.isFile() && p.endsWith('.html')) files.push(p);
  }
  return files;
}

const files = await walk(OUT_DIR);
let touched = 0;
for (const f of files) {
  const src = await fs.readFile(f, 'utf8');
  if (!src.includes('<html lang="ko"')) continue;
  const next = src.replace('<html lang="ko"', '<html lang="en"');
  if (next !== src) {
    await fs.writeFile(f, next, 'utf8');
    touched++;
  }
}
console.log(`postbuild-html-lang: rewrote lang on ${touched}/${files.length} files under out/en/`);
