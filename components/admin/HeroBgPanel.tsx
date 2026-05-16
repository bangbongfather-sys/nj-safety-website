'use client';

import { useCallback, useRef, useState } from 'react';
import type { HeroFilter } from '@/lib/i18n';
import { ghGetFileSha, ghPutBlob } from '@/lib/admin/github';

const DEFAULTS: Required<HeroFilter> = {
  brightness: 0.55,
  contrast: 1.15,
  saturate: 0.6,
};

const HERO_FILE = 'public/hero.jpg';
const MAX_WIDTH = 2400;        // resize cap
const JPEG_QUALITY = 0.88;     // 88% — good balance of size vs visible quality

type Props = {
  open: boolean;
  pat: string;
  filter: HeroFilter;
  onPatch: (next: HeroFilter) => void;
  onClose: () => void;
};

type UploadState =
  | { status: 'idle' }
  | { status: 'reading' }
  | { status: 'preview'; previewUrl: string; blob: Blob; w: number; h: number; sizeKb: number; fileName: string }
  | { status: 'uploading' }
  | { status: 'done'; commitSha: string }
  | { status: 'error'; message: string };

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지 디코드 실패'));
    img.src = URL.createObjectURL(file);
  });
}

async function resizeToJpeg(file: File): Promise<{ blob: Blob; w: number; h: number }> {
  const img = await loadImage(file);
  const ratio = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context 사용 불가');
  ctx.drawImage(img, 0, 0, w, h);
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob 실패'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
  return { blob, w, h };
}

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

export default function HeroBgPanel({ open, pat, filter, onPatch, onClose }: Props) {
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });
  const [dropActive, setDropActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUpload({ status: 'error', message: '이미지 파일만 업로드 가능합니다' });
      return;
    }
    setUpload({ status: 'reading' });
    try {
      const { blob, w, h } = await resizeToJpeg(file);
      const previewUrl = URL.createObjectURL(blob);
      setUpload({
        status: 'preview',
        previewUrl,
        blob,
        w,
        h,
        sizeKb: Math.round(blob.size / 1024),
        fileName: file.name,
      });
    } catch (e: unknown) {
      setUpload({ status: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  const handlePublish = useCallback(async () => {
    if (upload.status !== 'preview' || !pat) return;
    setUpload({ status: 'uploading' });
    try {
      const sha = await ghGetFileSha(pat, HERO_FILE);
      const { commitSha } = await ghPutBlob(pat, HERO_FILE, upload.blob, 'chore(hero): replace hero photo via admin', sha);
      setUpload({ status: 'done', commitSha });
    } catch (e: unknown) {
      setUpload({ status: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }, [upload, pat]);

  const handleReset = useCallback(() => {
    setUpload({ status: 'idle' });
  }, []);

  if (!open) return null;

  const b = filter.brightness ?? DEFAULTS.brightness;
  const c = filter.contrast ?? DEFAULTS.contrast;
  const s = filter.saturate ?? DEFAULTS.saturate;
  const setB = (v: number) => onPatch({ ...filter, brightness: v });
  const setC = (v: number) => onPatch({ ...filter, contrast: v });
  const setS = (v: number) => onPatch({ ...filter, saturate: v });
  const resetFilter = () => onPatch({});

  return (
    <div className="ed-bg-panel">
      <div className="ed-bg-panel-head">
        <span className="ed-bg-panel-title">🌓 Hero 배경 조정</span>
        <button type="button" className="ed-bg-panel-close" onClick={onClose} aria-label="닫기">×</button>
      </div>

      {/* ===== Image upload ===== */}
      <div className="ed-bg-section">
        <div className="ed-bg-section-head">사진 교체</div>

        {upload.status === 'preview' ? (
          <>
            <div className="ed-bg-preview">
              <img src={upload.previewUrl} alt="upload preview" />
            </div>
            <div className="ed-bg-preview-meta">
              <code>{upload.fileName}</code> · {upload.w}×{upload.h} · {upload.sizeKb} KB
            </div>
            <div className="ed-bg-actions">
              <button type="button" className="btn ghost small" onClick={handleReset}>취소</button>
              <button type="button" className="btn primary small" onClick={() => void handlePublish()}>
                이 사진으로 교체
              </button>
            </div>
          </>
        ) : upload.status === 'reading' ? (
          <div className="ed-bg-status">📐 리사이즈 중...</div>
        ) : upload.status === 'uploading' ? (
          <div className="ed-bg-status">💾 GitHub에 업로드 중...</div>
        ) : upload.status === 'done' ? (
          <>
            <div className="ed-bg-status ed-bg-ok">
              ✓ 완료 — commit <code>{upload.commitSha.slice(0, 7)}</code>
            </div>
            <div className="ed-bg-hint">
              Cloudflare 재배포(~1~2분) 후 강제 새로고침(Ctrl+Shift+R)하시면 새 사진이 보입니다.
            </div>
            <button type="button" className="btn ghost small" onClick={handleReset} style={{ marginTop: 8 }}>
              다른 사진 올리기
            </button>
          </>
        ) : (
          <>
            <div
              className={`admin-drop ed-bg-drop${dropActive ? ' active' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
              onDragLeave={() => setDropActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDropActive(false);
                const f = e.dataTransfer.files?.[0];
                if (f) void handleFile(f);
              }}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              <strong>사진 드래그&드롭</strong>
              <span className="sub">또는 클릭하여 선택</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                  e.target.value = '';
                }}
              />
            </div>
            <div className="ed-bg-hint">
              최대 가로 {MAX_WIDTH}px JPEG로 자동 변환 (품질 88%). 가로세로 비율 그대로 유지됨.
            </div>
            {upload.status === 'error' ? (
              <div className="ed-bg-status ed-bg-err">⚠ {upload.message}</div>
            ) : null}
          </>
        )}
      </div>

      {/* ===== Filter sliders ===== */}
      <div className="ed-bg-section">
        <div className="ed-bg-section-head">필터 조정</div>
        <Slider label="밝기" value={b} min={0.1} max={1.0} step={0.02} onChange={setB} format={(v) => `${Math.round(v * 100)}%`} />
        <Slider label="대비" value={c} min={0.5} max={2.0} step={0.02} onChange={setC} format={(v) => `${Math.round(v * 100)}%`} />
        <Slider label="채도" value={s} min={0} max={1.5} step={0.02} onChange={setS} format={(v) => `${Math.round(v * 100)}%`} />
      </div>

      <div className="ed-bg-panel-foot">
        <button type="button" className="ed-tb-btn reset" onClick={resetFilter} title="필터 기본값으로 되돌리기">
          ↺ 필터 기본값
        </button>
        <span className="ed-bg-hint">필터 변경은 자동 저장</span>
      </div>
    </div>
  );
}
