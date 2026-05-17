'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import type { EditorApi } from '@/components/admin/EditableText';
import FloatingToolbar, { type FocusInfo } from '@/components/admin/FloatingToolbar';
import ResizeHandle from '@/components/admin/ResizeHandle';
import HeroBgPanel from '@/components/admin/HeroBgPanel';
import ImageSlotPanel from '@/components/admin/ImageSlotPanel';
import type { HeroFilter } from '@/lib/i18n';
import StyleInjector from '@/components/admin/StyleInjector';
import { ghGetFile, ghPutFile } from '@/lib/admin/github';
import type { Dictionary, FieldStyle, Locale } from '@/lib/i18n';

import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/sections/Hero';
import Products from '@/components/sections/Products';
import Showcase from '@/components/sections/Showcase';
import Manifesto from '@/components/sections/Manifesto';
import Certifications from '@/components/sections/Certifications';
import Clients from '@/components/sections/Clients';
import Insights from '@/components/sections/Insights';
import ContactCTA from '@/components/sections/ContactCTA';

const KO_PATH = 'locales/ko.json';
const EN_PATH = 'locales/en.json';

// Parse a dotted path with optional `[idx]` segments into a sequence of
// dict keys (strings) and array indices (numbers).
function parsePath(p: string): (string | number)[] {
  const out: (string | number)[] = [];
  for (const part of p.split('.')) {
    const m = part.match(/^([^[]+)(\[(\d+)\])*$/);
    if (!m) {
      out.push(part);
      continue;
    }
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

type Load =
  | { status: 'loading' }
  | { status: 'ready'; ko: Dictionary; en: Dictionary; koSha: string; enSha: string }
  | { status: 'error'; message: string };

type Save = { status: 'idle' } | { status: 'saving' } | { status: 'done'; sha: string } | { status: 'error'; message: string };

export default function EditHomePage() {
  const { state } = useAdmin();
  const pat = state.status === 'authenticated' ? state.pat : '';

  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [koDraft, setKoDraft] = useState<Dictionary | null>(null);
  const [enDraft, setEnDraft] = useState<Dictionary | null>(null);
  const [active, setActive] = useState<Locale>('ko');
  const [save, setSave] = useState<Save>({ status: 'idle' });
  const [focused, setFocused] = useState<FocusInfo | null>(null);
  const [heroBgPanelOpen, setHeroBgPanelOpen] = useState(false);
  const [imageSlot, setImageSlot] = useState<{ path: string } | null>(null);

  // ── Track which editable element has focus so the toolbar can target it ──
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      const path = el?.dataset?.editPath;
      if (path) setFocused({ path });
    };
    const onFocusOut = (e: FocusEvent) => {
      const next = (e as FocusEvent & { relatedTarget?: EventTarget | null }).relatedTarget as HTMLElement | null;
      // Don't close when focus moves into the toolbar (e.g. clicking a button).
      if (next && next.closest('.ed-toolbar')) return;
      // Don't close when focus moves to another editable (handled by next focusin).
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

  // ── Load both locales on mount ──
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

  // Image URLs are language-agnostic — patch both ko + en drafts at once.
  const applyImagePatch = useCallback((pathStr: string, value: string | null) => {
    const path = parsePath(pathStr);
    const v = value ?? '';
    setKoDraft((d) => (d ? (setIn(d, path, v) as Dictionary) : d));
    setEnDraft((d) => (d ? (setIn(d, path, v) as Dictionary) : d));
  }, []);

  // Hero slide structure (count + image) needs to stay in sync across
  // locales. Text inside each slide is per-language and is created blank
  // in the off-language until the user fills it in.
  const onAddHeroSlide = useCallback(() => {
    function buildLegacySlide(d: Dictionary) {
      // Project the legacy top-level hero fields into a slides[0] shape so
      // the first "Add slide" press doesn't lose the original content.
      const h = d.hero;
      return {
        image: h.bgImage ?? '',
        eyebrow: h.eyebrow,
        headlineLine1: h.headlineLine1,
        headlineLine2Pre: h.headlineLine2Pre,
        headlineLine2Em: h.headlineLine2Em,
        tagline: h.tagline,
        sub: h.sub,
        ctaPrimary: h.ctaPrimary,
        ctaSecondary: h.ctaSecondary,
      };
    }
    function blankSlide() {
      return {
        image: '',
        eyebrow: '— NEW · 2026',
        headlineLine1: '신제품',
        headlineLine2Pre: '',
        headlineLine2Em: '출시.',
        tagline: 'COMING SOON.',
        sub: '여기에 새 슬라이드 본문을 입력하세요.',
        ctaPrimary: '자세히 보기',
        ctaSecondary: '문의',
      };
    }
    function apply(d: Dictionary): Dictionary {
      const heroAny = d.hero as Dictionary['hero'];
      const existing = heroAny.slides && heroAny.slides.length > 0
        ? heroAny.slides
        : [buildLegacySlide(d)];
      const next = [...existing, blankSlide()];
      return { ...d, hero: { ...heroAny, slides: next } };
    }
    setKoDraft((d) => (d ? apply(d) : d));
    setEnDraft((d) => (d ? apply(d) : d));
  }, []);

  const onDeleteHeroSlide = useCallback((index: number) => {
    function apply(d: Dictionary): Dictionary {
      const heroAny = d.hero as Dictionary['hero'];
      if (!heroAny.slides || heroAny.slides.length <= 1) return d;
      const next = heroAny.slides.filter((_, i) => i !== index);
      return { ...d, hero: { ...heroAny, slides: next } };
    }
    setKoDraft((d) => (d ? apply(d) : d));
    setEnDraft((d) => (d ? apply(d) : d));
  }, []);

  const editor: EditorApi = useMemo(() => ({
    locale: active,
    onPatch: (pathStr, value) => {
      const path = parsePath(pathStr);
      if (active === 'ko') setKoDraft((d) => (d ? (setIn(d, path, value) as Dictionary) : d));
      else setEnDraft((d) => (d ? (setIn(d, path, value) as Dictionary) : d));
    },
    onImagePatch: applyImagePatch,
    onImageClick: (pathStr) => setImageSlot({ path: pathStr }),
    onAddHeroSlide,
    onDeleteHeroSlide,
  }), [active, applyImagePatch, onAddHeroSlide, onDeleteHeroSlide]);

  // Resolve the current image URL at a path so the ImageSlotPanel can
  // show "현재" alongside the new preview.
  const imageSlotCurrentSrc = useMemo(() => {
    if (!imageSlot || !koDraft) return null;
    // Walk the dict using the same parsePath logic — simpler to read via
    // generic getter than to special-case each path.
    const path = parsePath(imageSlot.path);
    let cur: unknown = koDraft;
    for (const key of path) {
      if (cur == null) return null;
      if (Array.isArray(cur)) cur = cur[Number(key)];
      else if (typeof cur === 'object') cur = (cur as Record<string, unknown>)[String(key)];
      else return null;
    }
    return typeof cur === 'string' && cur ? cur : null;
  }, [imageSlot, koDraft]);

  // ── Style patches sync across both locales (visuals are language-agnostic) ──
  const onPatchStyle = useCallback((key: keyof FieldStyle, value: string | null) => {
    if (!focused) return;
    const fp = focused.path;
    function apply(d: Dictionary): Dictionary {
      const styles = { ...(d.styles ?? {}) } as Record<string, FieldStyle>;
      // Cast to a mutable record so we can assign string values to any field;
      // align's narrowed union is the only thing TS rejects on a plain assign.
      const cur = { ...(styles[fp] ?? {}) } as Record<string, string | undefined>;
      if (value == null) {
        delete cur[key];
      } else {
        cur[key] = value;
      }
      if (Object.keys(cur).length === 0) delete styles[fp];
      else styles[fp] = cur as FieldStyle;
      return { ...d, styles };
    }
    setKoDraft((d) => (d ? apply(d) : d));
    setEnDraft((d) => (d ? apply(d) : d));
  }, [focused]);

  // ── Hero background filter patches also sync across ko + en. ──
  // Empty `next` (no keys) clears the filter entirely, letting the
  // globals.css default kick back in.
  const onPatchHero = useCallback((next: HeroFilter) => {
    function apply(d: Dictionary): Dictionary {
      const cleaned: HeroFilter = {};
      if (next.brightness != null) cleaned.brightness = next.brightness;
      if (next.contrast != null) cleaned.contrast = next.contrast;
      if (next.saturate != null) cleaned.saturate = next.saturate;

      if (Object.keys(cleaned).length === 0) {
        const sc = { ...(d.siteConfig ?? {}) };
        delete sc.heroFilter;
        const out: Dictionary = { ...d };
        if (Object.keys(sc).length === 0) delete out.siteConfig;
        else out.siteConfig = sc;
        return out;
      }
      return {
        ...d,
        siteConfig: { ...(d.siteConfig ?? {}), heroFilter: cleaned },
      };
    }
    setKoDraft((d) => (d ? apply(d) : d));
    setEnDraft((d) => (d ? apply(d) : d));
  }, []);

  const handleSave = useCallback(async () => {
    if (load.status !== 'ready' || !koDraft || !enDraft || !pat) return;
    setSave({ status: 'saving' });
    try {
      const koChanged = JSON.stringify(koDraft) !== JSON.stringify(load.ko);
      const enChanged = JSON.stringify(enDraft) !== JSON.stringify(load.en);
      let lastSha = '';
      if (koChanged) {
        const koText = JSON.stringify(koDraft, null, 2) + '\n';
        const r = await ghPutFile(pat, KO_PATH, koText, 'chore(text): inline edit ko', load.koSha);
        lastSha = r.commitSha;
      }
      if (enChanged) {
        const enText = JSON.stringify(enDraft, null, 2) + '\n';
        const r = await ghPutFile(pat, EN_PATH, enText, 'chore(text): inline edit en', load.enSha);
        lastSha = r.commitSha;
      }
      setSave({ status: 'done', sha: lastSha });
      const [ko2, en2] = await Promise.all([ghGetFile(pat, KO_PATH), ghGetFile(pat, EN_PATH)]);
      if (ko2 && en2) {
        setLoad({ status: 'ready', ko: JSON.parse(ko2.content), en: JSON.parse(en2.content), koSha: ko2.sha, enSha: en2.sha });
      }
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

  // ── Autosave: 15s after the last edit, push to GitHub automatically. ──
  // Manual "변경사항 게시" still works for immediate flush.
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
  const [, tickRender] = useState(0); // for ticking the "X seconds ago" label
  const handleSaveRef = useRef(handleSave);
  useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);

  // Autosave debounce: longer is better here, because every commit triggers
  // a separate Cloudflare build (≈1–2 min each). A 3 s window made it easy
  // to queue 5+ builds during a normal editing burst — site got stuck
  // behind a slow deploy chain. 15 s coalesces typical bursts into one
  // commit while still feeling "live" to the user; the "즉시 게시" button
  // still flushes immediately for impatient moments.
  useEffect(() => {
    if (!dirty) return;
    if (save.status === 'saving') return;
    const t = setTimeout(() => {
      void (async () => {
        await handleSaveRef.current();
        setAutoSavedAt(new Date());
      })();
    }, 15000);
    return () => clearTimeout(t);
  }, [koDraft, enDraft, dirty, save.status]);

  // Tick once per 10 seconds so the "Xs ago" label stays roughly current
  // without re-rendering the whole page on every animation frame.
  useEffect(() => {
    const i = setInterval(() => tickRender((x) => x + 1), 10_000);
    return () => clearInterval(i);
  }, []);

  function fmtAgo(t: Date | null): string {
    if (!t) return '';
    const sec = Math.max(0, Math.floor((Date.now() - t.getTime()) / 1000));
    if (sec < 5) return '방금';
    if (sec < 60) return `${sec}초 전`;
    const m = Math.floor(sec / 60);
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    return `${h}시간 전`;
  }

  let statusLabel = '변경사항 없음';
  let statusClass = 'ed-status-clean';
  if (save.status === 'saving') {
    statusLabel = '💾 자동 게시 중...';
    statusClass = 'ed-status-saving';
  } else if (save.status === 'error') {
    statusLabel = `⚠ 게시 실패`;
    statusClass = 'ed-status-error';
  } else if (dirty) {
    statusLabel = '● 편집 중 · 15초 후 자동 게시';
    statusClass = 'ed-status-dirty';
  } else if (autoSavedAt) {
    statusLabel = `✓ 자동 게시됨 · ${fmtAgo(autoSavedAt)}`;
    statusClass = 'ed-status-saved';
  } else if (save.status === 'done') {
    statusLabel = `✓ 게시됨 · commit ${save.sha.slice(0, 7)}`;
    statusClass = 'ed-status-saved';
  }

  if (load.status === 'loading') return <div className="ed-loading">로케일 로드 중...</div>;
  if (load.status === 'error') return <div className="ed-loading ed-loading-err">로드 실패: {load.message}</div>;
  if (!koDraft || !enDraft) return null;

  const activeDict = active === 'ko' ? koDraft : enDraft;
  const currentStyle: FieldStyle = focused ? (activeDict.styles?.[focused.path] ?? {}) : {};

  return (
    <div className="ed-stage">
      <div className="ed-bar">
        <div className="ed-bar-l">
          <Link href="/admin" className="ed-bar-back">← Admin</Link>
          <span className="ed-bar-mode">WYSIWYG</span>
          <span className={`ed-status ${statusClass}`}>{statusLabel}</span>
        </div>
        <div className="ed-bar-r">
          <div className="ed-lang">
            <button type="button" className={active === 'ko' ? 'on' : ''} onClick={() => setActive('ko')} disabled={save.status === 'saving'}>KO</button>
            <span className="sep">/</span>
            <button type="button" className={active === 'en' ? 'on' : ''} onClick={() => setActive('en')} disabled={save.status === 'saving'}>EN</button>
          </div>
          <button
            type="button"
            className={`btn ghost small${heroBgPanelOpen ? ' is-on' : ''}`}
            onClick={() => setHeroBgPanelOpen((v) => !v)}
            title="히어로 배경 사진의 밝기/대비/채도 조절"
          >
            🌓 배경 조정
          </button>
          <button type="button" className="btn ghost small" onClick={handleDiscard} disabled={!dirty || save.status === 'saving'} title="저장되지 않은 변경사항을 되돌립니다">
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
                  ? '15초 기다리지 않고 지금 즉시 GitHub에 게시합니다'
                  : '아직 변경사항이 없거나 자동 저장이 이미 끝났습니다 (텍스트 / 필터 편집 후 활성화)'
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

      {save.status === 'error' ? <div className="ed-toast ed-toast-err">에러: {save.message}</div> : null}

      <div className="ed-page">
        <StyleInjector styles={activeDict.styles} />
        <Navigation locale={active} dict={activeDict} editor={editor} />
        <main>
          <Hero locale={active} dict={activeDict} editor={editor} />
          <Products locale={active} dict={activeDict} editor={editor} />
          <Showcase dict={activeDict} editor={editor} />
          <Manifesto dict={activeDict} editor={editor} />
          <Certifications dict={activeDict} editor={editor} />
          <Clients dict={activeDict} editor={editor} />
          <Insights locale={active} dict={activeDict} editor={editor} />
          <ContactCTA locale={active} dict={activeDict} editor={editor} />
        </main>
        <Footer locale={active} dict={activeDict} editor={editor} />
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
      <HeroBgPanel
        open={heroBgPanelOpen}
        pat={pat}
        filter={activeDict.siteConfig?.heroFilter ?? {}}
        onPatch={onPatchHero}
        onClose={() => setHeroBgPanelOpen(false)}
      />
      <ImageSlotPanel
        slot={imageSlot}
        pat={pat}
        currentSrc={imageSlotCurrentSrc}
        onPatch={applyImagePatch}
        onClose={() => setImageSlot(null)}
      />
    </div>
  );
}
