'use client';

import type { HeroFilter } from '@/lib/i18n';

const DEFAULTS: Required<HeroFilter> = {
  brightness: 0.85,
  contrast: 1.15,
  saturate: 0.6,
};

type Props = {
  open: boolean;
  /** Kept for API compatibility — no longer used (image upload moved out). */
  pat?: string;
  filter: HeroFilter;
  onPatch: (next: HeroFilter) => void;
  onClose: () => void;
};

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="ed-bg-row">
      <span className="ed-bg-label">{label}</span>
      <input
        type="range"
        className="ed-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="ed-bg-value">{format ? format(value) : value.toFixed(2)}</span>
    </div>
  );
}

/**
 * Hero filter (brightness / contrast / saturate) — site-wide, applies to
 * every slide. Image upload lives on the slide itself now (hover the slide
 * background and click 📷 교체) so each slide gets its own photo and the
 * site no longer has a "default photo" that all empty slides share.
 */
export default function HeroBgPanel({ open, filter, onPatch, onClose }: Props) {
  if (!open) return null;

  const b = filter.brightness ?? DEFAULTS.brightness;
  const c = filter.contrast ?? DEFAULTS.contrast;
  const s = filter.saturate ?? DEFAULTS.saturate;
  const setB = (v: number) => onPatch({ ...filter, brightness: v });
  const setC = (v: number) => onPatch({ ...filter, contrast: v });
  const setS = (v: number) => onPatch({ ...filter, saturate: v });
  const reset = () => onPatch({});

  return (
    <div className="ed-bg-panel">
      <div className="ed-bg-panel-head">
        <span className="ed-bg-panel-title">🌓 Hero 필터 조정</span>
        <button type="button" className="ed-bg-panel-close" onClick={onClose} aria-label="닫기">×</button>
      </div>

      <div className="ed-bg-hint" style={{ paddingBottom: 4 }}>
        밝기 / 대비 / 채도는 모든 슬라이드에 동일하게 적용됩니다.
        <br />
        사진을 바꾸려면 <strong>슬라이드 배경에 마우스를 올리고 📷 교체 버튼</strong>을 누르세요.
      </div>

      <Slider
        label="밝기"
        value={b}
        min={0.1}
        max={1.8}
        step={0.02}
        onChange={setB}
        format={(v) => `${Math.round(v * 100)}%`}
      />
      <Slider
        label="대비"
        value={c}
        min={0.5}
        max={2.0}
        step={0.02}
        onChange={setC}
        format={(v) => `${Math.round(v * 100)}%`}
      />
      <Slider
        label="채도"
        value={s}
        min={0}
        max={1.5}
        step={0.02}
        onChange={setS}
        format={(v) => `${Math.round(v * 100)}%`}
      />

      <div className="ed-bg-panel-foot">
        <button type="button" className="ed-tb-btn reset" onClick={reset} title="기본값으로 되돌리기">
          ↺ 기본값
        </button>
        <span className="ed-bg-hint">자동 저장됩니다</span>
      </div>
    </div>
  );
}
