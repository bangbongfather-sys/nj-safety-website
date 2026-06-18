/* NJ SAFETY admin service worker — makes /admin usable in airplane mode.
 *
 * Strategy
 *   · install: precache every static /admin route's HTML, then parse each
 *     page for its /_next/static chunk URLs and precache those too, so the
 *     editor opens offline even on routes never visited before.
 *   · /_next/static/* : cache-first (immutable, content-hashed filenames).
 *   · /api/*          : network only — never cache worker API calls.
 *   · everything else (same-origin GET): network-first, falling back to
 *     the cache when offline. Pages browsed online keep working offline.
 *
 * Registered from components/admin/SwRegistrar.tsx (admin shell only),
 * but served from the site root so its scope covers /_next assets.
 */

const CACHE = 'nj-admin-v1';

// Static admin routes from the Next export. Dynamic product-edit pages
// (/admin/products/<slug>/edit/) are runtime-cached on first visit and
// also reachable offline via client-side navigation from /admin/products/.
const PRECACHE_PAGES = [
  '/admin/',
  '/admin/edit/',
  '/admin/text/',
  '/admin/settings/',
  '/admin/notices/',
  '/admin/products/',
  '/admin/products/categories/',
  '/admin/products/upload/',
  '/admin/products-page/edit/',
  '/admin/resources/',
  '/admin/about/edit/',
  '/admin/contact/edit/',
];

// Pull /_next/static asset URLs (JS chunks + CSS) out of a page's HTML so
// they can be precached alongside it.
function extractAssets(html) {
  const re = /\/_next\/static\/[^"'\s>]+/g;
  const found = html.match(re) || [];
  return Array.from(new Set(found));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const assetSet = new Set();
      await Promise.all(
        PRECACHE_PAGES.map(async (page) => {
          try {
            const res = await fetch(page, { cache: 'no-cache' });
            if (!res.ok) return;
            const html = await res.clone().text();
            await cache.put(page, res);
            for (const a of extractAssets(html)) assetSet.add(a);
          } catch {
            /* offline install — skip */
          }
        }),
      );
      await Promise.all(
        Array.from(assetSet).map(async (url) => {
          try {
            const hit = await cache.match(url);
            if (hit) return;
            const res = await fetch(url);
            if (res.ok) await cache.put(url, res);
          } catch {
            /* skip */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // GitHub API 등 외부는 통과
  if (url.pathname.startsWith('/api/')) return;    // 워커 API는 캐시 금지

  // Immutable build assets: cache-first.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
        }
        return res;
      })(),
    );
    return;
  }

  // Everything else same-origin: network-first with cache fallback, so
  // deploys are picked up immediately while offline still works.
  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        if (res.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
        }
        return res;
      } catch (e) {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        // Navigation with no exact cache hit: fall back to the admin hub
        // so the user lands somewhere functional instead of a browser error.
        if (req.mode === 'navigate' && url.pathname.startsWith('/admin')) {
          const hub = await caches.match('/admin/');
          if (hub) return hub;
        }
        throw e;
      }
    })(),
  );
});
