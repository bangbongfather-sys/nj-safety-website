'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import type { EditorApi } from '@/components/admin/EditableText';
import { ghGetFile, ghPutFile } from '@/lib/admin/github';
import type { Dictionary, Locale } from '@/lib/i18n';

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
    // Pull array index suffixes.
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

  const editor: EditorApi = useMemo(() => ({
    locale: active,
    onPatch: (pathStr, value) => {
      const path = parsePath(pathStr);
      if (active === 'ko') setKoDraft((d) => (d ? (setIn(d, path, value) as Dictionary) : d));
      else setEnDraft((d) => (d ? (setIn(d, path, value) as Dictionary) : d));
    },
  }), [active]);

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
      // Refresh SHAs for subsequent saves.
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

  if (load.status === 'loading') return <div className="ed-loading">로케일 로드 중...</div>;
  if (load.status === 'error') return <div className="ed-loading ed-loading-err">로드 실패: {load.message}</div>;
  if (!koDraft || !enDraft) return null;

  const activeDict = active === 'ko' ? koDraft : enDraft;

  return (
    <div className="ed-stage">
      {/* ===== Top edit bar — always above the page ===== */}
      <div className="ed-bar">
        <div className="ed-bar-l">
          <Link href="/admin" className="ed-bar-back">← Admin</Link>
          <span className="ed-bar-mode">WYSIWYG · 인라인 편집</span>
          <span className="ed-bar-hint">텍스트 위에 마우스 → 클릭 → 수정 → 다른 곳 클릭으로 저장</span>
        </div>
        <div className="ed-bar-r">
          <div className="ed-lang">
            <button
              type="button"
              className={active === 'ko' ? 'on' : ''}
              onClick={() => setActive('ko')}
              disabled={save.status === 'saving'}
            >
              KO
            </button>
            <span className="sep">/</span>
            <button
              type="button"
              className={active === 'en' ? 'on' : ''}
              onClick={() => setActive('en')}
              disabled={save.status === 'saving'}
            >
              EN
            </button>
          </div>
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
            className="btn primary small"
            onClick={() => void handleSave()}
            disabled={!dirty || save.status === 'saving'}
          >
            {save.status === 'saving' ? '게시 중...' : dirty ? '● 변경사항 게시' : '변경사항 없음'}
          </button>
        </div>
      </div>

      {save.status === 'done' ? (
        <div className="ed-toast ed-toast-ok">
          ✓ 게시 완료 — commit <code>{save.sha.slice(0, 7)}</code>. ~1~2분 뒤 사이트에 반영됩니다.
        </div>
      ) : null}
      {save.status === 'error' ? (
        <div className="ed-toast ed-toast-err">에러: {save.message}</div>
      ) : null}

      {/* ===== Live page render with editor wired ===== */}
      <div className="ed-page">
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
    </div>
  );
}
