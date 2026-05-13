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
    if (fs.color) decls.push(`color: ${fs.color}`);
    if (fs.size) decls.push(`font-size: ${fs.size}`);
    if (fs.weight) decls.push(`font-weight: ${fs.weight}`);
    if (fs.align) decls.push(`text-align: ${fs.align}`);
    if (fs.width) {
      // inline-block makes width stick on <span>, <strong>, etc.
      decls.push('display: inline-block');
      decls.push(`width: ${fs.width}`);
      decls.push('max-width: 100%');
    }
    if (!decls.length) continue;
    rules.push(`[data-fp="${cssEscape(path)}"] { ${decls.join('; ')} }`);
  }
  if (!rules.length) return null;
  return <style dangerouslySetInnerHTML={{ __html: rules.join('\n') }} />;
}
