import type { Dictionary } from '@/lib/i18n';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';

type Props = { dict: Dictionary; editor?: EditorApi };

export default function Manifesto({ dict, editor }: Props) {
  return (
    <section className="statement" id="about" data-screen-label="04 Statement">
      <div className="wrap">
        <EditableText as="div" className="eyebrow" path="manifesto.eyebrow" value={dict.manifesto.eyebrow} editor={editor} />
        <p className="quote" style={{ marginTop: 48 }}>
          <span className="dim">
            <EditableText path="manifesto.quotePre" value={dict.manifesto.quotePre} editor={editor} />
          </span>{' '}
          <EditableText path="manifesto.quoteMain" value={dict.manifesto.quoteMain} editor={editor} />
          <br />
          <em>
            <EditableText path="manifesto.quoteEm" value={dict.manifesto.quoteEm} editor={editor} />
          </em>
          <EditableText path="manifesto.quoteMid" value={dict.manifesto.quoteMid} editor={editor} />
          <br />
          <span className="dim">
            <EditableText path="manifesto.quoteEnd" value={dict.manifesto.quoteEnd} editor={editor} />
          </span>
        </p>
        <div className="sig">
          <EditableText as="span" className="num" path="manifesto.sigNumber" value={dict.manifesto.sigNumber} editor={editor} />
          <EditableText as="span" className="name" path="manifesto.sigName" value={dict.manifesto.sigName} editor={editor} />
        </div>
      </div>
    </section>
  );
}
