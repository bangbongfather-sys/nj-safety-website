'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ghGetFileSha, ghPutBlob } from '@/lib/admin/github';

/**
 * Map a dict path → (a) the path we PUT to in the repo, (b) the public URL
 * to write back into the dict, (c) the output mime type / extension.
 *
 * Predictable per-slot paths so each slot has one "live" file in repo;
 * uploads overwrite the previous file at the same path. Cloudflare picks
 * up the new bytes on the next deploy.
 */
function uploadTargetFor(slot: string): { repoPath: string; publicUrl: string; mime: string } {
  // Single-image slots
  if (slot === 'showcase.bgImage') {
    return { repoPath: 'public/showcase-bg.jpg', publicUrl: '/showcase-bg.jpg', mime: 'image/jpeg' };
  }

  // clients.logoImages[<idx>] → PNG (logos often have transparency)
  const mClient = slot.match(/^clients\.logoImages\[(\d+)\]$/);
  if (mClient) {
    const n = String(Number(mClient[1]) + 1).padStart(2, '0');
    return { repoPath: `public/clients/${n}.png`, publicUrl: `/clients/${n}.png`, mime: 'image/png' };
  }

  // insights.items[<idx>].image → JPG
  const mInsight = slot.match(/^insights\.items\[(\d+)\]\.image$/);
  if (mInsight) {
    const n = String(Number(mInsight[1]) + 1).padStart(2, '0');
    return { repoPath: `public/insights/${n}.jpg`, publicUrl: `/insights/${n}.jpg`, mime: 'image/jpeg' };
  }

  // products.<season>.image → JPG
  const mProduct = slot.match(/^products\.(summer|sf|winter)\.image$/);
  if (mProduct) {
    return {
      repoPath: `public/products/${mProduct[1]}.jpg`,
      publicUrl: `/products/${mProduct[1]}.jpg`,
      mime: 'image/jpeg',
    };
  }

  // hero.slides[<idx>].image → JPG (one file per slide in repo)
  const mHeroSlide = slot.match(/^hero\.slides\[(\d+)\]\.image$/);
  if (mHeroSlide) {
    const n = String(Number(mHeroSlide[1]) + 1).padStart(2, '0');
    return {
      repoPath: `public/hero/slide-${n}.jpg`,
      publicUrl: `/hero/slide-${n}.jpg`,
      mime: 'image/jpeg',
    };
  }

  // Fallback: slugified upload bucket
  const safe = slot.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  return { repoPath: `public/uploads/${safe}.jpg`, publicUrl: `/uploads/${safe}.jpg`, mime: 'image/jpeg' };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지 디코드 실패'));
    img.src = URL.createObjectURL(file);
  });
}

type ResizeOpts = {
  /** Target output aspect ratio (width / height). When the source is
   *  much narrower (e.g. portrait into a 16:9 hero), the source is
   *  centered on a canvas of the target aspect and the empty sides are
   *  filled with `bgColor` so the model isn't cropped. */
  targetAspect?: number;
  /** Hex / css color filled behind the image when letterboxing.
   *  Defaults to the brand black (#0d0d0e) so the bars feel intentional. */
  bgColor?: string;
};

async function resizeTo(
  file: File,
  mime: 'image/jpeg' | 'image/png',
  maxWidth: number,
  quality: number,
  opts: ResizeOpts = {},
): Promise<{ blob: Blob; w: number; h: number }> {
  const img = await loadImage(file);
  const srcAspect = img.width / img.height;
  // Portrait into a wider target → letterbox. Use a tolerance so that
  // mildly-mismatched landscape sources (e.g. 4:3 into 16:9) still get
  // edge-to-edge scaling rather than ugly side bars.
  const isPortrait = img.height > img.width;
  const target = opts.targetAspect ?? srcAspect;
  const needsPad = opts.targetAspect != null && (isPortrait || srcAspect < target * 0.85);

  let outW: number;
  let outH: number;
  if (needsPad) {
    // Match target aspect; scale to maxWidth.
    outW = Math.min(maxWidth, Math.max(img.width, Math.round(img.height * target)));
    outH = Math.round(outW / target);
  } else {
    const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
    outW = Math.round(img.width * ratio);
    outH = Math.round(img.height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context 사용 불가');

  // Background fill. For JPEG always paint (no alpha); for PNG only when
  // letterboxing, so transparent logos stay transparent in normal mode.
  if (mime === 'image/jpeg' || needsPad) {
    ctx.fillStyle = opts.bgColor ?? (mime === 'image/jpeg' ? '#0d0d0e' : 'rgba(0,0,0,0)');
    if (mime === 'image/jpeg' && !needsPad) ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);
  }

  if (needsPad) {
    // Fit source by height (or width, whichever fills more without overflow),
    // then center.
    const scale = Math.min(outW / img.width, outH / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const dx = (outW - drawW) / 2;
    const dy = (outH - drawH) / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);
  } else {
    ctx.drawImage(img, 0, 0, outW, outH);
  }

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas.toBlob 실패'))), mime, quality);
  });
  return { blob, w: outW, h: outH };
}

// Slots that visually want a 16:9 landscape canvas. Portrait / heavily
// off-aspect uploads get padded with brand-black bars instead of
// being center-cropped, so the subject stays whole.
function isLandscapeSlot(slot: string): boolean {
  return (
    slot === 'showcase.bgImage' ||
    slot === 'hero.bgImage' ||
    /^hero\.slides\[\d+\]\.image$/.test(slot) ||
    /^insights\.items\[\d+\]\.image$/.test(slot)
  );
}

type UploadState =
  | { status: 'idle' }
  | { status: 'reading' }
  | { status: 'preview'; previewUrl: string; blob: Blob; w: number; h: number; sizeKb: number; fileName: string }
  | { status: 'uploading' }
  | { status: 'done'; previewUrl: string; commitSha: string; publicUrl: string }
  | { status: 'error'; message: string };

type Props = {
  /** When non-null, the panel is open and editing this slot. */
  slot: { path: string } | null;
  pat: string;
  /** Current image URL from the dict — shown alongside the new preview. */
  currentSrc?: string | null;
  /** Called with the new public URL on successful upload. */
  onPatch: (path: string, url: string) => void;
  onClose: () => void;
};

export default function ImageSlotPanel({ slot, pat, currentSrc, onPatch, onClose }: Props) {
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });
  const [dropActive, setDropActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state whenever a different slot is opened.
  useEffect(() => {
    setUpload({ status: 'idle' });
    setDropActive(false);
  }, [slot?.path]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!slot) return;
      if (!file.type.startsWith('image/')) {
        setUpload({ status: 'error', message: '이미지 파일만 업로드 가능합니다' });
        return;
      }
      setUpload({ status: 'reading' });
      try {
        const target = uploadTargetFor(slot.path);
        const isPng = target.mime === 'image/png';
        const opts: ResizeOpts = isLandscapeSlot(slot.path)
          ? { targetAspect: 16 / 9, bgColor: '#0d0d0e' }
          : {};
        const { blob, w, h } = await resizeTo(file, isPng ? 'image/png' : 'image/jpeg', isPng ? 1200 : 2000, 0.88, opts);
        setUpload({
          status: 'preview',
          previewUrl: URL.createObjectURL(blob),
          blob,
          w,
          h,
          sizeKb: Math.round(blob.size / 1024),
          fileName: file.name,
        });
      } catch (e: unknown) {
        setUpload({ status: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    },
    [slot],
  );

  const handlePublish = useCallback(async () => {
    if (!slot || upload.status !== 'preview' || !pat) return;
    setUpload({ status: 'uploading' });
    try {
      const target = uploadTargetFor(slot.path);
      const sha = await ghGetFileSha(pat, target.repoPath);
      const { commitSha } = await ghPutBlob(
        pat,
        target.repoPath,
        upload.blob,
        `chore(image): ${slot.path} via admin`,
        sha,
      );
      setUpload({ status: 'done', previewUrl: upload.previewUrl, commitSha, publicUrl: target.publicUrl });
      // Patch dict so the public site picks it up after rebuild.
      onPatch(slot.path, target.publicUrl);
    } catch (e: unknown) {
      setUpload({ status: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }, [slot, upload, pat, onPatch]);

  const handleRemove = useCallback(() => {
    if (!slot) return;
    if (!window.confirm('이 슬롯의 이미지를 제거할까요? 사이트는 다시 placeholder를 표시합니다.')) return;
    onPatch(slot.path, '');
    onClose();
  }, [slot, onPatch, onClose]);

  if (!slot) return null;

  return (
    <div className="ed-img-panel">
      <div className="ed-bg-panel-head">
        <span className="ed-bg-panel-title">📷 이미지 슬롯</span>
        <button type="button" className="ed-bg-panel-close" onClick={onClose} aria-label="닫기">×</button>
      </div>

      <div className="ed-img-meta">
        <span className="ed-bg-label">PATH</span>
        <code>{slot.path}</code>
      </div>

      {currentSrc ? (
        <div className="ed-img-current">
          <span className="ed-bg-label" style={{ width: 'auto' }}>현재</span>
          <img src={currentSrc} alt="current" />
        </div>
      ) : null}

      {upload.status === 'preview' ? (
        <>
          <div className="ed-bg-preview">
            <img src={upload.previewUrl} alt="preview" />
          </div>
          <div className="ed-bg-preview-meta">
            <code>{upload.fileName}</code> · {upload.w}×{upload.h} · {upload.sizeKb} KB
          </div>
          <div className="ed-bg-actions">
            <button type="button" className="btn ghost small" onClick={() => setUpload({ status: 'idle' })}>
              취소
            </button>
            <button type="button" className="btn primary small" onClick={() => void handlePublish()}>
              이 이미지로 교체
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
            Cloudflare 재배포(~1~2분) 후 강제 새로고침(Ctrl+Shift+R)하시면 새 이미지가 보입니다.
          </div>
          <button type="button" className="btn ghost small" onClick={onClose} style={{ marginTop: 8 }}>
            닫기
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
            <strong>이미지 드래그&드롭</strong>
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
          {upload.status === 'error' ? <div className="ed-bg-status ed-bg-err">⚠ {upload.message}</div> : null}
          {currentSrc ? (
            <button type="button" className="ed-tb-btn ed-tb-btn-clear" onClick={handleRemove}>
              현재 이미지 제거 (placeholder로 복귀)
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
