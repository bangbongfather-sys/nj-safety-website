'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Dictionary, Locale } from '@/lib/i18n';

type Props = { locale: Locale; dict: Dictionary };

const PRODUCT_DETAIL_RE = /^\/(?:ko|en)\/products\/[^/]+\/?$/;

export default function Footer({ locale, dict }: Props) {
  const pathname = usePathname() ?? '';
  if (PRODUCT_DETAIL_RE.test(pathname)) return null;

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="brand-foot">
            <Link href={`/${locale}`} className="logo">
              <span className="mark" />
              <span className="nj">NJ</span>
              <span className="sf">SAFETY</span>
            </Link>
            <p>{dict.footer.brandDesc}</p>
          </div>

          <div>
            <h4>{dict.footer.productsHead}</h4>
            <ul>
              {dict.footer.products.map((label, i) => (
                <li key={i}>
                  <Link href={`/${locale}/products`}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4>{dict.footer.companyHead}</h4>
            <ul>
              <li><Link href={`/${locale}/about`}>{dict.footer.company[0]}</Link></li>
              <li><Link href={`/${locale}/certifications`}>{dict.footer.company[1]}</Link></li>
              <li><Link href={`/${locale}/news`}>{dict.footer.company[2]}</Link></li>
              <li><Link href={`/${locale}/about`}>{dict.footer.company[3]}</Link></li>
              <li><Link href={`/${locale}/contact`}>{dict.footer.company[4]}</Link></li>
            </ul>
          </div>

          <div>
            <h4>{dict.footer.connectHead}</h4>
            <div className="connect-list">
              <div><span className="k">{dict.footer.addrKey}</span>{dict.company.addressFull}</div>
              <div><span className="k">{dict.footer.telKey}</span>{dict.company.tel}</div>
              <div><span className="k">{dict.footer.faxKey}</span>{dict.company.fax}</div>
              <div><span className="k">{dict.footer.mailKey}</span>{dict.company.email}</div>
              <div style={{ marginTop: 14 }}>
                <span className="k">{dict.footer.social}</span>
                <a href="#" style={{ color: '#fff' }}>Instagram</a> · <a href="#" style={{ color: '#fff' }}>LinkedIn</a>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bar">
          <span>{dict.company.copyright} · {dict.company.brn}</span>
          <div className="legal">
            <Link href="#">{dict.footer.legal.privacy}</Link>
            <Link href="#">{dict.footer.legal.terms}</Link>
            <Link href="#">{dict.footer.legal.sitemap}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
