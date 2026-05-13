'use client';

import { useEffect, useRef, useState } from 'react';
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

export default function FloatingToolbar({ focused, currentStyle, onPatchStyle, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

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

  if (!focused) return null;

  const sizeEm = parseEm(currentStyle.size);

  function bumpSize(delta: number) {
    const next = Math.max(0.4, Math.min(4.0, sizeEm + delta));
    if (Math.abs(next - 1.0) < 0.001) onPatchStyle('size', null);
    else onPatchStyle('size', `${next.toFixed(2)}em`);
  }

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
            onClick={() => onPatchStyle('color', c.value)}
            aria-label={c.label}
            title={c.label}
          />
        ))}
        <input
          type="color"
          className="ed-color-pick"
          value={currentStyle.color ?? '#ffffff'}
          onChange={(e) => onPatchStyle('color', e.target.value)}
          title="직접 선택"
        />
        <button type="button" className="ed-tb-btn reset" onClick={() => onPatchStyle('color', null)} title="초기화">↺</button>
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
          }}
        >
          이 필드의 모든 스타일 제거
        </button>
      </div>
    </div>
  );
}
