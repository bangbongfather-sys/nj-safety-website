'use client';

import type { ElementType, ReactNode } from 'react';

export type EditorApi = {
  /** Apply a text patch at a dotted locale path (single-locale). */
  onPatch: (path: string, value: string) => void;
  /** Apply an image URL patch — synced across both ko + en. */
  onImagePatch?: (path: string, value: string | null) => void;
  /** Open the image upload panel for the given slot path. */
  onImageClick?: (path: string) => void;
  /** Current display locale (for visual hint only — paths are language-agnostic). */
  locale: 'ko' | 'en';
};

type Props = {
  /** HTML tag to render. Default: span. */
  as?: ElementType;
  /** Dotted locale path, e.g. `hero.eyebrow`. */
  path: string;
  /** Current text value (plain). */
  value: string;
  /** When present, element becomes contentEditable on click. */
  editor?: EditorApi;
  className?: string;
  /** Allow Enter to insert a line break instead of blurring (default false). */
  multiline?: boolean;
  /** Extra children rendered after the value (e.g. trailing arrow). Only used in read-only mode. */
  children?: ReactNode;
};

// Browsers (Chrome / Safari) insert `&nbsp;` for many spaces and a trailing
// `<br>` to keep the caret at end-of-line. We strip those so saved values
// are clean text.
function normalise(raw: string, multiline: boolean): string {
  let s = raw;
  // Decode common entities.
  s = s.replace(/&nbsp;/gi, ' ').replace(/ /g, ' ');
  // Drop trailing <br>.
  s = s.replace(/<br\s*\/?>\s*$/i, '');
  if (!multiline) {
    s = s.replace(/<\/?(div|p)[^>]*>/gi, ' ').replace(/<br\s*\/?>/gi, ' ');
  }
  // Strip remaining tags (we round-trip via innerText so this is belt-and-braces).
  s = s.replace(/<[^>]+>/g, '');
  // Collapse internal whitespace runs to one space.
  if (!multiline) s = s.replace(/\s+/g, ' ');
  return s.trim();
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

  if (!editor) {
    return (
      <Tag className={className} data-fp={path}>
        {value}
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
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const next = normalise(e.currentTarget.innerText ?? '', multiline);
        if (next !== value) editor.onPatch(path, next);
        // Restore canonical text in case user typed entities/HTML.
        e.currentTarget.innerText = next || value;
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
    >
      {value}
    </Tag>
  );
}
