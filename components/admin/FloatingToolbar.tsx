'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FieldStyle } from '@/lib/i18n';

export type FocusInfo = { path: string };

type Props = {
  focused: FocusInfo | null;
  currentStyle: FieldStyle;
  onPatchStyle: (key: keyof FieldStyle, value: string | null) => void;
  onClose: () => void;
};

const COLOR_PRESETS: { label: string; value: string }[] = [
  { label: '흰색',   value: '#ffffff' },
  { label: '오렌지', value: '#ff6b1a' },
  { label: '회색',   value: '#a1a1a6' },
  { label: '진한회색', value: '#6b6b70' },
  { label: '검정',   value: '#0d0d0e' },
];

const WIDTH_PRESETS: { label: string; value: string }[] = [
  { label: '50%', value: '50%' },
  { label: '100%', value: '100%' },
];

const WEIGHT_PRESETS: { label: string; value: string }[] = [
  { label: '얇게', value: '300' },
  { label: '중간', value: '500' },
  { label: '굵게', value: '700' },
  { label: '두꺼움', value: '900' },
];

function parseEm(s: string | undefined): number {
  if (!s) return 1.0;
  const m = s.match(/^([\d.]+)em$/);
  return m ? Number(m[1]) : 1.0;
}

function parsePct(s: string | undefined): number {
  if (!s) return 100;
  const m = s.match(/^([\d.]+)%$/);
  return m ? Number(m[1]) : 100;
}

function parsePx(s: string | undefined): number {
  if (!s) return 0;
  const m = s.match(/^(-?[\d.]+)px$/);
  return m ? Number(m[1]) : 0;
}

export default function FloatingToolbar({ focused, currentStyle, onPatchStyle, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // "위치 조정" mode — when on, the focused field becomes draggable
  // via CSS transform: translate(x,y). Persisted into
  // dict.styles[path].translateX/translateY on mouseup.
  const [moveMode, setMoveMode] = useState(false);
  const [livePos, setLivePos] = useState<{ tx: number; ty: number } | null>(null);
  const dragStart = useRef<{ mx: number; my: number; tx: number; ty: number } | null>(null);

  // Reset move-mode any time the focused field changes — sticky
  // mode across fields would be confusing.
  useEffect(() => {
    setMoveMode(false);
    setLivePos(null);
  }, [focused]);

  // Recompute position whenever the focused element changes (or page
  // scrolls / resizes underneath).
  useEffect(() => {
    if (!focused) {
      setPos(null);
      return;
    }
    const update = () => {
      const sel = `[data-edit-path="${CSS.escape(focused.path)}"]`;
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el || !ref.current) return;
      const r = el.getBoundingClientRect();
      const tb = ref.current.getBoundingClientRect();
      const above = r.top - tb.height - 12;
      const below = r.bottom + 8;
      const top = above > 80 ? above : below;
      const left = Math.max(12, Math.min(window.innerWidth - tb.width - 12, r.left));
      setPos({ top, left });
    };
    // Two passes — first to render hidden so we can measure, then placed.
    update();
    const onScroll = () => update();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [focused]);

  /**
   * Color picker dispatch.
   *
   * If the user dragged out a real selection inside the focused element,
   * we wrap just that selection in a colored `<span>` via execCommand —
   * the contentEditable holds the new markup until blur, at which point
   * EditableText.onBlur saves the new HTML to the dict.
   *
   * Otherwise (cursor sitting inside the element with no selection, or
   * no focus at all) we fall back to the legacy whole-field override
   * via `styles[<path>].color`.
   */
  const applyColor = useCallback((color: string | null) => {
    if (!focused) return;

    // Resetting (null) always clears the whole-field override. We don't
    // try to unwrap individual selection spans — that's an unsafe DOM
    // surgery for the rare case; clearing the whole field gets the
    // user back to a clean slate.
    if (color == null) {
      onPatchStyle('color', null);
      return;
    }

    const sel = typeof window !== 'undefined' ? window.getSelection() : null;
    const fp = `[data-edit-path="${CSS.escape(focused.path)}"]`;
    const el = document.querySelector(fp) as HTMLElement | null;

    const hasRangeInside =
      !!sel && sel.rangeCount > 0 && !sel.isCollapsed &&
      !!el && (!!sel.anchorNode && el.contains(sel.anchorNode));

    if (hasRangeInside && el) {
      el.focus();
      try {
        // Use inline CSS spans, not legacy <font> tags.
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('foreColor', false, color);
      } catch {
        // Fallback: apply to whole field if execCommand isn't supported.
        onPatchStyle('color', color);
      }
      // EditableText.onBlur saves the new innerHTML when the user
      // clicks away. No state patch needed here.
      return;
    }

    // No selection → tint the whole field via the styles dict.
    onPatchStyle('color', color);
  }, [focused, onPatchStyle]);

  // ── 위치 조정 — drag the focused field via CSS translate. ─────
  // Bound to the focused element via document.querySelector since
  // the toolbar lives outside the section's React tree. Cleanup
  // removes the visual cue + listeners whenever moveMode toggles
  // off or the focused field changes.
  useEffect(() => {
    if (!moveMode || !focused) return;
    const el = document.querySelector(
      `[data-edit-path="${CSS.escape(focused.path)}"]`,
    ) as HTMLElement | null;
    if (!el) return;

    // Visual cue + disable text editing during the drag so the
    // browser doesn't try to select chars while the operator is
    // grabbing the field.
    el.classList.add('ed-translate-active');
    const prevCE = el.getAttribute('contenteditable');
    el.setAttribute('contenteditable', 'false');

    const startTx = parsePx(currentStyle.translateX);
    const startTy = parsePx(currentStyle.translateY);
    let curLive: { tx: number; ty: number } | null = null;

    const onDown = (e: MouseEvent) => {
      // Toolbar buttons live above the field — ignore mousedowns
      // that originate inside the toolbar so move-mode doesn't
      // hijack clicks on its own controls.
      if (ref.current && ref.current.contains(e.target as Node)) return;
      e.preventDefault();
      e.stopPropagation();
      dragStart.current = { mx: e.clientX, my: e.clientY, tx: startTx, ty: startTy };
    };
    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      curLive = {
        tx: dragStart.current.tx + (e.clientX - dragStart.current.mx),
        ty: dragStart.current.ty + (e.clientY - dragStart.current.my),
      };
      setLivePos(curLive);
      // Inline `!important` override beats StyleInjector's existing
      // transform rule during the gesture; cleared on mouseup so
      // the dict-driven style takes over.
      el.style.setProperty(
        'transform',
        `translate(${curLive.tx}px, ${curLive.ty}px)`,
        'important',
      );
    };
    const onUp = () => {
      if (!dragStart.current) return;
      dragStart.current = null;
      el.style.removeProperty('transform');
      if (curLive) {
        const finalTx = Math.round(curLive.tx);
        const finalTy = Math.round(curLive.ty);
        // Skip the patch when nothing actually moved (a clean
        // click should not write a no-op style entry).
        if (finalTx !== startTx || finalTy !== startTy) {
          // Two separate patches because onPatchStyle is single-key;
          // dict patching is dotted-path setIn so this is safe.
          onPatchStyle('translateX', finalTx === 0 ? null : `${finalTx}px`);
          onPatchStyle('translateY', finalTy === 0 ? null : `${finalTy}px`);
        }
      }
      curLive = null;
      setLivePos(null);
    };

    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    return () => {
      el.classList.remove('ed-translate-active');
      el.style.removeProperty('transform');
      if (prevCE === null) el.removeAttribute('contenteditable');
      else el.setAttribute('contenteditable', prevCE);
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [moveMode, focused, currentStyle.translateX, currentStyle.translateY, onPatchStyle]);

  if (!focused) return null;

  const sizeEm = parseEm(currentStyle.size);

  function bumpSize(delta: number) {
    const next = Math.max(0.4, Math.min(4.0, sizeEm + delta));
    if (Math.abs(next - 1.0) < 0.001) onPatchStyle('size', null);
    else onPatchStyle('size', `${next.toFixed(2)}em`);
  }

  const savedTx = parsePx(currentStyle.translateX);
  const savedTy = parsePx(currentStyle.translateY);
  const showTx = livePos ? Math.round(livePos.tx) : savedTx;
  const showTy = livePos ? Math.round(livePos.ty) : savedTy;
  const hasOffset = savedTx !== 0 || savedTy !== 0;

  return (
    <div
      ref={ref}
      className="ed-toolbar"
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        visibility: pos ? 'visible' : 'hidden',
      }}
      // Prevent toolbar clicks from blurring the contentEditable so the
      // user keeps the same selection in focus while picking styles.
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="ed-toolbar-head">
        <code className="ed-toolbar-path">{focused.path}</code>
        <button type="button" className="ed-toolbar-close" onClick={onClose} aria-label="닫기">×</button>
      </div>

      <div className="ed-toolbar-row">
        <span className="ed-toolbar-label">크기</span>
        <button type="button" className="ed-tb-btn" onClick={() => bumpSize(-0.1)} title="작게">A−</button>
        <span className="ed-toolbar-value">{(sizeEm * 100).toFixed(0)}%</span>
        <button type="button" className="ed-tb-btn" onClick={() => bumpSize(+0.1)} title="크게">A+</button>
        <button type="button" className="ed-tb-btn reset" onClick={() => onPatchStyle('size', null)} title="초기화">↺</button>
      </div>

      <div className="ed-toolbar-row">
        <span className="ed-toolbar-label">색</span>
        {COLOR_PRESETS.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`ed-color${currentStyle.color === c.value ? ' is-on' : ''}`}
            style={{ background: c.value }}
            onClick={() => applyColor(c.value)}
            aria-label={c.label}
            title={`${c.label} (드래그 선택한 글자만 / 선택 없으면 필드 전체)`}
          />
        ))}
        <input
          type="color"
          className="ed-color-pick"
          value={currentStyle.color ?? '#ffffff'}
          onChange={(e) => applyColor(e.target.value)}
          title="직접 선택 — 글자 드래그 후 누르면 선택한 부분만 색칠"
        />
        <button type="button" className="ed-tb-btn reset" onClick={() => applyColor(null)} title="필드 전체 색상 초기화">↺</button>
      </div>
      <div className="ed-toolbar-hint">
        💡 글자를 드래그 선택한 채로 색을 누르면 그 부분만 색칠됩니다.
      </div>

      <div className="ed-toolbar-row">
        <span className="ed-toolbar-label">너비</span>
        <input
          type="range"
          min={10}
          max={100}
          step={1}
          value={parsePct(currentStyle.width)}
          onChange={(e) => onPatchStyle('width', `${e.target.value}%`)}
          className="ed-slider"
          title="너비 슬라이더 — 텍스트 우측의 핸들을 드래그해도 됩니다"
        />
        <span className="ed-toolbar-value">{parsePct(currentStyle.width).toFixed(0)}%</span>
        {WIDTH_PRESETS.map((w) => (
          <button
            key={w.value}
            type="button"
            className={`ed-tb-btn${currentStyle.width === w.value ? ' is-on' : ''}`}
            onClick={() => onPatchStyle('width', w.value)}
            title={`너비 ${w.label}`}
          >
            {w.label}
          </button>
        ))}
        <button type="button" className="ed-tb-btn reset" onClick={() => onPatchStyle('width', null)} title="초기화 (자동)">↺</button>
      </div>

      <div className="ed-toolbar-row">
        <span className="ed-toolbar-label">굵기</span>
        {WEIGHT_PRESETS.map((w) => (
          <button
            key={w.value}
            type="button"
            className={`ed-tb-btn${currentStyle.weight === w.value ? ' is-on' : ''}`}
            onClick={() => onPatchStyle('weight', w.value)}
            title={w.label}
          >
            {w.label}
          </button>
        ))}
        <button type="button" className="ed-tb-btn reset" onClick={() => onPatchStyle('weight', null)} title="초기화">↺</button>
      </div>

      {/* 위치 조정 — toggle on, then drag the field around. Stored as
       * px translate in dict.styles[path].translateX/Y. The offset
       * only applies on desktop (≥ 981px) via StyleInjector so it
       * never breaks the mobile layout. */}
      <div className="ed-toolbar-row">
        <span className="ed-toolbar-label">위치</span>
        <button
          type="button"
          className={`ed-tb-btn${moveMode ? ' is-on' : ''}`}
          onClick={() => setMoveMode((v) => !v)}
          title={moveMode ? '드래그 모드 종료' : '텍스트를 드래그해 위치 미세조정'}
        >
          {moveMode ? '↩ 종료' : '✥ 이동'}
        </button>
        {(moveMode || hasOffset) ? (
          <span className="ed-toolbar-value" title="현재 오프셋 (px)">
            {showTx}, {showTy}
          </span>
        ) : null}
        <button
          type="button"
          className="ed-tb-btn reset"
          onClick={() => {
            onPatchStyle('translateX', null);
            onPatchStyle('translateY', null);
          }}
          title="위치 초기화"
        >
          ↺
        </button>
      </div>
      {moveMode ? (
        <div className="ed-toolbar-hint">
          💡 데스크탑에서만 적용 — 모바일은 원래 자리에 그대로 표시됩니다.
        </div>
      ) : null}

      <div className="ed-toolbar-foot">
        <button
          type="button"
          className="ed-tb-btn ed-tb-btn-clear"
          onClick={() => {
            onPatchStyle('size', null);
            onPatchStyle('color', null);
            onPatchStyle('width', null);
            onPatchStyle('weight', null);
            onPatchStyle('align', null);
            onPatchStyle('translateX', null);
            onPatchStyle('translateY', null);
          }}
        >
          이 필드의 모든 스타일 제거
        </button>
      </div>
    </div>
  );
}
