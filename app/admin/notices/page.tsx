'use client';

/**
 * Admin: 공지사항 관리
 *
 * Authors the notice board shown at /<locale>/notices.
 *
 * The screen is a LIST first, editor second. Every notice used to render
 * as a fully-expanded bilingual form stacked down the page, so finding one
 * notice meant scrolling past every other one's body textarea. Now rows
 * are one line each and exactly one opens at a time.
 *
 * Korean is the primary language in the editor and English sits behind a
 * toggle — the operators write Korean first and the English column was
 * doubling the form width for a field they usually fill in later.
 *
 * Source of truth: `data/notices.json`, committed via the GitHub Contents
 * API like every other admin edit. Images go to R2 through the same
 * upload Worker the 자료실 and product screens use, so only the URL is
 * committed. After save the Cloudflare build regenerates the board and
 * each notice's detail page (~1–2 min).
 */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { ghGetFile, ghPutFile } from '@/lib/admin/github';
import type { Notice } from '@/lib/notice-types';
import NoticeItem from '@/components/admin/NoticeItem';

type NoticesFile = { notices: Notice[] };

const NOTICES_PATH = 'data/notices.json';
const UPLOAD_ENDPOINT = '/api/admin/upload-image';
const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // matches the Worker cap

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isValidId(id: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,60}$/.test(id);
}

/** Filename → R2-key-safe stem; the Worker's key regex is ASCII-only. */
function safeStem(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/\.[a-z0-9]{1,8}$/i, '')
      .replace(/[^a-z0-9\-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'image'
  );
}

async function uploadImage(pat: string, file: File): Promise<string> {
  if (!/^image\//.test(file.type)) throw new Error('이미지 파일만 올릴 수 있습니다.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('이미지가 너무 큽니다 (최대 20MB).');
  const ext = (/\.([a-z0-9]{1,8})$/i.exec(file.name)?.[1] ?? 'jpg').toLowerCase();
  const key = `notices/${Date.now()}-${safeStem(file.name)}.${ext}`;
  const r = await fetch(`${UPLOAD_ENDPOINT}?key=${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { Authorization: `token ${pat}`, 'Content-Type': file.type },
    body: file,
  });
  if (!r.ok) throw new Error(`업로드 실패: ${r.status} — ${(await r.text().catch(() => '')).slice(0, 160)}`);
  const data = (await r.json()) as { publicUrl?: string };
  if (!data.publicUrl) throw new Error('업로드 응답이 잘못되었습니다.');
  return `${data.publicUrl}?v=${Date.now()}`;
}

export default function NoticesAdminPage() {
  const { state } = useAdmin();
  const pat = state.status === 'authenticated' ? state.pat : '';

  const [notices, setNotices] = useState<Notice[] | null>(null);
  const [sha, setSha] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  /** id of the notice whose editor is open — only ever one. */
  const [openId, setOpenId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!pat) return;
    setErr(null);
    setNotices(null);
    try {
      const f = await ghGetFile(pat, NOTICES_PATH);
      if (f) {
        const parsed = JSON.parse(f.content) as NoticesFile;
        setNotices(parsed.notices ?? []);
        setSha(f.sha);
      } else {
        setNotices([]);
        setSha(null);
      }
      setDirty(false);
      setSavedAt(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [pat]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const mutate = useCallback((fn: (list: Notice[]) => Notice[]) => {
    setNotices((cur) => (cur ? fn(cur) : cur));
    setDirty(true);
    setSavedAt(null);
  }, []);

  const handleAdd = () => {
    const id = `notice-${Date.now().toString(36)}`;
    mutate((list) => [
      {
        id,
        type: 'notice',
        pinned: false,
        date: todayIso(),
        titleKo: '',
        titleEn: '',
        bodyKo: '',
        bodyEn: '',
      },
      ...list,
    ]);
    setOpenId(id);
  };

  const handleDelete = (idx: number) => {
    const cur = notices?.[idx];
    if (!cur) return;
    if (!window.confirm(`"${cur.titleKo || cur.id}" 공지를 삭제할까요?`)) return;
    mutate((list) => list.filter((_, i) => i !== idx));
  };

  const handleMove = (idx: number, dir: -1 | 1) => {
    mutate((list) => {
      const next = [...list];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return list;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handlePatch = (idx: number, patch: Partial<Notice>) => {
    mutate((list) => list.map((n, i) => (i === idx ? { ...n, ...patch } : n)));
  };

  const handleSave = useCallback(async () => {
    if (!pat || !notices) return;

    const ids = new Set<string>();
    for (const n of notices) {
      if (!isValidId(n.id)) {
        setErr(`잘못된 주소(ID): "${n.id}". 영소문자/숫자/하이픈만 사용해 주세요.`);
        setOpenId(n.id);
        return;
      }
      if (ids.has(n.id)) {
        setErr(`주소(ID)가 겹칩니다: "${n.id}". 공지마다 다른 주소여야 합니다.`);
        setOpenId(n.id);
        return;
      }
      ids.add(n.id);
      if (!n.titleKo.trim() && !n.titleEn.trim()) {
        setErr('제목이 비어 있는 공지가 있습니다.');
        setOpenId(n.id);
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(n.date)) {
        setErr(`게시일 형식이 올바르지 않습니다 ("${n.titleKo || n.id}").`);
        setOpenId(n.id);
        return;
      }
    }

    setSaving(true);
    setErr(null);
    try {
      const out: NoticesFile = { notices };
      const r = await ghPutFile(
        pat,
        NOTICES_PATH,
        JSON.stringify(out, null, 2) + '\n',
        `chore(notices): update notice board (${notices.length} total)`,
        sha,
      );
      setSha(r.contentSha || null);
      setDirty(false);
      setSavedAt(Date.now());
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [pat, notices, sha]);

  const popupCount = (notices ?? []).filter((n) => n.popup?.enabled).length;

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <span className="eyebrow">— Notices</span>
        <h1>공지사항 <em>관리</em></h1>
        <p>
          목록에서 공지를 눌러 펼친 뒤 수정합니다. <strong>사진</strong>을 넣을 수 있고,
          <strong> 팝업</strong>으로 지정하면 사이트 접속 시 알림창으로 뜹니다.
          저장하면 1~2분 뒤 사이트에 반영됩니다.
        </p>
        <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn primary" onClick={handleAdd}>
            + 새 공지 작성
          </button>
          <button type="button" className="btn ghost" onClick={() => void reload()}>
            새로고침
          </button>
          <a href="/ko/notices/" target="_blank" rel="noreferrer" className="btn ghost">
            공지 게시판 보기 ↗
          </a>
          <Link href="/admin" className="btn ghost">← 대시보드</Link>
          {popupCount > 0 ? (
            <span className="nx-popup-count">🔔 팝업 {popupCount}건 노출 중</span>
          ) : null}
        </div>
      </header>

      {err ? <p className="admin-err">에러: {err}</p> : null}

      {notices === null ? (
        <p className="admin-meta">로딩 중...</p>
      ) : notices.length === 0 ? (
        <div className="admin-card admin-card-flat" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--muted)' }}>
            아직 등록된 공지가 없습니다. 위 <strong>+ 새 공지 작성</strong> 버튼으로 시작하세요.
          </p>
        </div>
      ) : (
        <div className="nx-list">
          {notices.map((n, idx) => (
            <NoticeItem
              key={`${n.id}-${idx}`}
              notice={n}
              index={idx}
              total={notices.length}
              open={openId === n.id}
              pat={pat}
              onToggle={() => setOpenId(openId === n.id ? null : n.id)}
              onPatch={(patch) => handlePatch(idx, patch)}
              onDelete={() => handleDelete(idx)}
              onMove={(dir) => handleMove(idx, dir)}
              onError={setErr}
            />
          ))}
        </div>
      )}

      {dirty || saving || savedAt ? (
        <div className="cat-save-bar">
          <div className="cat-save-bar-inner">
            {dirty ? (
              <span className="cat-save-state cat-save-state-dirty">● 저장하지 않은 변경사항</span>
            ) : savedAt ? (
              <span className="cat-save-state cat-save-state-ok">✓ 저장됨 — 1~2분 뒤 사이트 반영</span>
            ) : (
              <span className="cat-save-state">저장 중...</span>
            )}
            <button
              type="button"
              className="btn primary"
              onClick={() => void handleSave()}
              disabled={saving || !dirty}
            >
              {saving ? '저장 중...' : '저장 (사이트에 반영)'}
            </button>
          </div>
        </div>
      ) : null}

    </div>
  );
}
