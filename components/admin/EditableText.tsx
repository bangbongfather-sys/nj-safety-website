'use client';

import type { ElementType, ReactNode } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';

export type EditorApi = {
  /** Apply a text patch at a dotted locale path (single-locale). */
  onPatch: (path: string, value: string) => void;
  /** Apply an image URL patch — synced across both ko + en. */
  onImagePatch?: (path: string, value: string | null) => void;
  /** Open the image upload panel for the given slot path. */
  onImageClick?: (path: string) => void;
  /** Append a new hero slide (synced across both locales). */
  onAddHeroSlide?: () => void;
  /** Remove the hero slide at `index` (synced across both locales). */
  onDeleteHeroSlide?: (index: number) => void;
  /** Current display locale (for visual hint only — paths are language-agnostic). */
  locale: 'ko' | 'en';
};

type Props = {
  /** HTML tag to render. Default: span. */
  as?: ElementType;
  /** Dotted locale path, e.g. `hero.eyebrow`. */
  path: string;
  /** Current value. May contain inline `<span style="...">...</span>` produced
   *  by the FloatingToolbar's per-selection color picker. */
  value: string;
  /** When present, element becomes contentEditable on click. */
  editor?: EditorApi;
  className?: string;
  /** Allow Enter to insert a line break instead of blurring (default false). */
  multiline?: boolean;
  /** Extra children rendered after the value (e.g. trailing arrow). Only used in read-only mode. */
  children?: ReactNode;
};

/**
 * Whitespace cleanup for plain text portions only. We do NOT collapse runs
 * of spaces and do NOT trim — the user can intentionally type things like
 * "A , B" or trailing spaces and see them preserved.
 */
function normaliseText(raw: string, multiline: boolean): string {
  let s = raw;
  s = s.replace(/ /g, ' ');                  // nbsp → space
  s = s.replace(/[\t\v\f]/g, ' ');           // tab / vt / ff → space
  if (!multiline) s = s.replace(/[\r\n]+/g, ' ');
  else s = s.replace(/\r\n?/g, '\n');
  return s;
}

/**
 * Tidy contentEditable output before saving:
 *   1. Strip dangerous tags / event handlers (the global sanitizer).
 *   2. Browsers like to wrap pasted/Enter-typed lines in `<div>`; convert
 *      those to plain `<br>` so the saved markup stays predictable.
 *   3. Normalise whitespace inside text content via a DOM walk so spans
 *      / inline styles are preserved verbatim.
 *
 * Server-side fallback (no DOMParser): just sanitize + collapse-newlines.
 */
function normaliseHtml(rawHtml: string, multiline: boolean): string {
  const safe = sanitizeHtml(rawHtml);
  if (typeof document === 'undefined') return safe;
  const tmp = document.createElement('div');
  tmp.innerHTML = safe;
  // Convert <div>...</div> into <br>... so the DOM tree is flat.
  const divs = tmp.querySelectorAll('div');
  divs.forEach((d) => {
    // If the div has content, replace it with its children + a leading <br>
    const br = document.createElement('br');
    d.parentNode?.insertBefore(br, d);
    while (d.firstChild) d.parentNode?.insertBefore(d.firstChild, d);
    d.remove();
  });
  // Normalise whitespace in every text node (single-line: kill newlines).
  const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    node.nodeValue = normaliseText(node.nodeValue ?? '', multiline);
    node = walker.nextNode();
  }
  return tmp.innerHTML;
}

export default function EditableText({
  as,
  path,
  value,
  editor,
  className,
  multiline = false,
  children,
}: Props) {
  const Tag = (as ?? 'span') as ElementType;
  // Sanitize once for output — values may contain inline color spans from
  // the FloatingToolbar's drag-select color picker.
  const html = sanitizeHtml(value);

  if (!editor) {
    return (
      <Tag className={className} data-fp={path}>
        <span dangerouslySetInnerHTML={{ __html: html }} />
        {children}
      </Tag>
    );
  }

  return (
    <Tag
      className={`${className ?? ''} ed-editable`.trim()}
      data-fp={path}
      data-edit-path={path}
      title={`편집: ${path}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      // Render as HTML so drag-select colors survive a reload. React
      // refuses to set both `dangerouslySetInnerHTML` and `children`,
      // so the editable JSX has NO children — the value is injected
      // straight into innerHTML.
      dangerouslySetInnerHTML={{ __html: html }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const next = normaliseHtml(e.currentTarget.innerHTML ?? '', multiline);
        if (next !== value) editor.onPatch(path, next);
        // Re-render canonical HTML so any sanitized-out markup
        // disappears from the DOM too.
        e.currentTarget.innerHTML = next || html;
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Escape') {
          (e.currentTarget as HTMLElement).blur();
          return;
        }
        if (!multiline && e.key === 'Enter') {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
    />
  );
}
