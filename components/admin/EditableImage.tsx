'use client';

import type { ReactNode } from 'react';
import type { EditorApi } from './EditableText';

type Props = {
  /** Dotted locale path, e.g. `showcase.bgImage`. */
  path: string;
  /** Current image URL from the dict (null/empty -> render fallback). */
  src?: string | null;
  alt: string;
  className?: string;
  /** Element to render when no src is set (placeholder SVG / text). */
  fallback?: ReactNode;
  /** When provided, exposes a "📷 교체" / "+ 이미지" overlay button. */
  editor?: EditorApi;
  /**
   * Layout role:
   *   'cover' — image fills the parent (object-fit: cover)
   *   'inline' — image flows inline (no absolute positioning)
   * Defaults to 'cover'.
   */
  layout?: 'cover' | 'inline';
};

export default function EditableImage({
  path,
  src,
  alt,
  className,
  fallback,
  editor,
  layout = 'cover',
}: Props) {
  const hasImage = !!src;
  const isEditing = !!editor?.onImageClick;
  const openPicker = () => editor?.onImageClick?.(path);

  return (
    <div className={`ed-img-wrap ed-img-${layout} ${className ?? ''}`.trim()} data-edit-image={path}>
      {hasImage ? (
        <img src={src ?? ''} alt={alt} className="ed-img-img" loading="lazy" />
      ) : (
        <div className="ed-img-fallback">{fallback}</div>
      )}

      {isEditing ? (
        <button
          type="button"
          className={`ed-img-btn ${hasImage ? 'ed-img-btn-replace' : 'ed-img-btn-add'}`}
          onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }}
          title={hasImage ? '이미지 교체' : '이미지 추가'}
        >
          {hasImage ? '📷 교체' : '+ 이미지'}
        </button>
      ) : null}
    </div>
  );
}
