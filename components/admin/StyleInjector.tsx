import type { FieldStyle } from '@/lib/i18n';

type Props = { styles?: Record<string, FieldStyle> };

function cssEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Emits a `<style>` block applying per-field CSS overrides at the
 * `[data-fp="..."]` attribute level. Lives at the page root (locale
 * layout for public, edit page for admin) so the injected rules
 * win against base styles without touching individual components.
 *
 * Each entry in `styles` maps a dotted locale path -> { size, color,
 * weight, width, align }. Empty entries are skipped.
 */
export default function StyleInjector({ styles }: Props) {
  if (!styles) return null;
  const rules: string[] = [];
  for (const [path, fs] of Object.entries(styles)) {
    if (!fs) continue;
    const decls: string[] = [];
    // !important is intentional — these declarations are user-applied
    // per-field overrides via the FloatingToolbar (size/color/weight/
    // width). The [data-fp] attribute selector has specificity (0,1,0),
    // which loses to ordinary component CSS like `.contact-page
    // .ct-type-card h3 { font-size: 18px }` (0,2,1). Without
    // !important, the operator clicks A+/A− and the saved value never
    // visually applies. We accept the !important here because:
    //   • Rules are only emitted when the user explicitly clicks the
    //     picker — nothing accidental.
    //   • Each rule targets a single dotted path (one element).
    //   • Semantically these ARE "I want this to win" overrides.
    if (fs.color) decls.push(`color: ${fs.color} !important`);
    if (fs.size) decls.push(`font-size: ${fs.size} !important`);
    if (fs.weight) decls.push(`font-weight: ${fs.weight} !important`);
    if (fs.align) decls.push(`text-align: ${fs.align} !important`);
    if (fs.width) {
      // inline-block makes width stick on <span>, <strong>, etc.
      decls.push('display: inline-block !important');
      decls.push(`width: ${fs.width} !important`);
      decls.push('max-width: 100% !important');
    }
    if (decls.length) {
      rules.push(`[data-fp="${cssEscape(path)}"] { ${decls.join('; ')} }`);
    }

    // Translate offset lives in its own desktop-only rule. The
    // operator chose the nudge while looking at a wide canvas, so
    // applying the same px offset on a 360px-wide phone is more
    // likely to push text off-screen than to look intentional. The
    // 981px breakpoint matches our existing responsive cut-over in
    // app/globals.css.
    if (fs.translateX || fs.translateY) {
      const tx = fs.translateX || '0px';
      const ty = fs.translateY || '0px';
      rules.push(
        `@media (min-width: 981px) { [data-fp="${cssEscape(path)}"] { transform: translate(${tx}, ${ty}) !important } }`,
      );
    }
    if (!decls.length && !fs.translateX && !fs.translateY) continue;
  }
  if (!rules.length) return null;
  return <style dangerouslySetInnerHTML={{ __html: rules.join('\n') }} />;
}
