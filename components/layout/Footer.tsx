'use client';

import Link from 'next/link';
import type { Dictionary, Locale } from '@/lib/i18n';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';

type Props = { locale: Locale; dict: Dictionary; editor?: EditorApi };

// Footer renders on product detail pages now too — they share the standard
// site chrome instead of being full-bleed catalog pages.
export default function Footer({ locale, dict, editor }: Props) {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="brand-foot">
            <Link href={`/${locale}`} className="logo" aria-label="NJ SAFETY 홈으로">
              <img src="/nj-logo.png" alt="NJ SAFETY" className="logo-img" />
            </Link>
            <EditableText as="p" path="footer.brandDesc" value={dict.footer.brandDesc} editor={editor} multiline />
          </div>

          <div>
            <EditableText as="h4" path="footer.productsHead" value={dict.footer.productsHead} editor={editor} />
            <ul>
              {dict.footer.products.map((label, i) => (
                <li key={i}>
                  <Link href={`/${locale}/products`}>
                    <EditableText path={`footer.products[${i}]`} value={label} editor={editor} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <EditableText as="h4" path="footer.companyHead" value={dict.footer.companyHead} editor={editor} />
            <ul>
              {/* News was removed 2026-05 — its <li> dropped here, and the
               * dict array footer.company shrank from 5 → 4 to keep the
               * indices contiguous with the rendered items below. */}
              <li><Link href={`/${locale}/about`}><EditableText path="footer.company[0]" value={dict.footer.company[0]} editor={editor} /></Link></li>
              <li><Link href={`/${locale}/certifications`}><EditableText path="footer.company[1]" value={dict.footer.company[1]} editor={editor} /></Link></li>
              <li><Link href={`/${locale}/resources/`}><EditableText path="footer.company[2]" value={dict.footer.company[2]} editor={editor} /></Link></li>
              <li><Link href={`/${locale}/contact`}><EditableText path="footer.company[3]" value={dict.footer.company[3]} editor={editor} /></Link></li>
            </ul>
          </div>

          <div>
            <EditableText as="h4" path="footer.connectHead" value={dict.footer.connectHead} editor={editor} />
            <div className="connect-list">
              <div><span className="k">{dict.footer.addrKey}</span><EditableText path="company.addressFull" value={dict.company.addressFull} editor={editor} /></div>
              <div><span className="k">{dict.footer.telKey}</span><EditableText path="company.tel" value={dict.company.tel} editor={editor} /></div>
              <div><span className="k">{dict.footer.faxKey}</span><EditableText path="company.fax" value={dict.company.fax} editor={editor} /></div>
              <div><span className="k">{dict.footer.mailKey}</span><EditableText path="company.email" value={dict.company.email} editor={editor} /></div>
              {/* Social row dropped 2026-05: no operational Instagram /
               * LinkedIn account yet. Reintroduce as real <a href="..."> once
               * the company supplies live profile URLs — disabled <span>
               * placeholders only invited misclicks. */}
            </div>
          </div>
        </div>

        <div className="footer-bar">
          <span><EditableText path="company.copyright" value={dict.company.copyright} editor={editor} /> · <EditableText path="company.brn" value={dict.company.brn} editor={editor} /></span>
          <div className="legal">
            {/* Privacy is the only legal page we currently host. Terms /
             * Sitemap stay as labels-without-links until those pages are
             * actually authored — better to look unfinished than to point
             * the wrong label at the wrong destination. The admin can flip
             * these to real routes once the matching content exists. */}
            <Link href={`/${locale}/privacy/`}><EditableText path="footer.legal.privacy" value={dict.footer.legal.privacy} editor={editor} /></Link>
            <span style={{ color: 'var(--muted)' }}><EditableText path="footer.legal.terms" value={dict.footer.legal.terms} editor={editor} /></span>
            <span style={{ color: 'var(--muted)' }}><EditableText path="footer.legal.sitemap" value={dict.footer.legal.sitemap} editor={editor} /></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
