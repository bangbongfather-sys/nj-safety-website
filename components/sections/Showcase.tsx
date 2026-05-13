import type { Dictionary } from '@/lib/i18n';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';

type Props = { dict: Dictionary; editor?: EditorApi };

export default function Showcase({ dict, editor }: Props) {
  return (
    <section className="showcase" data-screen-label="03 Showcase">
      <div className="showcase-bg">
        <svg
          className="ph-svg"
          viewBox="0 0 1920 900"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <linearGradient id="shg" x1="0" y1="0" x2="1" y2=".6">
              <stop offset="0" stopColor="#0a0a0c" />
              <stop offset=".55" stopColor="#1a1a1d" />
              <stop offset="1" stopColor="#0a0a0c" />
            </linearGradient>
          </defs>
          <rect width="1920" height="900" fill="url(#shg)" />
          <g className="stripes" strokeOpacity=".4">
            <line x1="0" y1="700" x2="1920" y2="560" />
            <line x1="0" y1="740" x2="1920" y2="600" />
            <line x1="0" y1="780" x2="1920" y2="640" />
            <line x1="0" y1="820" x2="1920" y2="680" />
          </g>
          <g opacity=".25" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M 200 900 L 200 200 L 320 100 L 320 900 Z" />
            <path d="M 1500 900 L 1500 150 L 1620 60 L 1620 900 Z" />
            <path d="M 0 480 L 1920 480" />
          </g>
        </svg>
      </div>
      <div className="showcase-overlay" />
      <div className="showcase-content">
        <div className="wrap">
          <EditableText as="span" className="eyebrow" path="showcase.eyebrow" value={dict.showcase.eyebrow} editor={editor} />
          <h2 className="showcase-h" style={{ marginTop: 24 }}>
            <EditableText path="showcase.headlineLine1" value={dict.showcase.headlineLine1} editor={editor} />
            <br />
            <EditableText path="showcase.headlineLine2" value={dict.showcase.headlineLine2} editor={editor} />
          </h2>
          <EditableText as="p" className="showcase-sub" path="showcase.sub" value={dict.showcase.sub} editor={editor} multiline />
        </div>
      </div>
    </section>
  );
}
