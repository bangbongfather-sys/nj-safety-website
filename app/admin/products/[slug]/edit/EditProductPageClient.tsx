'use client';

/**
 * /admin/products/[slug]/edit
 *
 * WYSIWYG editor for a single product JSON living in
 * data/products/<slug>.json. Renders the same public ProductPage with an
 * editor wired in so the admin can:
 *   • change every text field in the shop header by clicking on it
 *   • upload a new main photo via the standard R2 ImageSlotPanel
 *
 * Image uploads land under `products/<slug>/` on R2 (bucket = nj-images)
 * so per-product trees stay tidy.
 *
 * Save flow mirrors /admin/edit: local draft state + autosave (60 s
 * debounce + 2 min min-gap), with a 즉시 게시 button for impatient
 * moments. Images flush immediately (skip the autosave wait) via the
 * onUploadComplete callback so the next build kicks off without delay.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAdmin } from '@/components/admin/AdminContext';
import type { EditorApi } from '@/components/admin/EditableText';
import ImageSlotPanel from '@/components/admin/ImageSlotPanel';
import FloatingToolbar, { type FocusInfo } from '@/components/admin/FloatingToolbar';
import ResizeHandle from '@/components/admin/ResizeHandle';
import type { FieldStyle as HomepageFieldStyle } from '@/lib/i18n';
import { ghGetFile, ghPutFile } from '@/lib/admin/github';
import type { ProductPageData, FieldStyle } from '@/lib/product-page-types';
import ProductPage from '@/components/product/ProductPage';

// Identical implementation to the homepage editor — kept inline because
// pulling these into a shared util module would force a refactor of the
// existing /admin/edit route. Worth doing once a third editor wants them.
function parsePath(p: string): (string | number)[] {
  const out: (string | number)[] = [];
  for (const part of p.split('.')) {
    const m = part.match(/^([^[]+)(\[(\d+)\])*$/);
    if (!m) { out.push(part); continue; }
    out.push(m[1]);
    const idxs = part.matchAll(/\[(\d+)\]/g);
    for (const im of idxs) out.push(Number(im[1]));
  }
  return out;
}

function setIn(obj: unknown, path: (string | number)[], value: unknown): unknown {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  if (Array.isArray(obj)) {
    const copy = [...obj];
    const idx = typeof head === 'number' ? head : Number(head);
    copy[idx] = setIn(copy[idx], rest, value);
    return copy;
  }
  const src = (obj as Record<string, unknown>) ?? {};
  return { ...src, [String(head)]: setIn(src[String(head)], rest, value) };
}

function getIn(obj: unknown, path: (string | number)[]): unknown {
  let cur: unknown = obj;
  for (const k of path) {
    if (cur == null) return undefined;
    cur = (cur as Record<string | number, unknown>)[k];
  }
  return cur;
}

type Load =
  | { status: 'loading' }
  | { status: 'ready'; data: ProductPageData; sha: string }
  | { status: 'error'; message: string };

type Save =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'done'; sha: string }
  | { status: 'error'; message: string };

export default function EditProductPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const FILE_PATH = `data/products/${slug}.json`;

  const { state } = useAdmin();
  const pat = state.status === 'authenticated' ? state.pat : '';

  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [draft, setDraft] = useState<ProductPageData | null>(null);
  const [save, setSave] = useState<Save>({ status: 'idle' });
  const [imageSlot, setImageSlot] = useState<{ path: string } | null>(null);
  const [focused, setFocused] = useState<FocusInfo | null>(null);

  // ── Track which editable element has focus so the toolbar can target it ──
  // Same pattern as /admin/edit: every EditableText renders
  // data-edit-path on its host element; we pick that off focusin and
  // hand it to FloatingToolbar so font/color/size/width sliders know
  // which field they're modifying.
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      const path = el?.dataset?.editPath;
      if (path) setFocused({ path });
    };
    const onFocusOut = (e: FocusEvent) => {
      const next = (e as FocusEvent & { relatedTarget?: EventTarget | null }).relatedTarget as HTMLElement | null;
      if (next && next.closest('.ed-toolbar')) return;
      if (next && (next as HTMLElement).dataset?.editPath) return;
      setTimeout(() => setFocused(null), 150);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // ── Load JSON on mount ────────────────────────────────────────────
  useEffect(() => {
    if (!pat || !slug) return;
    let cancelled = false;
    (async () => {
      try {
        const f = await ghGetFile(pat, FILE_PATH);
        if (cancelled) return;
        if (!f) throw new Error(`${FILE_PATH} 를 찾을 수 없습니다`);
        const obj = JSON.parse(f.content) as ProductPageData;
        setLoad({ status: 'ready', data: obj, sha: f.sha });
        setDraft(obj);
      } catch (e: unknown) {
        if (!cancelled) setLoad({ status: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => { cancelled = true; };
  }, [pat, slug, FILE_PATH]);

  const dirty = useMemo(() => {
    if (load.status !== 'ready' || !draft) return false;
    return JSON.stringify(draft) !== JSON.stringify(load.data);
  }, [load, draft]);

  // ── Editor API plugged into ProductPage ───────────────────────────
  const editor: EditorApi = useMemo(() => ({
    locale: 'ko',
    onPatch: (pathStr, value) => {
      const path = parsePath(pathStr);
      setDraft((d) => (d ? (setIn(d, path, value) as ProductPageData) : d));
    },
    onImagePatch: (pathStr, value) => {
      const path = parsePath(pathStr);
      setDraft((d) => (d ? (setIn(d, path, value ?? '') as ProductPageData) : d));
    },
    onImageClick: (pathStr) => setImageSlot({ path: pathStr }),
  }), []);

  // Resolve current image at a path (for ImageSlotPanel "현재" preview)
  const imageSlotCurrentSrc = useMemo(() => {
    if (!imageSlot || !draft) return null;
    const cur = getIn(draft, parsePath(imageSlot.path));
    return typeof cur === 'string' && cur ? cur : null;
  }, [imageSlot, draft]);

  // ── Style overrides (font / color / size / align / width / bg) ────
  // Mirrors /admin/edit's onPatchStyle but writes into draft.styles
  // (top-level on ProductPageData) instead of dict.styles. The renderer
  // (StyleInjector inside ProductPage) reads from the same place.
  const currentStyle: FieldStyle = focused ? (draft?.styles?.[focused.path] ?? {}) : {};
  const onPatchStyle = useCallback((key: keyof FieldStyle, value: string | null) => {
    if (!focused) return;
    const fp = focused.path;
    setDraft((d) => {
      if (!d) return d;
      const all = { ...(d.styles ?? {}) } as Record<string, FieldStyle>;
      const cur: FieldStyle = { ...(all[fp] ?? {}) };
      if (value == null || value === '') delete cur[key];
      else (cur as Record<string, string>)[key] = value;
      if (Object.keys(cur).length === 0) delete all[fp];
      else all[fp] = cur;
      const next: ProductPageData = { ...d };
      if (Object.keys(all).length === 0) delete next.styles;
      else next.styles = all;
      return next;
    });
  }, [focused]);

  // ── Save ──────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (load.status !== 'ready' || !draft || !pat) return;
    setSave({ status: 'saving' });
    try {
      const text = JSON.stringify(draft, null, 2) + '\n';
      const snapshot = draft;
      const r = await ghPutFile(pat, FILE_PATH, text, `chore(products): edit ${slug}`, load.sha);
      // Adopt the new SHA so the next save uses the right parent. Same
      // pattern as /admin/edit — the previous (pre-fix) code re-fetched
      // here, but contentSha straight off the PUT response is correct
      // and one fewer round-trip.
      setLoad({
        status: 'ready',
        data: snapshot,
        sha: r.contentSha || load.sha,
      });
      setSave({ status: 'done', sha: r.commitSha });
    } catch (e: unknown) {
      setSave({ status: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }, [load, draft, pat, slug, FILE_PATH]);

  const handleDiscard = useCallback(() => {
    if (load.status !== 'ready') return;
    if (!window.confirm('편집 중인 변경사항을 모두 버릴까요?')) return;
    setDraft(load.data);
    setSave({ status: 'idle' });
  }, [load]);

  // ── Autosave (mirror /admin/edit timing) ──────────────────────────
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
  const handleSaveRef = useRef(handleSave);
  useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);

  const AUTOSAVE_DEBOUNCE_MS = 60_000;
  const AUTOSAVE_MIN_GAP_MS = 120_000;
  useEffect(() => {
    if (!dirty) return;
    if (save.status === 'saving') return;
    const sinceLast = autoSavedAt ? Date.now() - autoSavedAt.getTime() : Infinity;
    const wait = Math.max(AUTOSAVE_DEBOUNCE_MS, AUTOSAVE_MIN_GAP_MS - sinceLast);
    const t = setTimeout(() => {
      void (async () => {
        await handleSaveRef.current();
        setAutoSavedAt(new Date());
      })();
    }, wait);
    return () => clearTimeout(t);
  }, [draft, dirty, save.status, autoSavedAt]);

  // ── Status label ──────────────────────────────────────────────────
  let statusLabel = '변경사항 없음';
  let statusClass = 'ed-status-clean';
  if (save.status === 'saving') {
    statusLabel = '💾 게시 중...';
    statusClass = 'ed-status-saving';
  } else if (save.status === 'error') {
    statusLabel = `⚠ 에러`;
    statusClass = 'ed-status-error';
  } else if (dirty) {
    statusLabel = '● 변경사항 있음';
    statusClass = 'ed-status-dirty';
  } else if (save.status === 'done') {
    statusLabel = '✓ 게시됨';
    statusClass = 'ed-status-done';
  }

  // ── Loading / error gates ─────────────────────────────────────────
  if (!pat) return <div className="admin-page"><p>인증이 필요합니다.</p></div>;
  if (load.status === 'loading') return <div className="admin-page"><p>로딩 중...</p></div>;
  if (load.status === 'error') {
    return (
      <div className="admin-page">
        <p className="admin-err">로드 실패: {load.message}</p>
        <Link href="/admin/products" className="btn ghost small">← 제품 목록으로</Link>
      </div>
    );
  }
  if (!draft) return null;

  return (
    <div className="ed-root">
      <div className="ed-bar">
        <div className="ed-bar-l">
          <Link href="/admin/products" className="ed-bar-back">← 제품 목록</Link>
          <span className="ed-bar-mode">PRODUCT · {slug}</span>
          <span className={`ed-status ${statusClass}`}>{statusLabel}</span>
        </div>
        <div className="ed-bar-r">
          <a
            href={`/ko/products/${slug}/`}
            target="_blank"
            rel="noreferrer"
            className="btn ghost small"
          >
            라이브 보기 ↗
          </a>
          <button
            type="button"
            className="btn ghost small"
            onClick={handleDiscard}
            disabled={!dirty || save.status === 'saving'}
          >
            되돌리기
          </button>
          <button
            type="button"
            className={`btn ${dirty ? 'primary' : 'ghost'} small`}
            onClick={() => void handleSave()}
            disabled={!dirty || save.status === 'saving'}
            title={
              save.status === 'saving'
                ? '게시 중...'
                : dirty
                  ? '자동 저장 대기 없이 지금 즉시 게시'
                  : '변경사항이 없습니다'
            }
          >
            {save.status === 'saving'
              ? '💾 게시 중...'
              : dirty
                ? '● 즉시 게시'
                : '변경사항 없음'}
          </button>
        </div>
      </div>

      {save.status === 'error' ? (
        <div className="ed-toast ed-toast-err">에러: {save.message}</div>
      ) : null}

      <div className="ed-page">
        <ProductPage
          data={draft}
          locale="ko"
          editor={editor}
          pat={pat}
          onAfterPdfUpload={() => {
            // Same trick as image uploads — defer one tick so React
            // flushes the dict state, then trigger an immediate save.
            setTimeout(() => void handleSaveRef.current(), 0);
          }}
        />
      </div>

      <ImageSlotPanel
        slot={imageSlot}
        pat={pat}
        currentSrc={imageSlotCurrentSrc}
        onPatch={(path, url) => editor.onImagePatch?.(path, url)}
        onUploadComplete={() => {
          // Flush immediately — image uploads should land on the public
          // site as fast as the build allows.
          setTimeout(() => void handleSaveRef.current(), 0);
        }}
        keyPrefix={`products/${slug}`}
        onClose={() => setImageSlot(null)}
      />

      <FloatingToolbar
        focused={focused}
        // Product FieldStyle is a superset of the homepage one (adds `font`
        // + `background` keys). FloatingToolbar only touches the overlapping
        // size/color/weight/width/align — safe to widen the assertion.
        currentStyle={currentStyle as unknown as HomepageFieldStyle}
        onPatchStyle={(k, v) => onPatchStyle(k as keyof FieldStyle, v)}
        onClose={() => setFocused(null)}
      />
      <ResizeHandle
        focused={focused}
        onPatchStyle={(_k, v) => onPatchStyle('width', v)}
      />
    </div>
  );
}
