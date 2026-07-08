'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dictionary, Locale } from '@/lib/i18n';
import type { Product } from '@/lib/products';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';

type Props = {
  locale: Locale;
  dict: Dictionary;
  /** Real product list fetched server-side and passed in. Empty when
   *  the catalog is empty or the caller (e.g. /admin/edit) doesn't have
   *  filesystem access. */
  products?: Product[];
  editor?: EditorApi;
};

function stripTags(s: string | undefined): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim();
}

/**
 * Card images: main = shopHeader.images[0] (or hero/gallery fallback);
 * hover = shopHeader.images[1] (or gallery item #2). Mirrors the
 * /[locale]/products list-page logic so the homepage carousel and
 * the full catalog stay in sync.
 */
function getCardImages(p: Product): { main?: string; hover?: string } {
  const shop = (p.shopHeader?.images ?? []).filter((s): s is string => !!s);
  if (shop.length > 0) return { main: shop[0], hover: shop[1] };
  const fallback: string[] = [];
  if (p.hero?.image) fallback.push(p.hero.image);
  for (const it of p.gallery?.items ?? []) {
    if (it.image && !fallback.includes(it.image)) fallback.push(it.image);
  }
  return { main: fallback[0], hover: fallback[1] };
}

/**
 * Homepage Products section.
 *
 * Was 3 hardcoded SEASON cards on a dark background. Now a horizontal
 * carousel of REAL products from data/products/*.json on a clean
 * light card surface — same brand pattern Mammut / Arc'teryx /
 * Engelbert Strauss use for their "New Arrivals" rail.
 *
 * Each card cross-fades to a second photo on hover; both come from
 * shopHeader.images so admin curates them via /admin/products. No
 * prices — the brand is B2B and quotes go through the contact form.
 */
export default function Products({ locale, dict, products, editor }: Props) {
  const p = dict.products;
  // Server callers (the public homepage) pass the real product list in;
  // client callers (the WYSIWYG editor at /admin/edit) just see an
  // empty rail — the admin curates products from /admin/products
  // anyway, so it's not worth re-fetching here.
  const items = products ?? [];

  // ── Carousel arrows ────────────────────────────────────────────────
  // The rail is a native overflow-x scroller; the arrows just nudge it by
  // one card (card width + gap) and reflect scroll position so we can
  // disable each end + hide both when nothing overflows.
  const railRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const syncArrows = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    // The rail has a left inset (padding) so the first card bleeds toward
    // the section edge; snap rests the first card at scrollLeft ≈ paddingLeft,
    // NOT 0. Use that as the "start" baseline so 이전 arrow hides at the start.
    const padLeft = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > padLeft + 4);
    setCanNext(el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    syncArrows();
    el.addEventListener('scroll', syncArrows, { passive: true });
    window.addEventListener('resize', syncArrows);
    return () => {
      el.removeEventListener('scroll', syncArrows);
      window.removeEventListener('resize', syncArrows);
    };
  }, [syncArrows, items.length]);

  const scrollByCard = useCallback((dir: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    // One card = first li width + the grid gap; fall back to 80% viewport.
    const li = el.querySelector<HTMLElement>('.pl-card-li');
    const gap = parseFloat(getComputedStyle(el.querySelector('.products-light-grid') as Element).columnGap || '0') || 0;
    const step = li ? li.offsetWidth + gap : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  }, []);

  return (
    <section className="products products-light" id="products" data-screen-label="02 Products">
      <div className="wrap">
        <div className="section-head products-light-head">
          <div className="l">
            <EditableText as="span" className="eyebrow" path="products.eyebrow" value={p.eyebrow} editor={editor} />
            <h2 className="title">
              <EditableText path="products.titlePre" value={p.titlePre} editor={editor} />
              <em>
                <EditableText path="products.titleEm" value={p.titleEm} editor={editor} />
              </em>
            </h2>
          </div>
          <Link href={`/${locale}/products`} className="r">
            <EditableText path="products.viewAll" value={p.viewAll} editor={editor} />
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="products-light-empty">
            {locale === 'ko'
              ? '등록된 제품이 없습니다. /admin/products 에서 추가하세요.'
              : 'No products yet. Add some at /admin/products.'}
          </div>
        ) : (
          <div className="products-light-rail">
            <button
              type="button"
              className={`pl-nav pl-nav-prev${canPrev ? '' : ' is-hidden'}`}
              onClick={() => scrollByCard(-1)}
              aria-label={locale === 'ko' ? '이전 제품' : 'Previous products'}
            >
              ‹
            </button>
            <button
              type="button"
              className={`pl-nav pl-nav-next${canNext ? '' : ' is-hidden'}`}
              onClick={() => scrollByCard(1)}
              aria-label={locale === 'ko' ? '다음 제품' : 'Next products'}
            >
              ›
            </button>
          <div className="products-light-scroll" ref={railRef}>
            <ul className="products-light-grid">
              {items.map((prod) => {
                const { main, hover } = getCardImages(prod);
                return (
                  <li key={prod.slug} className="pl-card-li">
                    <Link
                      href={`/${locale}/products/${prod.slug}/`}
                      className="pl-card"
                      aria-label={stripTags(prod.name)}
                    >
                      <div className="pl-card-frame">
                        {main ? (
                          <>
                            {/* next/image with `fill` overlays the parent
                             * frame so the existing absolute-positioned
                             * cross-fade CSS keeps working unchanged.
                             * `sizes` reflects the layout: mobile/tablet
                             * (<1024px) the rail is 1-up snap-scroll
                             * (≈70vw card per design), ≥1024px it's a
                             * 3-up grid (≈33vw per card). Unoptimized
                             * mode (next.config) means the browser still
                             * gets the original source URL, but the
                             * width / srcset metadata helps preload
                             * priority + a11y. */}
                            <Image
                              src={main}
                              alt={stripTags(prod.name)}
                              className="pl-card-img pl-card-img-main"
                              fill
                              sizes="(max-width: 1023px) 70vw, 33vw"
                              loading="lazy"
                              unoptimized
                            />
                            {hover ? (
                              <Image
                                src={hover}
                                alt=""
                                aria-hidden
                                className="pl-card-img pl-card-img-hover"
                                fill
                                sizes="(max-width: 1023px) 70vw, 33vw"
                                loading="lazy"
                                unoptimized
                              />
                            ) : null}
                          </>
                        ) : (
                          <span className="pl-card-ph">IMG</span>
                        )}
                      </div>
                      <div className="pl-card-meta">
                        {prod.category ? (
                          <span className="pl-card-cat">{prod.category}</span>
                        ) : null}
                        <span className="pl-card-name">{stripTags(prod.name)}</span>
                        {prod.subtitle ? (
                          <span className="pl-card-sub">{prod.subtitle}</span>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          </div>
        )}
      </div>
    </section>
  );
}
