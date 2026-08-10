/**
 * Emit `out/search-index.json` — everything the site-wide search can find.
 *
 * The site is a static export with no server to query, so search runs in
 * the browser against this file. It's fetched once, on the first search,
 * and cached for the session.
 *
 * Entries are deliberately flat: one record per destination URL, with a
 * pre-joined `text` blob the client substring-matches against. The site
 * is small (tens of records) so an inverted index would be more machinery
 * than the data justifies; if this ever passes a few hundred entries,
 * that's the point to reconsider.
 *
 * Bilingual sources emit one record per locale; Korean-only sources (the
 * product JSONs) are indexed once and shown in both — a visitor on /en
 * still needs to find 아라미드 by its model number.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_FILE = path.join(ROOT, 'out', 'search-index.json');

/** Product/notice copy carries inline markup (<br>, styled spans). */
function stripHtml(s) {
  return String(s ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Every string in a nested object, flattened. Used for product bodies so
 * a new field in the product schema becomes searchable without anyone
 * remembering to add it here.
 */
function collectStrings(node, out = [], depth = 0) {
  if (depth > 8 || out.length > 400) return out;
  if (typeof node === 'string') {
    const t = stripHtml(node);
    // Skip URLs and style blobs — they're noise that would match nothing
    // a person types.
    if (t && t.length < 400 && !/^https?:\/\//.test(t) && !/^[a-z-]+:\s*[^;]+;/.test(t)) out.push(t);
    return out;
  }
  if (Array.isArray(node)) {
    for (const v of node) collectStrings(v, out, depth + 1);
    return out;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k === 'image' || k === 'images' || k === 'video' || k === 'href' || k === 'linkHref') continue;
      collectStrings(v, out, depth + 1);
    }
  }
  return out;
}

const records = { ko: [], en: [] };
const push = (locale, rec) => records[locale].push(rec);
const pushBoth = (rec) => {
  push('ko', { ...rec, url: rec.url.replace('{loc}', 'ko') });
  push('en', { ...rec, url: rec.url.replace('{loc}', 'en') });
};

/* ── 제품 ─────────────────────────────────────────────────────────── */
const productsDir = path.join(ROOT, 'data', 'products');
const productFiles = fs.existsSync(productsDir)
  ? fs.readdirSync(productsDir).filter((f) => f.endsWith('.json')).sort()
  : [];

for (const f of productFiles) {
  const raw = readJson(path.join('data', 'products', f));
  if (!raw) continue;
  const slug = raw.slug ?? f.replace(/\.json$/, '');
  const title = stripHtml(raw.name) || slug;
  const body = collectStrings(raw).join(' ').slice(0, 900);
  pushBoth({
    kind: 'product',
    title,
    sub: [stripHtml(raw.model), stripHtml(raw.category)].filter(Boolean).join(' · '),
    text: `${title} ${stripHtml(raw.model)} ${stripHtml(raw.category)} ${stripHtml(raw.subtitle)} ${body}`,
    url: `/{loc}/products/${slug}/`,
  });
}

/* ── 공지사항 ─────────────────────────────────────────────────────── */
const notices = readJson('data/notices.json')?.notices ?? [];
for (const n of notices) {
  for (const loc of ['ko', 'en']) {
    const title = stripHtml(loc === 'en' ? n.titleEn || n.titleKo : n.titleKo);
    const body = stripHtml(loc === 'en' ? n.bodyEn || n.bodyKo : n.bodyKo);
    if (!title) continue;
    push(loc, {
      kind: 'notice',
      title,
      sub: n.date,
      text: `${title} ${body}`.slice(0, 900),
      url: `/${loc}/notices/${n.id}/`,
    });
  }
}

/* ── 자료실 ───────────────────────────────────────────────────────── */
const resources = readJson('data/site-resources.json') ?? {};
if (resources.catalog?.pdfUrl) {
  pushBoth({
    kind: 'resource',
    title: resources.catalog.label || '카탈로그',
    sub: 'PDF',
    text: `${resources.catalog.label || ''} 카탈로그 catalog PDF`,
    url: `/{loc}/resources/`,
  });
}
for (const d of resources.documents ?? []) {
  for (const loc of ['ko', 'en']) {
    const title = (loc === 'en' ? d.titleEn || d.title : d.title) || d.fileName;
    if (!title) continue;
    push(loc, {
      kind: 'resource',
      title,
      sub: [d.ext, loc === 'en' ? d.descEn || d.desc : d.desc].filter(Boolean).join(' · '),
      text: `${title} ${d.desc ?? ''} ${d.descEn ?? ''} ${d.fileName ?? ''}`,
      url: `/${loc}/resources/`,
    });
  }
}

/* ── 대리점 ───────────────────────────────────────────────────────── */
const dealersRaw = readJson('data/dealers.json');
const dealers = Array.isArray(dealersRaw) ? dealersRaw : dealersRaw?.dealers ?? [];
for (const d of dealers) {
  const title = stripHtml(d.name ?? '');
  if (!title) continue;
  pushBoth({
    kind: 'dealer',
    title,
    sub: [d.region, d.city].filter(Boolean).join(' · '),
    text: `${title} ${d.region ?? ''} ${d.city ?? ''} ${d.address ?? ''} ${d.phone ?? ''}`,
    url: `/{loc}/dealers/`,
  });
}

/* ── 주요 페이지 ──────────────────────────────────────────────────── */
for (const loc of ['ko', 'en']) {
  const dict = readJson(`locales/${loc}.json`);
  if (!dict) continue;
  const nav = dict.nav ?? {};
  const pages = [
    { key: 'about', url: `/${loc}/about/`, extra: dict.about?.hero },
    { key: 'products', url: `/${loc}/products/`, extra: dict.products },
    { key: 'notices', url: `/${loc}/notices/`, extra: dict.notices?.hero },
    { key: 'resources', url: `/${loc}/resources/`, extra: dict.resources?.hero },
    { key: 'dealers', url: `/${loc}/dealers/`, extra: dict.dealers?.hero },
    { key: 'contact', url: `/${loc}/contact/`, extra: dict.contact?.hero },
  ];
  for (const p of pages) {
    const title = nav[p.key];
    if (!title) continue;
    push(loc, {
      kind: 'page',
      title,
      sub: loc === 'ko' ? '페이지' : 'Page',
      text: `${title} ${collectStrings(p.extra).join(' ').slice(0, 400)}`,
      url: p.url,
    });
  }
}

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(records), 'utf-8');

const bytes = fs.statSync(OUT_FILE).size;
console.log(
  `build-search-index: ko ${records.ko.length} · en ${records.en.length} entries → out/search-index.json (${(bytes / 1024).toFixed(1)} KB)`,
);
