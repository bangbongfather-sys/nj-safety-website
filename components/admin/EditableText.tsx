'use client';

import { useCallback, useEffect, useRef, type ElementType, type ReactNode } from 'react';
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
  /** Append a new floating text box to dict.customBlocks. */
  onCustomBlockCreate?: (block: unknown) => void;
  /** Remove a floating text box by id. */
  onCustomBlockDelete?: (id: string) => void;
  /**
   * Generic array-mutating handlers. Use these for any
   * dict-resident list (FAQ items, sectors, process steps,
   * mapActions, …). Both patch ko + en drafts so structural
   * indices stay aligned across locales while per-language text
   * inside each item starts from a placeholder and diverges via
   * normal inline EditableText editing.
   */
  onArrayAdd?: (arrayPath: string, item: unknown) => void;
  onArrayDelete?: (arrayPath: string, index: number) => void;
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
  /**
   * Editor-only hint shown when the field is empty, so a blank value still
   * presents a clickable target (an empty contentEditable span is
   * zero-width). Rendered via `[data-ph]:empty::before` in globals.css.
   * Ignored in read-only mode.
   */
  placeholder?: string;
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
  placeholder,
}: Props) {
  const Tag = (as ?? 'span') as ElementType;
  // Sanitize once for output — values may contain inline color spans from
  // the FloatingToolbar's drag-select color picker.
  const html = sanitizeHtml(value);

  // ── Read-only mode — no contentEditable, just paint the HTML ──
  if (!editor) {
    return (
      <Tag className={className} data-fp={path}>
        <span dangerouslySetInnerHTML={{ __html: html }} />
        {children}
      </Tag>
    );
  }

  // ── Editable mode ──
  // CRITICAL: we manage the contentEditable element's `innerHTML`
  // imperatively rather than via React's `dangerouslySetInnerHTML`.
  // Previously every parent re-render (autosave timer, focus state,
  // sibling edits in /admin/edit's draft) re-applied
  // dangerouslySetInnerHTML and wiped any unblurred typing — the user
  // would type into a field, click anywhere else, and watch their work
  // revert mid-sentence.
  //
  // Pattern:
  //   • callback ref sets innerHTML on first mount (no flash, no
  //     React reconciliation involved).
  //   • useEffect re-syncs the DOM ONLY when the `value` prop actually
  //     changes — driven by an external source like onPatch returning
  //     from a sibling save, the FloatingToolbar applying a style,
  //     or a remote-fetched draft replacing the current one.
  //   • Re-renders that DON'T change `value` skip the effect entirely,
  //     leaving the user's mid-typing intact in the DOM.
  const ref = useRef<HTMLElement | null>(null);
  const initialisedRef = useRef(false);

  const setRef = useCallback((el: HTMLElement | null) => {
    ref.current = el;
    if (el && !initialisedRef.current) {
      el.innerHTML = html;
      initialisedRef.current = true;
    }
  // We intentionally read `html` from closure on first paint only —
  // subsequent value changes flow through the useEffect below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !initialisedRef.current) return;
    const desired = sanitizeHtml(value);
    // Skip work when the DOM already matches — happens after blur when
    // onPatch flushes the same text the user just typed.
    if (el.innerHTML === desired) return;
    // Don't clobber the user mid-edit. If the field currently has
    // focus, treat the in-flight DOM as authoritative — the next blur
    // will sync state correctly. This guards the rare case where two
    // sources race (e.g. autosave's snapshot read in parallel with
    // continued typing).
    if (document.activeElement === el) return;
    el.innerHTML = desired;
  }, [value]);

  return (
    <Tag
      ref={setRef}
      className={`${className ?? ''} ed-editable`.trim()}
      data-fp={path}
      data-edit-path={path}
      data-ph={placeholder || undefined}
      title={`편집: ${path}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      // NOTE: no `dangerouslySetInnerHTML` — see the comment above.
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const next = normaliseHtml(e.currentTarget.innerHTML ?? '', multiline);
        if (next !== value) editor.onPatch(path, next);
        // Re-render canonical HTML so any sanitized-out markup
        // disappears from the DOM too. Safe to do directly — we own
        // this DOM imperatively.
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
