'use client';

/**
 * /admin/about/edit — WYSIWYG editor for the 회사소개 page.
 *
 * Mirrors /admin/edit (the homepage editor) almost line-for-line but
 * renders only the AboutPage component. Same dict files (ko.json /
 * en.json) — the About copy lives under the `about.*` namespace so
 * homepage edits and About edits target the same parents and reuse
 * every editor primitive (EditableText, EditableImage, ImageSlotPanel,
 * FloatingToolbar, autosave, manual publish, discard).
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import type { EditorApi } from '@/components/admin/EditableText';
import FloatingToolbar, { type FocusInfo } from '@/components/admin/FloatingToolbar';
import ResizeHandle from '@/components/admin/ResizeHandle';
import ImageSlotPanel from '@/components/admin/ImageSlotPanel';
import { CustomBlockCreateButton } from '@/components/admin/CustomBlocks';
import StyleInjector from '@/components/admin/StyleInjector';
import { ghGetFile, ghPutFile } from '@/lib/admin/github';
import type { Dictionary, FieldStyle, Locale } from '@/lib/i18n';

import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import AboutPageView from '@/components/sections/about/AboutPage';

const KO_PATH = 'locales/ko.json';
const EN_PATH = 'locales/en.json';

/* Path utilities — duplicated from /admin/edit/page.tsx. Extract to a
 * shared module if a third editor ever wants them. */
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
  | { status: 'ready'; ko: Dictionary; en: Dictionary; koSha: string; enSha: string }
  | { status: 'error'; message: string };

type Save =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'done'; sha: string }
  | { status: 'error'; message: string };

export default function EditAboutPage() {
  const { state } = useAdmin();
  const pat = state.status === 'authenticated' ? state.pat : '';

  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [koDraft, setKoDraft] = useState<Dictionary | null>(null);
  const [enDraft, setEnDraft] = useState<Dictionary | null>(null);
  const [active, setActive] = useState<Locale>('ko');
  const [save, setSave] = useState<Save>({ status: 'idle' });
  const [focused, setFocused] = useState<FocusInfo | null>(null);
  const [imageSlot, setImageSlot] = useState<{ path: string } | null>(null);

  // ── Focus tracking for FloatingToolbar ────────────────────────────
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

  // ── Load both locales on mount ────────────────────────────────────
  useEffect(() => {
    if (!pat) return;
    let cancelled = false;
    (async () => {
      try {
        const [ko, en] = await Promise.all([ghGetFile(pat, KO_PATH), ghGetFile(pat, EN_PATH)]);
        if (cancelled) return;
        if (!ko || !en) throw new Error('로케일 파일을 찾을 수 없습니다');
        const koObj = JSON.parse(ko.content) as Dictionary;
        const enObj = JSON.parse(en.content) as Dictionary;
        setLoad({ status: 'ready', ko: koObj, en: enObj, koSha: ko.sha, enSha: en.sha });
        setKoDraft(koObj);
        setEnDraft(enObj);
      } catch (e: unknown) {
        if (!cancelled) setLoad({ status: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => { cancelled = true; };
  }, [pat]);

  const dirty = useMemo(() => {
    if (load.status !== 'ready' || !koDraft || !enDraft) return false;
    return JSON.stringify(koDraft) !== JSON.stringify(load.ko) ||
           JSON.stringify(enDraft) !== JSON.stringify(load.en);
  }, [load, koDraft, enDraft]);

  // ── Editor API ────────────────────────────────────────────────────
  // Same dispatch pattern as /admin/edit: text patches go to whichever
  // locale is active; images patch both at once (URLs are language-
  // agnostic). About has no hero-slide handlers — those callbacks
  // are simply absent from this editor.
  const applyImagePatch = useCallback((pathStr: string, value: string | null) => {
    const path = parsePath(pathStr);
    const v = value ?? '';
    setKoDraft((d) => (d ? (setIn(d, path, v) as Dictionary) : d));
    setEnDraft((d) => (d ? (setIn(d, path, v) as Dictionary) : d));
  }, []);

  const onCustomBlockCreate = useCallback((block: unknown) => {
    const update = (d: Dictionary): Dictionary => ({
      ...d,
      customBlocks: [...(d.customBlocks ?? []), block as NonNullable<Dictionary['customBlocks']>[number]],
    });
    if (active === 'ko') setKoDraft((d) => (d ? update(d) : d));
    else setEnDraft((d) => (d ? update(d) : d));
  }, [active]);
  const onCustomBlockDelete = useCallback((id: string) => {
    const update = (d: Dictionary): Dictionary => ({
      ...d,
      customBlocks: (d.customBlocks ?? []).filter((b) => b.id !== id),
    });
    if (active === 'ko') setKoDraft((d) => (d ? update(d) : d));
    else setEnDraft((d) => (d ? update(d) : d));
  }, [active]);

  const editor: EditorApi = useMemo(() => ({
    locale: active,
    onPatch: (pathStr, value) => {
      const path = parsePath(pathStr);
      if (active === 'ko') setKoDraft((d) => (d ? (setIn(d, path, value) as Dictionary) : d));
      else setEnDraft((d) => (d ? (setIn(d, path, value) as Dictionary) : d));
    },
    onImagePatch: applyImagePatch,
    onImageClick: (pathStr) => setImageSlot({ path: pathStr }),
    onCustomBlockCreate,
    onCustomBlockDelete,
  }), [active, applyImagePatch, onCustomBlockCreate, onCustomBlockDelete]);

  const imageSlotCurrentSrc = useMemo(() => {
    if (!imageSlot || !koDraft) return null;
    const cur = getIn(koDraft, parsePath(imageSlot.path));
    return typeof cur === 'string' && cur ? cur : null;
  }, [imageSlot, koDraft]);

  // ── Per-field style overrides (FloatingToolbar) ───────────────────
  const activeDict = active === 'ko' ? koDraft : enDraft;
  const currentStyle: FieldStyle = focused ? (activeDict?.styles?.[focused.path] ?? {}) : {};
  const onPatchStyle = useCallback((key: keyof FieldStyle, value: string | null) => {
    if (!focused) return;
    const fp = focused.path;
    const apply = (d: Dictionary): Dictionary => {
      const all = { ...(d.styles ?? {}) } as Record<string, FieldStyle>;
      const cur: FieldStyle = { ...(all[fp] ?? {}) };
      if (value == null || value === '') delete cur[key];
      else (cur as Record<string, string>)[key] = value;
      if (Object.keys(cur).length === 0) delete all[fp];
      else all[fp] = cur;
      const out = { ...d };
      if (Object.keys(all).length === 0) delete out.styles;
      else out.styles = all;
      return out;
    };
    setKoDraft((d) => (d ? apply(d) : d));
    setEnDraft((d) => (d ? apply(d) : d));
  }, [focused]);

  // ── Save ──────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (load.status !== 'ready' || !koDraft || !enDraft || !pat) return;
    setSave({ status: 'saving' });
    try {
      const koChanged = JSON.stringify(koDraft) !== JSON.stringify(load.ko);
      const enChanged = JSON.stringify(enDraft) !== JSON.stringify(load.en);
      let lastSha = '';
      let nextKoSha = load.koSha;
      let nextEnSha = load.enSha;
      const koSnapshot = koDraft;
      const enSnapshot = enDraft;
      if (koChanged) {
        const koText = JSON.stringify(koDraft, null, 2) + '\n';
        const r = await ghPutFile(pat, KO_PATH, koText, 'chore(about): inline edit ko', load.koSha);
        lastSha = r.commitSha;
        if (r.contentSha) nextKoSha = r.contentSha;
      }
      if (enChanged) {
        const enText = JSON.stringify(enDraft, null, 2) + '\n';
        const r = await ghPutFile(pat, EN_PATH, enText, 'chore(about): inline edit en', load.enSha);
        lastSha = r.commitSha;
        if (r.contentSha) nextEnSha = r.contentSha;
      }
      setLoad({ status: 'ready', ko: koSnapshot, en: enSnapshot, koSha: nextKoSha, enSha: nextEnSha });
      setSave({ status: 'done', sha: lastSha });
    } catch (e: unknown) {
      setSave({ status: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }, [load, koDraft, enDraft, pat]);

  const handleDiscard = useCallback(() => {
    if (load.status !== 'ready') return;
    if (!window.confirm('편집 중인 변경사항을 모두 버릴까요?')) return;
    setKoDraft(load.ko);
    setEnDraft(load.en);
    setSave({ status: 'idle' });
  }, [load]);

  // ── Autosave (60s debounce, 2min min-gap) ─────────────────────────
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
  }, [koDraft, enDraft, dirty, save.status, autoSavedAt]);

  // ── Status label ──────────────────────────────────────────────────
  let statusLabel = '변경사항 없음';
  let statusClass = 'ed-status-clean';
  if (save.status === 'saving') { statusLabel = '💾 게시 중...'; statusClass = 'ed-status-saving'; }
  else if (save.status === 'error') { statusLabel = '⚠ 에러'; statusClass = 'ed-status-error'; }
  else if (dirty) { statusLabel = '● 변경사항 있음'; statusClass = 'ed-status-dirty'; }
  else if (save.status === 'done') { statusLabel = '✓ 게시됨'; statusClass = 'ed-status-done'; }

  // ── Gates ────────────────────────────────────────────────────────
  if (!pat) return <div className="admin-page"><p>인증이 필요합니다.</p></div>;
  if (load.status === 'loading') return <div className="admin-page"><p>로딩 중...</p></div>;
  if (load.status === 'error') {
    return (
      <div className="admin-page">
        <p className="admin-err">로드 실패: {load.message}</p>
        <Link href="/admin" className="btn ghost small">← Admin</Link>
      </div>
    );
  }
  if (!koDraft || !enDraft) return null;

  return (
    <div className="ed-root">
      <div className="ed-bar">
        <div className="ed-bar-l">
          <Link href="/admin" className="ed-bar-back">← Admin</Link>
          <span className="ed-bar-mode">ABOUT · 회사소개</span>
          <span className={`ed-status ${statusClass}`}>{statusLabel}</span>
        </div>
        <div className="ed-bar-r">
          <div className="ed-lang">
            <button type="button" className={active === 'ko' ? 'on' : ''} onClick={() => setActive('ko')} disabled={save.status === 'saving'}>KO</button>
            <span className="sep">/</span>
            <button type="button" className={active === 'en' ? 'on' : ''} onClick={() => setActive('en')} disabled={save.status === 'saving'}>EN</button>
          </div>
          <a
            href={`/ko/about/`}
            target="_blank"
            rel="noreferrer"
            className="btn ghost small"
          >
            라이브 보기 ↗
          </a>
          <button type="button" className="btn ghost small" onClick={handleDiscard} disabled={!dirty || save.status === 'saving'}>
            되돌리기
          </button>
          <button
            type="button"
            className={`btn ${dirty ? 'primary' : 'ghost'} small`}
            onClick={() => void handleSave()}
            disabled={!dirty || save.status === 'saving'}
            title={save.status === 'saving' ? '게시 중...' : dirty ? '자동 저장 대기 없이 지금 즉시 게시' : '변경사항이 없습니다'}
          >
            {save.status === 'saving' ? '💾 게시 중...' : dirty ? '● 즉시 게시' : '변경사항 없음'}
          </button>
        </div>
      </div>

      {save.status === 'error' ? <div className="ed-toast ed-toast-err">에러: {save.message}</div> : null}

      <div className="ed-page">
        <StyleInjector styles={activeDict?.styles} />
        <Navigation locale={active} dict={activeDict!} editor={editor} />
        <main>
          <AboutPageView locale={active} dict={activeDict!} editor={editor} />
        </main>
        <Footer locale={active} dict={activeDict!} editor={editor} />
      </div>

      <FloatingToolbar
        focused={focused}
        currentStyle={currentStyle}
        onPatchStyle={onPatchStyle}
        onClose={() => setFocused(null)}
      />
      <ResizeHandle
        focused={focused}
        onPatchStyle={(_k, v) => onPatchStyle('width', v)}
      />
      <CustomBlockCreateButton route="about" editor={editor} />
      <ImageSlotPanel
        slot={imageSlot}
        pat={pat}
        currentSrc={imageSlotCurrentSrc}
        onPatch={applyImagePatch}
        onUploadComplete={() => {
          // Flush immediately so the rebuild starts now — image
          // changes feel sluggish otherwise (60s autosave debounce).
          setTimeout(() => void handleSaveRef.current(), 0);
        }}
        onClose={() => setImageSlot(null)}
      />
    </div>
  );
}
