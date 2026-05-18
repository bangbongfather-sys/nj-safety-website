'use client';

/**
 * Free-floating editable text blocks.
 *
 * Lets the admin sprinkle ad-hoc callouts / annotations onto any
 * editable page without changing the section markup. Each block is
 * absolutely positioned inside the page root (so it scrolls with the
 * content, not the viewport) and stored in `dict.customBlocks[]`.
 *
 * Public render is the same component minus the drag handle / delete /
 * edit affordances — visitors just see the text where the admin
 * placed it.
 *
 * Schema:
 *   {
 *     id:    string  — stable identifier
 *     route: 'home' | 'about' | 'contact' (string)
 *     text:  string  — HTML (sanitised by EditableText)
 *     x:     number  — px from page-root left
 *     y:     number  — px from page-root top
 *     width: number  — optional max width
 *     color: string  — optional CSS color
 *   }
 *
 * IMPORTANT: the host page must be `position: relative` (or a
 * descendant of one). Without it the absolute blocks anchor to the
 * <html> root and end up in the wrong spot. The CSS at the bottom of
 * this file sets `.cb-page-root { position: relative }` for that
 * purpose — every page wraps its content in that class.
 */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import EditableText, { type EditorApi } from './EditableText';

export type CustomBlock = {
  id: string;
  route: string;
  text?: string;
  x?: number;
  y?: number;
  width?: number;
  color?: string;
};

type LayerProps = {
  /** Full customBlocks array (any route — we filter inside). */
  blocks?: CustomBlock[];
  /** Which page this layer is mounted on. */
  route: string;
  /** When set, blocks become draggable + show their delete handle. */
  editor?: EditorApi;
};

export function CustomBlocksLayer({ blocks, route, editor }: LayerProps) {
  const visible = (blocks ?? []).filter((b) => b.route === route);
  if (visible.length === 0) return null;
  return (
    <>
      {visible.map((b) => {
        // We need the block's index in the FULL array (not the filtered
        // list) so onPatch writes to the correct customBlocks[N].
        const fullIdx = (blocks ?? []).findIndex((bb) => bb.id === b.id);
        if (fullIdx < 0) return null;
        return (
          <CustomBlockView
            key={b.id}
            block={b}
            index={fullIdx}
            editor={editor}
          />
        );
      })}
    </>
  );
}

/* ───────────────────────────────────────────────────────────────── */

function CustomBlockView({
  block,
  index,
  editor,
}: {
  block: CustomBlock;
  index: number;
  editor?: EditorApi;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  // Live position during a drag — committed to the dict on mouseup so
  // we don't fire onPatch on every mousemove.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ mx: number; my: number; bx: number; by: number } | null>(null);

  const x = pos?.x ?? block.x ?? 100;
  const y = pos?.y ?? block.y ?? 100;

  const onHandleMouseDown = (e: React.MouseEvent) => {
    if (!editor) return;
    e.preventDefault();
    e.stopPropagation();
    dragStart.current = {
      mx: e.clientX,
      my: e.clientY,
      bx: block.x ?? 100,
      by: block.y ?? 100,
    };
    setPos({ x: block.x ?? 100, y: block.y ?? 100 });
  };

  // Track the move + release on window so the drag doesn't lose grip
  // when the cursor flies off the small handle area.
  useEffect(() => {
    if (!editor) return;
    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      setPos({
        x: Math.max(0, dragStart.current.bx + dx),
        y: Math.max(0, dragStart.current.by + dy),
      });
    };
    const onUp = () => {
      if (!dragStart.current) return;
      const final = pos;
      dragStart.current = null;
      if (final) {
        // Persist final position. onPatch only takes strings — store
        // as numeric strings; the renderer Number()s them back.
        editor.onPatch?.(`customBlocks[${index}].x`, String(Math.round(final.x)));
        editor.onPatch?.(`customBlocks[${index}].y`, String(Math.round(final.y)));
      }
      setPos(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [editor, index, pos]);

  const style: CSSProperties = {
    position: 'absolute',
    top: `${y}px`,
    left: `${x}px`,
    width: block.width ? `${block.width}px` : undefined,
    color: block.color || undefined,
    cursor: pos ? 'grabbing' : undefined,
  };

  return (
    <div ref={wrapRef} className={`cb-block${editor ? ' is-editor' : ''}`} style={style}>
      {editor ? (
        <div className="cb-toolbar">
          <button
            type="button"
            className="cb-handle"
            onMouseDown={onHandleMouseDown}
            title="드래그해서 위치 이동"
            aria-label="드래그해서 위치 이동"
          >
            ⠿
          </button>
          <button
            type="button"
            className="cb-del"
            onClick={() => {
              if (window.confirm('이 텍스트 박스를 삭제할까요?')) editor?.onCustomBlockDelete?.(block.id);
            }}
            title="삭제"
            aria-label="삭제"
          >
            ×
          </button>
        </div>
      ) : null}
      <EditableText
        as="div"
        className="cb-text"
        path={`customBlocks[${index}].text`}
        value={block.text ?? '새 텍스트'}
        editor={editor}
        multiline
      />
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────── */

/**
 * Floating "+ 텍스트 박스 추가" button. Mount it inside an editor
 * route's bottom area; tapping it generates a fresh block with a
 * unique id, drops it at the current viewport's centre, and lets the
 * caller persist via editor.onCustomBlockCreate.
 */
export function CustomBlockCreateButton({
  route,
  editor,
}: {
  route: string;
  editor?: EditorApi;
}): ReactNode {
  if (!editor?.onCustomBlockCreate) return null;
  const handleClick = () => {
    const id = `cb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    const viewportH = typeof window !== 'undefined' ? window.innerHeight : 720;
    const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const newBlock: CustomBlock = {
      id,
      route,
      text: '새 텍스트',
      x: Math.max(40, Math.round(viewportW / 2 - 120)),
      y: Math.max(140, Math.round(scrollY + viewportH / 2 - 24)),
      width: 240,
    };
    editor.onCustomBlockCreate?.(newBlock);
  };
  return (
    <button
      type="button"
      className="cb-create-btn"
      onClick={handleClick}
      title="페이지 어디든 떠다니는 텍스트 박스를 추가합니다"
    >
      + 텍스트 박스 추가
    </button>
  );
}
