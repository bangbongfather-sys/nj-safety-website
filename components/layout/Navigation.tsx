'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Dictionary, Locale } from '@/lib/i18n';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';

type Props = { locale: Locale; dict: Dictionary; editor?: EditorApi };

// Product detail pages now wear the standard site chrome — we render a
// shop-style header below the nav instead of a stand-alone full-bleed
// page, so the site nav (and footer) stay visible across the catalog.

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
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname.startsWith(l.href) ? 'active' : undefined}
            >
              <EditableText path={`nav.${l.key}`} value={dict.nav[l.key]} editor={editor} />
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
            <EditableText path="nav.quoteCta" value={dict.nav.quoteCta} editor={editor} />
            <span>→</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
