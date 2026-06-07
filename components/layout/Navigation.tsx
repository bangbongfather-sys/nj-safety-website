'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Dictionary, Locale } from '@/lib/i18n';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';
import MobileNav from '@/components/layout/MobileNav';
import categoriesData from '@/data/product-categories.json';

type Props = { locale: Locale; dict: Dictionary; editor?: EditorApi };

// Product detail pages now wear the standard site chrome — we render a
// shop-style header below the nav instead of a stand-alone full-bleed
// page, so the site nav (and footer) stay visible across the catalog.

type RawCategory = {
  id: string;
  nameKo: string;
  nameEn: string;
  productSlugs: string[];
};

// Read categories straight from the bundled JSON at module-eval time.
// Same source `lib/product-categories.ts` uses on the server; safe to
// import here because the client bundle is rebuilt on every commit.
const CATEGORIES: RawCategory[] =
  (categoriesData as { categories?: RawCategory[] }).categories ?? [];

/**
 * Build the dropdown item list for a given nav key. Each entry's
 * provenance is different:
 *   - products  → admin-edited categories in data/product-categories.json
 *   - resources → static set (catalog / size guide / test reports)
 * Any other nav key returns an empty list and the caller falls back
 * to a plain link.
 */
function getDropdownItems(
  key: string,
  locale: Locale,
  /** Parent route — used to build relative anchor links. */
  baseHref: string,
): Array<{ href: string; label: string }> {
  if (key === 'products') {
    return CATEGORIES.map((c) => ({
      href: `/${locale}/products/category/${c.id}`,
      label: locale === 'en' ? (c.nameEn || c.nameKo || c.id) : (c.nameKo || c.nameEn || c.id),
    }));
  }
  if (key === 'resources') {
    // /resources is now a unified library with classification sub-tabs
    // (전체 / 카탈로그 / 시험성적서). The dropdown deep-links to a tab
    // via #catalog / #test-reports — ResourcesLibrary reads the hash on
    // mount and selects that tab. Size Guide item removed 2026-06.
    return [
      {
        href: `${baseHref}#catalog`,
        label: locale === 'ko' ? '카탈로그 PDF' : 'Catalog PDF',
      },
      {
        href: `${baseHref}#test-reports`,
        label: locale === 'ko' ? '시험성적서' : 'Test Reports',
      },
    ];
  }
  if (key === 'about') {
    // /about now split into a story half (Hero/Stats/CEO/Heritage) and a
    // capabilities half (Values/OneStop/Industries/Certs) so each page
    // is short enough to read without endless scrolling. /about itself
    // is the story page; /about/capabilities is its sibling.
    return [
      {
        href: `/${locale}/about/`,
        label: locale === 'ko' ? '회사 이야기' : 'Our Story',
      },
      {
        href: `/${locale}/about/capabilities/`,
        label: locale === 'ko' ? '역량 & 시스템' : 'Capabilities',
      },
    ];
  }
  return [];
}

/** "전체 X" copy for the top item of the dropdown. */
function getAllLabel(key: string, locale: Locale): string | null {
  if (key === 'products') return locale === 'ko' ? '전체 제품' : 'All products';
  if (key === 'resources') return locale === 'ko' ? '자료실 메인' : 'Resources home';
  // /about itself is the "회사 이야기" page — clicking "회사소개 전체"
  // landed on the same route as "회사 이야기", so the top item just
  // duplicated the first subtab. Returning null skips the all-link +
  // separator entirely for about.
  if (key === 'about') return null;
  return locale === 'ko' ? '전체' : 'All';
}

export default function Navigation({ locale, dict, editor }: Props) {
  const pathname = usePathname() ?? '';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Build the toggle target by swapping the locale prefix
  const otherLocale: Locale = locale === 'ko' ? 'en' : 'ko';
  const rest = pathname.replace(/^\/(ko|en)/, '') || '/';
  const toggleHref = `/${otherLocale}${rest === '/' ? '' : rest}`;

  const links: { href: string; key: keyof typeof dict.nav }[] = [
    { href: `/${locale}/about`,          key: 'about' },
    { href: `/${locale}/products`,       key: 'products' },
    { href: `/${locale}/notices`,        key: 'notices' },
    { href: `/${locale}/resources`,      key: 'resources' },
    { href: `/${locale}/contact`,        key: 'contact' },
  ];

  // 대리점 stays OUT of the main menu — it's a utility/locator route
  // (not part of the marketing journey), so it sits in the right
  // group next to the language toggle instead of competing with the
  // other top-level sections.
  const dealersHref = `/${locale}/dealers`;
  const dealersLabel = (dict.nav as Record<string, string | undefined>).dealers ?? '대리점';

  // Pre-build the list MobileNav needs — keeps the drawer dumb and
  // avoids re-importing categoriesData on the client a second time.
  // The dealers locator is appended at the end so it still appears
  // as a regular row in the mobile drawer (the desktop-only "utility
  // right" treatment doesn't make sense on a phone — there the drawer
  // already has plenty of vertical space).
  const mobileLinks = [
    ...links.map((l) => ({
      href: l.href,
      key: l.key,
      label: dict.nav[l.key],
      items: getDropdownItems(l.key, locale, l.href),
      allLabel: getAllLabel(l.key, locale),
    })),
    {
      href: dealersHref,
      key: 'dealers' as const,
      label: dealersLabel,
      items: [] as Array<{ href: string; label: string }>,
      allLabel: null,
    },
  ];

  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}`} id="nav">
      <div className="nav-inner">
        <Link href={`/${locale}`} className="logo" aria-label="NJ SAFETY 홈으로">
          <img src="/nj-logo.png" alt="NJ SAFETY" className="logo-img" />
        </Link>

        {/* Desktop menu — hidden below 1100px (CSS @media handles it
            via `.menu { display: none }`; the matching Tailwind class
            here ensures the hamburger UI is hidden ≥ 1100px). */}
        <div className="menu">
          {links.map((l) => {
            const isActive = pathname.startsWith(l.href);
            // Each nav entry can declare its own dropdown items. Currently:
            //   - products → admin-managed categories from data/product-categories.json
            //   - resources → fixed 3 subtabs (catalog / size guide / test reports)
            // When the list is empty we fall back to a plain link so the
            // dropdown never flashes empty (e.g. before any product
            // category is defined).
            const dropdownItems = getDropdownItems(l.key, locale, l.href);
            const allLabel = getAllLabel(l.key, locale);

            if (dropdownItems.length === 0) {
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={isActive ? 'active' : undefined}
                >
                  <EditableText path={`nav.${l.key}`} value={dict.nav[l.key]} editor={editor} />
                </Link>
              );
            }

            return (
              <div key={l.href} className="menu-item has-dropdown">
                <Link
                  href={l.href}
                  className={`menu-link${isActive ? ' active' : ''}`}
                >
                  <EditableText path={`nav.${l.key}`} value={dict.nav[l.key]} editor={editor} />
                </Link>
                <div className="menu-dropdown" role="menu" aria-label={dict.nav[l.key]}>
                  {allLabel ? (
                    <>
                      <Link href={l.href} className="menu-dropdown-all" role="menuitem">
                        {allLabel}
                      </Link>
                      <div className="menu-dropdown-sep" aria-hidden />
                    </>
                  ) : null}
                  {dropdownItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="menu-dropdown-item"
                      role="menuitem"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop right cluster — Dealers locator + KO/EN toggle + quote
            CTA. Dealers sits as a quieter utility link (smaller than the
            menu items, brand-orange on hover) so it's distinct from the
            primary marketing nav but still visible to operators looking
            for the nearest authorised dealer. Hidden on mobile by the
            matching `.nav-right` @media rule below 1100px. */}
        <div className="nav-right">
          <Link
            href={dealersHref}
            className={`nav-utility-link${pathname.startsWith(dealersHref) ? ' active' : ''}`}
          >
            <EditableText path="nav.dealers" value={dealersLabel} editor={editor} />
          </Link>
          <Link href={toggleHref} className="lang" aria-label="Toggle language">
            <span className={locale === 'ko' ? 'on' : undefined}>KO</span>
            <span className="sep">/</span>
            <span className={locale === 'en' ? 'on' : undefined}>EN</span>
          </Link>
          <Link href={`/${locale}/contact`} className="btn-quote">
            <EditableText path="nav.quoteCta" value={dict.nav.quoteCta} editor={editor} />
            <span>→</span>
          </Link>
        </div>

        {/* Mobile hamburger + right-slide drawer. The component owns
            its own visibility via `nav:hidden` so it disappears on
            desktop without any extra wrapper here. */}
        <MobileNav
          locale={locale}
          otherLocale={otherLocale}
          toggleHref={toggleHref}
          links={mobileLinks}
          quoteCta={dict.nav.quoteCta}
          quoteHref={`/${locale}/contact`}
        />
      </div>
    </nav>
  );
}
