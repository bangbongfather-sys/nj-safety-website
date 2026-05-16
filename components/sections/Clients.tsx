import type { Dictionary } from '@/lib/i18n';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';
import EditableImage from '@/components/admin/EditableImage';

type Props = { dict: Dictionary; editor?: EditorApi };

export default function Clients({ dict, editor }: Props) {
  const c = dict.clients;
  const logoImages = (c as { logoImages?: string[] }).logoImages ?? [];
  return (
    <section className="trusted" id="trusted" data-screen-label="06 Trusted">
      <div className="wrap">
        <div className="trusted-head">
          <EditableText as="span" className="eyebrow" path="clients.eyebrow" value={c.eyebrow} editor={editor} />
          <h2>
            <EditableText path="clients.headline" value={c.headline} editor={editor} multiline />
          </h2>
        </div>
        <div className="logos">
          {c.logos.map((label, i) => {
            const logoUrl = logoImages[i] ?? '';
            return (
              <div className="logo-cell" key={i}>
                <EditableImage
                  path={`clients.logoImages[${i}]`}
                  src={logoUrl}
                  alt={label}
                  className="logo-cell-img"
                  fallback={<EditableText as="span" className="ph" path={`clients.logos[${i}]`} value={label} editor={editor} />}
                  editor={editor}
                  layout="cover"
                />
              </div>
            );
          })}
        </div>
        <div className="stats">
          {c.stats.map((s, i) => (
            <div className="stat" key={i}>
              <EditableText as="span" className="label" path={`clients.stats[${i}].label`} value={s.label} editor={editor} />
              <span className="num">
                <EditableText path={`clients.stats[${i}].num`} value={s.num} editor={editor} />
                <sup>
                  <EditableText path={`clients.stats[${i}].sup`} value={s.sup} editor={editor} />
                </sup>
              </span>
              <EditableText as="span" className="desc" path={`clients.stats[${i}].desc`} value={s.desc} editor={editor} multiline />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
