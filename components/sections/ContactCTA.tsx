import Link from 'next/link';
import type { Dictionary, Locale } from '@/lib/i18n';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';

type Props = { locale: Locale; dict: Dictionary; editor?: EditorApi };

export default function ContactCTA({ locale, dict, editor }: Props) {
  const c = dict.cta;
  const co = dict.company;
  return (
    <section className="cta" id="contact" data-screen-label="08 CTA">
      <div className="wrap">
        <EditableText as="div" className="eyebrow" path="cta.eyebrow" value={c.eyebrow} editor={editor} />
        <div className="cta-inner" style={{ marginTop: 48 }}>
          <div className="left">
            <h2>
              <EditableText path="cta.titleLine1" value={c.titleLine1} editor={editor} multiline />
              <br />
              <em>
                <EditableText path="cta.titleLine2Em" value={c.titleLine2Em} editor={editor} />
              </em>
              <EditableText path="cta.titleLine2End" value={c.titleLine2End} editor={editor} />
            </h2>
            <EditableText as="p" className="sub" path="cta.sub" value={c.sub} editor={editor} />
            <div style={{ marginTop: 48 }}>
              <Link href={`/${locale}/contact`} className="btn btn-primary big-btn">
                <EditableText path="cta.button" value={c.button} editor={editor} />
                <span className="arr">→</span>
              </Link>
            </div>
          </div>
          <div className="right">
            <div className="contact">
              <div><span className="k">TEL</span><EditableText as="span" className="v" path="company.tel" value={co.tel} editor={editor} /></div>
              <div><span className="k">EMAIL</span><EditableText as="span" className="v" path="company.email" value={co.email} editor={editor} /></div>
              <div><span className="k">HOURS</span><EditableText as="span" className="v" path="company.hours" value={co.hours} editor={editor} /></div>
              <div style={{ marginTop: 18 }}>
                <span className="k">ADDR</span>
                <EditableText as="span" className="v" path="company.addressShort" value={co.addressShort} editor={editor} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
