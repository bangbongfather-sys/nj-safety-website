'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Dictionary, Locale } from '@/lib/i18n';

/**
 * Mobile hamburger + right-slide drawer for the top nav.
 * Rendered alongside the desktop menu in Navigation.tsx — the hamburger
 * button is `nav:hidden` (hidden ≥ 1100px) and the desktop menu is
 * `hidden nav:flex`, so exactly one of the two UIs is visible at any
 * viewport width.
 *
 * UX notes:
 * - Drawer slides in from the right (industrial B2B convention,
 *   keeps the logo + brand on the left throughout the animation).
 * - Backdrop tap, Esc key, and route change all close it.
 * - Body scroll is locked while open (overflow:hidden on <body>).
 * - Each nav entry with sub-items renders as an accordion row.
 */

type DropdownItem = { href: string; label: string };

type Link = {
  href: string;
  key: keyof Dictionary['nav'];
  label: string;
  /** Empty array → plain link, no accordion. */
  items: DropdownItem[];
  /** "전체 X" link prepended inside the accordion, or null to omit. */
  allLabel: string | null;
};

type Props = {
  locale: Locale;
  otherLocale: Locale;
  toggleHref: string;
  links: Link[];
  quoteCta: string;
  quoteHref: string;
};

export default function MobileNav({
  locale,
  otherLocale,
  toggleHref,
  links,
  quoteCta,
  quoteHref,
}: Props) {
  const pathname = usePathname() ?? '';
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);
  // Portal target — only available after mount (no `document` during SSR).
  // The drawer must escape the parent <nav> because that ancestor uses
  // backdrop-filter, which on iOS Safari (and per the filter-effects-2
  // spec) creates a containing block for fixed-positioned descendants —
  // without the portal the drawer + backdrop get clipped to the nav bar.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  // Mirrors `open` in a ref so the deferred focus setTimeout below can
  // check the *current* value at fire time. Without this, a rapid
  // open→close→open→close inside the 60ms window can leave a pending
  // focus() that lands on the (now-hidden) drawer's first link.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  // Track the pathname so we can auto-close the drawer when the route
  // changes. We can't just listen to clicks on links because Next's Link
  // sometimes uses pushState without a full nav event we'd otherwise see.
  const lastPathRef = useRef(pathname);

  // Auto-close on route change.
  useEffect(() => {
    if (pathname !== lastPathRef.current) {
      lastPathRef.current = pathname;
      setOpen(false);
    }
  }, [pathname]);

  // Body scroll lock + Esc key handling while open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    // Focus the first link for keyboard users. setTimeout because the
    // drawer transitions in — focusing mid-animation can cause the
    // page to scroll before overflow:hidden takes effect.
    // Re-check openRef at fire time: if the drawer was closed again
    // inside the 60ms window we'd otherwise focus a hidden link.
    const t = window.setTimeout(() => {
      if (openRef.current) firstLinkRef.current?.focus();
    }, 60);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [open]);

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openLabel = locale === 'en' ? 'Open menu' : '메뉴 열기';
  const closeLabel = locale === 'en' ? 'Close menu' : '메뉴 닫기';
  const drawerLabel = locale === 'en' ? 'Mobile menu' : '모바일 메뉴';

  return (
    <>
      {/* Hamburger button — only visible below the `nav` breakpoint. */}
      <button
        type="button"
        aria-label={open ? closeLabel : openLabel}
        aria-expanded={open}
        aria-controls="mobile-drawer"
        onClick={() => setOpen((o) => !o)}
        className="nav:hidden inline-flex items-center justify-center w-11 h-11 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded-md"
      >
        {/* Two-line + middle bar; transforms into an X when open. The
            middle bar fades, top/bottom rotate. CSS transitions are
            cheap and avoid swapping two SVGs (which flickers). */}
        <span className="relative block w-6 h-5" aria-hidden="true">
          <span
            className={`absolute left-0 right-0 h-[2px] bg-current transition-transform duration-300 ease-out ${
              open ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0'
            }`}
          />
          <span
            className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-current transition-opacity duration-200 ${
              open ? 'opacity-0' : 'opacity-100'
            }`}
          />
          <span
            className={`absolute left-0 right-0 h-[2px] bg-current transition-transform duration-300 ease-out ${
              open ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'bottom-0'
            }`}
          />
        </span>
      </button>

      {mounted && createPortal(
        <>
      {/* Backdrop — fades. pointer-events:none when closed so it never
          intercepts clicks on the resting page. */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`nav:hidden fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <div
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={drawerLabel}
        // aria-hidden when closed so screen readers skip the offscreen content.
        aria-hidden={!open}
        className={`nav:hidden fixed top-0 right-0 bottom-0 z-[160] w-[min(380px,85vw)] bg-bg-2 text-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header strip — close button, mirrors the hamburger position
            so the user's thumb stays in the same place. */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-border-soft shrink-0">
          <span className="font-mono text-[11px] tracking-[.18em] uppercase text-muted">
            {locale === 'en' ? 'Menu' : '메뉴'}
          </span>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center w-10 h-10 -mr-2 text-white hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded-md"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Scrollable link region — fills available height so the
            sticky CTA at the bottom never overlaps the link list. */}
        <nav className="flex-1 overflow-y-auto px-5 py-4" aria-label={drawerLabel}>
          <ul className="flex flex-col">
            {links.map((l, idx) => {
              const hasItems = l.items.length > 0;
              const isExpanded = expanded.has(l.key as string);

              if (!hasItems) {
                return (
                  <li key={l.href} className="border-b border-border-soft">
                    <Link
                      ref={idx === 0 ? firstLinkRef : undefined}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="block py-4 text-lg font-bold tracking-tight text-white hover:text-accent focus-visible:text-accent focus-visible:outline-none"
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              }

              return (
                <li key={l.href} className="border-b border-border-soft">
                  <div className="flex items-center justify-between">
                    <Link
                      ref={idx === 0 ? firstLinkRef : undefined}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="flex-1 block py-4 text-lg font-bold tracking-tight text-white hover:text-accent focus-visible:text-accent focus-visible:outline-none"
                    >
                      {l.label}
                    </Link>
                    <button
                      type="button"
                      aria-label={
                        isExpanded
                          ? (locale === 'en' ? `Collapse ${l.label}` : `${l.label} 접기`)
                          : (locale === 'en' ? `Expand ${l.label}` : `${l.label} 펼치기`)
                      }
                      aria-expanded={isExpanded}
                      onClick={() => toggleExpanded(l.key as string)}
                      className="ml-2 inline-flex items-center justify-center w-10 h-10 text-muted hover:text-accent focus-visible:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded-md"
                    >
                      <span
                        className={`inline-block transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      >
                        ▾
                      </span>
                    </button>
                  </div>
                  {/* Accordion body — using max-height transition keeps
                      it smooth without measuring children. The fixed
                      cap of 480px is plenty for the current sub-nav. */}
                  <div
                    className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
                      isExpanded ? 'max-h-[480px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <ul className="pb-3 pl-3 flex flex-col gap-1">
                      {l.allLabel ? (
                        <li>
                          <Link
                            href={l.href}
                            onClick={() => setOpen(false)}
                            className="block py-2 px-2 text-sm font-semibold text-white/90 hover:text-accent focus-visible:text-accent focus-visible:outline-none rounded"
                          >
                            {l.allLabel}
                          </Link>
                        </li>
                      ) : null}
                      {l.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className="block py-2 px-2 text-sm text-muted hover:text-accent focus-visible:text-accent focus-visible:outline-none rounded"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sticky footer region — locale toggle + quote CTA. shrink-0
            so it always sits at the bottom regardless of how tall the
            link list gets on the smallest phones. */}
        <div className="shrink-0 border-t border-border-soft px-5 py-4 flex flex-col gap-3 bg-bg-2">
          <Link
            href={toggleHref}
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 py-2 font-display font-bold text-sm tracking-tight"
            aria-label={locale === 'en' ? 'Toggle language' : '언어 전환'}
          >
            <span className={locale === 'ko' ? 'text-accent' : 'text-muted'}>KO</span>
            <span className="text-muted-2">/</span>
            <span className={locale === 'en' ? 'text-accent' : 'text-muted'}>EN</span>
          </Link>
          <Link
            href={quoteHref}
            onClick={() => setOpen(false)}
            className="w-full inline-flex items-center justify-center gap-2 bg-accent text-bg-3 font-display font-bold py-3 px-4 rounded-md hover:brightness-110 transition"
          >
            <span>{quoteCta}</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
        </>,
        document.body,
      )}
    </>
  );
}
