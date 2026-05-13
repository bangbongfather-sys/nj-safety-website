import type { Dictionary } from '@/lib/i18n';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';

type Props = { dict: Dictionary; editor?: EditorApi };

export default function Certifications({ dict, editor }: Props) {
  const c = dict.certifications;
  return (
    <section className="certs" id="certs" data-screen-label="05 Certifications">
      <div className="wrap certs-inner">
        <div className="lead">
          <EditableText as="span" className="eyebrow" path="certifications.eyebrow" value={c.eyebrow} editor={editor} />
          <h2>
            <em>
              <EditableText path="certifications.titleEm" value={c.titleEm} editor={editor} />
            </em>
            <br />
            <EditableText path="certifications.titleSuffix" value={c.titleSuffix} editor={editor} />
          </h2>
          <EditableText as="p" className="sub" path="certifications.sub" value={c.sub} editor={editor} multiline />
          <EditableText as="div" className="meta" path="certifications.meta" value={c.meta} editor={editor} />
        </div>
        <div className="certs-grid">
          {c.items.map((item, i) => (
            <div className="cert" key={i}>
              <EditableText as="span" className="cert-id" path={`certifications.items[${i}].id`} value={item.id} editor={editor} />
              <EditableText as="span" className="cert-name" path={`certifications.items[${i}].name`} value={item.name} editor={editor} />
              <EditableText as="span" className="cert-note" path={`certifications.items[${i}].note`} value={item.note} editor={editor} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
