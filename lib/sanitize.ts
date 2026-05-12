// Minimal HTML sanitizer for trusted-but-authored content (admin-uploaded product JSONs).
// Strips script/iframe/style/object/embed and `on*` event handlers and javascript: URLs.
// Allows safe inline markup (em, strong, span style="color/letter-spacing", br, etc.).

const DANGEROUS_TAG = /<\/?(script|iframe|object|embed|link|meta|form|input|button|style)\b[^>]*>/gi;
const ON_ATTR = /\s+on[a-z]+\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+)/gi;
const JS_PROTO = /(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi;

export function sanitizeHtml(html: string | undefined | null): string {
  if (!html) return '';
  return String(html)
    .replace(DANGEROUS_TAG, '')
    .replace(ON_ATTR, '')
    .replace(JS_PROTO, '$1=$2#$2');
}
