'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Dictionary, Locale } from '@/lib/i18n';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';
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
    { href: `/${locale}/certifications`, key: 'certifications' },
    { href: `/${locale}/clients`,        key: 'clients' },
    { href: `/${locale}/news`,           key: 'news' },
    { href: `/${locale}/contact`,        key: 'contact' },
  ];

  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}`} id="nav">
      <div className="nav-inner">
        <Link href={`/${locale}`} className="logo" aria-label="NJ SAFETY 홈으로">
          <img src="/nj-logo.png" alt="NJ SAFETY" className="logo-img" />
        </Link>

        <div className="menu">
          {links.map((l) => {
            const isActive = pathname.startsWith(l.href);
            // The "제품" entry gets a hover dropdown listing every
            // subcategory the admin has defined. When no categories
            // exist yet we render the plain link so the dropdown
            // never flashes empty.
            const isProducts = l.key === 'products' && CATEGORIES.length > 0;

            if (!isProducts) {
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
                  <Link
                    href={l.href}
                    className="menu-dropdown-all"
                    role="menuitem"
                  >
                    {locale === 'ko' ? '전체 제품' : 'All products'}
                  </Link>
                  <div className="menu-dropdown-sep" aria-hidden />
                  {CATEGORIES.map((c) => {
                    const label = locale === 'en'
                      ? (c.nameEn || c.nameKo || c.id)
                      : (c.nameKo || c.nameEn || c.id);
                    return (
                      <Link
                        key={c.id}
                        href={`/${locale}/products/category/${c.id}`}
                        className="menu-dropdown-item"
                        role="menuitem"
                      >
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="nav-right">
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
      </div>
    </nav>
  );
}
