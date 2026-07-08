'use client';

/**
 * Drag-and-drop wrapper for any admin file-upload card.
 *
 * Wraps an existing slot (catalog card, product card slot, test
 * reports card, etc.) so the operator can either:
 *   1. Click the inner "+ 업로드" button → file picker (existing
 *      behaviour, untouched), or
 *   2. Drag a file from the OS onto the card → same handler fires.
 *
 * Drop state is signalled by an orange dashed outline + faint tint
 * overlay. Disabled wrappers don't accept drops (e.g. while a
 * previous upload is still flushing to R2).
 *
 * Accepts ONE file at a time on purpose — every upload handler in
 * the admin operates on a single File and queues by slug. A future
 * `multiple` mode would need handler changes.
 */

import { useCallback, useState, type CSSProperties, type ReactNode } from 'react';

export type DropTargetProps = {
  /** Called with the dropped File. Same signature as the click-pick onPick. */
  onFile: (file: File) => void;
  /** Optional accept filter (e.g. ['application/pdf'] or ['image/']). When
   *  the filter doesn't match, the drop silently no-ops. Click-pick still
   *  uses the underlying <input accept="...">. */
  accept?: string[];
  /** Suppress drop handling — e.g. while a previous upload is in flight. */
  disabled?: boolean;
  /**
   * When set, a small persistent corner chip advertises that files can be
   * dragged onto the card — so operators discover drag-and-drop without
   * having to try it. `true` uses the default label; a string overrides it.
   * The chip hides while a drag is hovering (the drop overlay takes over).
   */
  hint?: boolean | string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

function isAccepted(file: File, accept?: string[]): boolean {
  if (!accept || accept.length === 0) return true;
  return accept.some((a) => {
    const lower = a.toLowerCase();
    if (lower.endsWith('/')) {
      // Family prefix, e.g. "image/" matches "image/png"
      return file.type.toLowerCase().startsWith(lower);
    }
    if (lower.startsWith('.')) {
      // Extension, e.g. ".pdf"
      return file.name.toLowerCase().endsWith(lower);
    }
    return file.type.toLowerCase() === lower;
  });
}

export default function DropTarget({
  onFile,
  accept,
  disabled,
  hint,
  children,
  className,
  style,
}: DropTargetProps) {
  const [hover, setHover] = useState(false);

  // We bump a counter on every dragenter and decrement on dragleave —
  // straight `dragleave` alone fires when crossing a child boundary,
  // which makes the hover state flicker. The counter pattern reflects
  // "is at least one drag inside the wrapper" robustly across nested
  // child elements.
  const [depth, setDepth] = useState(0);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (disabled) return;
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    setDepth((d) => d + 1);
    setHover(true);
  }, [disabled]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (disabled) return;
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    // Keep cursor as "copy" so the OS shows the correct affordance.
    e.dataTransfer.dropEffect = 'copy';
  }, [disabled]);

  const onDragLeave = useCallback(() => {
    setDepth((d) => {
      const next = Math.max(0, d - 1);
      if (next === 0) setHover(false);
      return next;
    });
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDepth(0);
    setHover(false);
    if (disabled) return;
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (!isAccepted(file, accept)) return;
    onFile(file);
  }, [accept, disabled, onFile]);

  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={className}
      style={{
        position: 'relative',
        // Lift the dashed outline + tint inline so we don't depend on
        // a global stylesheet — keeps DropTarget self-contained.
        outline: hover && !disabled ? '2px dashed var(--accent)' : 'none',
        outlineOffset: hover && !disabled ? 4 : 0,
        background:
          hover && !disabled ? 'rgba(255, 107, 26, 0.06)' : undefined,
        transition: 'outline-offset .12s, background .12s',
        ...style,
      }}
    >
      {children}
      {hint && !hover && !disabled ? (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            pointerEvents: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 999,
            background: 'rgba(13, 13, 14, 0.6)',
            border: '1px dashed rgba(255, 107, 26, 0.5)',
            color: 'var(--accent)',
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '-.01em',
            whiteSpace: 'nowrap',
            zIndex: 1,
          }}
        >
          ⤓ {typeof hint === 'string' ? hint : '드래그해서 놓기'}
        </div>
      ) : null}
      {hover && !disabled ? (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            background: 'rgba(13, 13, 14, 0.55)',
            color: 'var(--accent)',
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: '-.01em',
            borderRadius: 'inherit',
            zIndex: 2,
          }}
        >
          ↓ 여기에 놓아 업로드
        </div>
      ) : null}
    </div>
  );
}
