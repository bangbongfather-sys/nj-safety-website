'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Dictionary, Locale } from '@/lib/i18n';

type Props = { locale: Locale; dict: Dictionary };

// On product detail pages the catalog-app render is full-bleed with its own
// topnav (paper background, ink type) — the brand-site dark nav clashes
// visually, so we hide it for that route family. Same for Footer.
const PRODUCT_DETAIL_RE = /^\/(?:ko|en)\/products\/[^/]+\/?$/;

export default function Navigation({ locale, dict }: Props) {
  const pathname = usePathname() ?? '';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (PRODUCT_DETAIL_RE.test(pathname)) return null;

  // Build the toggle target by swapping the locale prefix
  const otherLocale: Locale = locale === 'ko' ? 'en' : 'ko';
  const rest = pathname.replace(/^\/(ko|en)/, '') || '/';
  const toggleHref = `/${otherLocale}${rest === '/' ? '' : rest}`;

  const links: { href: string; label: string }[] = [
    { href: `/${locale}/about`,          label: dict.nav.about },
    { href: `/${locale}/products`,       label: dict.nav.products },
    { href: `/${locale}/certifications`, label: dict.nav.certifications },
    { href: `/${locale}/clients`,        label: dict.nav.clients },
    { href: `/${locale}/news`,           label: dict.nav.news },
    { href: `/${locale}/contact`,        label: dict.nav.contact },
  ];

  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}`} id="nav">
      <div className="nav-inner">
        <Link href={`/${locale}`} className="logo">
          <span className="mark" />
          <span className="nj">NJ</span>
          <span className="sf">SAFETY</span>
        </Link>

        <div className="menu">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname.startsWith(l.href) ? 'active' : undefined}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="nav-right">
          <Link href={toggleHref} className="lang" aria-label="Toggle language">
            <span className={locale === 'ko' ? 'on' : undefined}>KO</span>
            <span className="sep">/</span>
            <span className={locale === 'en' ? 'on' : undefined}>EN</span>
          </Link>
          <Link href={`/${locale}/contact`} className="btn-quote">
            {dict.nav.quoteCta} <span>→</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
