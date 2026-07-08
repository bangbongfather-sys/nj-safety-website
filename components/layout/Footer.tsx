'use client';

import Link from 'next/link';
import type { Dictionary, Locale } from '@/lib/i18n';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';

type Props = { locale: Locale; dict: Dictionary; editor?: EditorApi };

/**
 * Simplified corporate footer (2026-07 redesign): logo, a slim legal/nav
 * link row, the business-registration block in labelled inline pairs, and
 * a single copyright line. Replaces the old 4-column PRODUCTS / COMPANY /
 * CONNECT grid. Shared across the homepage + every content/product page.
 */
export default function Footer({ locale, dict, editor }: Props) {
  const f = dict.footer;
  const c = dict.company;
  const nav = f.bottomNav;
  const biz = f.biz;

  // A labelled "label : value" pair. Values that are already single-sourced
  // in dict.company stay editable through their own paths.
  const Pair = ({ label, path, value }: { label: string; path: string; value: string }) => (
    <span className="ft-pair">
      <span className="ft-k">{label}</span>
      <EditableText as="span" className="ft-v" path={path} value={(value ?? '').trim()} editor={editor} />
    </span>
  );

  return (
    <footer className="footer footer-simple">
      <div className="wrap">
        <Link href={`/${locale}`} className="ft-logo" aria-label="NJ SAFETY 홈으로">
          <img src="/nj-logo.png" alt="NJ SAFETY" className="logo-img" />
        </Link>

        <nav className="ft-nav" aria-label={locale === 'ko' ? '하단 메뉴' : 'Footer'}>
          <Link href={`/${locale}`}>
            <EditableText as="span" path="footer.bottomNav.home" value={nav.home} editor={editor} />
          </Link>
          <Link href={`/${locale}/about`}>
            <EditableText as="span" path="footer.bottomNav.about" value={nav.about} editor={editor} />
          </Link>
          {/* No 이용약관(terms) page authored yet — render as plain text so we
           * don't point the label at a non-existent route. Flip to a
           * <Link href={`/${locale}/terms/`}> once that page exists. */}
          <span className="ft-nav-static">
            <EditableText as="span" path="footer.bottomNav.terms" value={nav.terms} editor={editor} />
          </span>
          <Link href={`/${locale}/privacy/`} className="is-strong">
            <EditableText as="span" path="footer.bottomNav.privacy" value={nav.privacy} editor={editor} />
          </Link>
        </nav>

        <div className="ft-biz">
          <div className="ft-biz-row">
            <Pair label={biz.companyLabel} path="company.name" value={c.name} />
            <Pair label={biz.ceoLabel} path="company.ceo" value={c.ceo} />
            <Pair label={biz.addrLabel} path="company.addressFull" value={c.addressFull} />
            <Pair label={biz.emailLabel} path="company.email" value={c.email} />
          </div>
          <div className="ft-biz-row">
            <Pair label={biz.telLabel} path="company.tel" value={c.tel} />
            <Pair label={biz.faxLabel} path="company.fax" value={c.fax} />
            <Pair label={biz.brnLabel} path="company.brn" value={c.brn} />
          </div>
        </div>

        <div className="ft-copy">
          <EditableText path="footer.copyrightLine" value={f.copyrightLine} editor={editor} />
        </div>
      </div>
    </footer>
  );
}
