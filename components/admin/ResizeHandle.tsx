'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Pos = { top: number; left: number; height: number; widthPct: number } | null;

type Props = {
  focused: { path: string } | null;
  onPatchStyle: (key: 'width', value: string | null) => void;
};

/**
 * Right-edge drag handle for the currently-focused editable element.
 * Mouse-drag horizontally to set `width` as a percentage of the
 * element's parent (the natural cap so the field always fits inside
 * its container).  The handle re-anchors itself to the live element
 * rect on scroll/resize/poll so it stays visually attached as the
 * element re-flows during typing.
 */
export default function ResizeHandle({ focused, onPatchStyle }: Props) {
  const [pos, setPos] = useState<Pos>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startWidthPx: number;
    parentWidthPx: number;
  } | null>(null);

  const computePos = useCallback((): Pos => {
    if (!focused) return null;
    const sel = `[data-edit-path="${CSS.escape(focused.path)}"]`;
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    const parent = el.parentElement;
    const parentW = parent ? parent.getBoundingClientRect().width : window.innerWidth;
    return {
      top: r.top,
      left: r.right - 4,
      height: Math.max(20, r.height),
      widthPct: parentW > 0 ? (r.width / parentW) * 100 : 100,
    };
  }, [focused]);

  // Anchor to the focused element. Poll because typing / wrapping change
  // the rect without firing scroll/resize.
  useEffect(() => {
    if (!focused) {
      setPos(null);
      return;
    }
    const update = () => setPos(computePos());
    update();
    const id = window.setInterval(update, 200);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [focused, computePos]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!focused) return;
      const sel = `[data-edit-path="${CSS.escape(focused.path)}"]`;
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) return;
      const parent = el.parentElement;
      if (!parent) return;
      const startWidthPx = el.getBoundingClientRect().width;
      const parentWidthPx = parent.getBoundingClientRect().width;
      if (parentWidthPx === 0) return;
      dragRef.current = { startX: e.clientX, startWidthPx, parentWidthPx };
      setDragging(true);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const delta = ev.clientX - dragRef.current.startX;
        const newPx = dragRef.current.startWidthPx + delta;
        const pct = Math.max(10, Math.min(100, (newPx / dragRef.current.parentWidthPx) * 100));
        onPatchStyle('width', `${pct.toFixed(1)}%`);
      };
      const onUp = () => {
        dragRef.current = null;
        setDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [focused, onPatchStyle],
  );

  if (!pos) return null;

  return (
    <>
      <div
        className={`ed-resize-handle${dragging ? ' is-dragging' : ''}`}
        style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          height: pos.height,
          zIndex: 1050,
        }}
        onMouseDown={onMouseDown}
        title="드래그하여 너비 조절 (10% ~ 100%)"
      />
      {dragging ? (
        <div
          className="ed-resize-label"
          style={{
            position: 'fixed',
            top: pos.top - 26,
            left: pos.left - 30,
            zIndex: 1051,
          }}
        >
          {pos.widthPct.toFixed(0)}%
        </div>
      ) : null}
    </>
  );
}
