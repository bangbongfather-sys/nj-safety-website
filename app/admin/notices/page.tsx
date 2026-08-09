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
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { ghGetFile, ghPutFile } from '@/lib/admin/github';
import DropTarget from '@/components/admin/DropTarget';
import { NOTICE_TYPES, type Notice, type NoticeType } from '@/lib/notice-types';

type NoticesFile = { notices: Notice[] };

const NOTICES_PATH = 'data/notices.json';
const UPLOAD_ENDPOINT = '/api/admin/upload-image';
const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // matches the Worker cap

const TYPE_LABEL: Record<NoticeType, string> = {
  notice: '공지',
  product: '제품',
  cert: '인증',
  event: '행사',
};

const TYPE_COLOR: Record<NoticeType, string> = {
  notice: '#7c8cff',
  product: '#ff6b1a',
  cert: '#3fbf7f',
  event: '#e0a33a',
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (/^[a-z0-9][a-z0-9-]*$/.test(base)) return base;
  return `notice-${Date.now().toString(36)}`;
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

      <style>{`
        .nx-list { display: grid; gap: 10px; padding-bottom: 90px; }

        .nx-item {
          background: var(--bg-2, #17171a);
          border: 1px solid var(--border, #2c2c30);
          border-radius: 12px;
          overflow: hidden;
        }
        .nx-item.is-open { border-color: var(--accent, #ff6b1a); }

        /* ── collapsed row ───────────────────────────────────────── */
        .nx-row {
          display: grid;
          grid-template-columns: 56px 44px 1fr auto auto;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
        }
        .nx-order { display: flex; gap: 4px; }
        .nx-order button {
          width: 26px; height: 26px;
          display: flex; align-items: center; justify-content: center;
          background: transparent; color: var(--muted);
          border: 1px solid var(--border); border-radius: 6px;
          cursor: pointer; font-size: 12px; line-height: 1;
        }
        .nx-order button:hover:not(:disabled) { color: var(--accent); border-color: var(--accent); }
        .nx-order button:disabled { opacity: .3; cursor: default; }

        .nx-thumb {
          width: 44px; height: 44px; border-radius: 8px;
          object-fit: cover; background: rgba(255,255,255,.05);
          display: block;
        }
        .nx-thumb-empty {
          width: 44px; height: 44px; border-radius: 8px;
          background: rgba(255,255,255,.04);
          border: 1px dashed var(--border);
          display: flex; align-items: center; justify-content: center;
          color: var(--muted-2, #6b6b70); font-size: 15px;
        }

        .nx-main { min-width: 0; text-align: left; background: none; border: 0; cursor: pointer; padding: 0; }
        .nx-title-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .nx-title {
          font-size: 15px; font-weight: 700; color: var(--text);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .nx-title.is-empty { color: var(--muted-2, #6b6b70); font-weight: 500; font-style: italic; }
        .nx-tag {
          flex-shrink: 0;
          padding: 2px 8px; border-radius: 999px;
          font-size: 10px; font-weight: 700; letter-spacing: .04em;
          border: 1px solid currentColor;
        }
        .nx-flag {
          flex-shrink: 0;
          font-size: 11px; font-weight: 700;
          padding: 2px 8px; border-radius: 999px;
        }
        .nx-flag-pin { background: rgba(255,255,255,.08); color: var(--text); }
        .nx-flag-popup { background: rgba(255,107,26,.16); color: var(--accent); }
        .nx-sub {
          margin-top: 4px;
          font-family: var(--mono, monospace); font-size: 11px; color: var(--muted);
          letter-spacing: .04em;
        }
        .nx-edit-btn {
          background: transparent; border: 1px solid var(--border);
          color: var(--muted); border-radius: 8px;
          padding: 7px 14px; font-size: 13px; cursor: pointer; white-space: nowrap;
        }
        .nx-edit-btn:hover { color: var(--accent); border-color: var(--accent); }

        /* ── expanded editor ─────────────────────────────────────── */
        .nx-editor {
          padding: 4px 16px 20px;
          border-top: 1px solid var(--border-soft, #232326);
          display: grid; gap: 18px;
        }
        .nx-section-title {
          margin: 14px 0 0;
          font-family: var(--mono, monospace);
          font-size: 11px; letter-spacing: .16em; text-transform: uppercase;
          color: var(--muted-2, #6b6b70);
        }
        .nx-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
        .nx-label { font-size: 12px; color: var(--muted); margin-bottom: 6px; display: block; }
        .nx-hint { font-size: 12px; color: var(--muted-2, #6b6b70); margin: 6px 0 0; line-height: 1.6; }

        .nx-check { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }

        .nx-imgbox { display: flex; gap: 14px; align-items: flex-start; flex-wrap: wrap; }
        .nx-preview {
          width: 200px; border-radius: 10px; display: block;
          border: 1px solid var(--border);
        }

        .nx-popup-count {
          font-size: 12px; font-weight: 700;
          color: var(--accent); background: rgba(255,107,26,.12);
          padding: 6px 12px; border-radius: 999px;
        }

        @media (max-width: 720px) {
          .nx-row { grid-template-columns: 44px 1fr auto; row-gap: 10px; }
          .nx-order { grid-row: 2; }
          .nx-thumb, .nx-thumb-empty { display: none; }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function NoticeItem({
  notice, index, total, open, pat, onToggle, onPatch, onDelete, onMove, onError,
}: {
  notice: Notice;
  index: number;
  total: number;
  open: boolean;
  pat: string;
  onToggle: () => void;
  onPatch: (patch: Partial<Notice>) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  onError: (msg: string | null) => void;
}) {
  const [showEn, setShowEn] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const popup = notice.popup;

  const pickImage = async (file: File) => {
    setUploading(true);
    onError(null);
    try {
      onPatch({ image: await uploadImage(pat, file) });
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className={`nx-item${open ? ' is-open' : ''}`}>
      <div className="nx-row">
        <div className="nx-order">
          <button type="button" disabled={index === 0} onClick={() => onMove(-1)} title="위로">↑</button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(1)} title="아래로">↓</button>
        </div>

        {notice.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={notice.image} alt="" className="nx-thumb" />
        ) : (
          <div className="nx-thumb-empty" aria-hidden>🖼</div>
        )}

        <button type="button" className="nx-main" onClick={onToggle}>
          <div className="nx-title-line">
            <span className="nx-tag" style={{ color: TYPE_COLOR[notice.type] }}>
              {TYPE_LABEL[notice.type]}
            </span>
            <span className={`nx-title${notice.titleKo ? '' : ' is-empty'}`}>
              {notice.titleKo || '(제목 없음)'}
            </span>
            {notice.pinned ? <span className="nx-flag nx-flag-pin">📌 고정</span> : null}
            {popup?.enabled ? <span className="nx-flag nx-flag-popup">🔔 팝업</span> : null}
          </div>
          <div className="nx-sub">
            {notice.date}
            {popup?.enabled && popup.until ? ` · 팝업 ~${popup.until}` : ''}
          </div>
        </button>

        <button type="button" className="nx-edit-btn" onClick={onToggle}>
          {open ? '접기 ▲' : '수정 ▼'}
        </button>
        <button type="button" className="btn danger small" onClick={onDelete}>삭제</button>
      </div>

      {open ? (
        <div className="nx-editor">
          {/* ── 기본 ─────────────────────────────────────────────── */}
          <div className="nx-grid">
            <label>
              <span className="nx-label">유형</span>
              <select
                value={notice.type}
                onChange={(e) => onPatch({ type: e.target.value as NoticeType })}
              >
                {NOTICE_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="nx-label">게시일</span>
              <input type="date" value={notice.date} onChange={(e) => onPatch({ date: e.target.value })} />
            </label>
            <label className="nx-check" style={{ alignSelf: 'end', paddingBottom: 10 }}>
              <input
                type="checkbox"
                checked={!!notice.pinned}
                onChange={(e) => onPatch({ pinned: e.target.checked })}
              />
              📌 목록 맨 위에 고정
            </label>
          </div>

          {/* ── 내용 (한국어) ─────────────────────────────────────── */}
          <div>
            <label>
              <span className="nx-label">제목</span>
              <input
                type="text"
                value={notice.titleKo}
                placeholder="예) 추석 연휴 배송 안내"
                onChange={(e) => onPatch({ titleKo: e.target.value })}
              />
            </label>
          </div>
          <div>
            <label>
              <span className="nx-label">내용 · 빈 줄을 넣으면 문단이 나뉩니다</span>
              <textarea
                rows={9}
                value={notice.bodyKo}
                placeholder={'예) 추석 연휴 기간 배송 일정을 안내드립니다.\n\n· 휴무: 9월 14일 ~ 9월 18일\n· 주문 마감: 9월 12일 오후 3시'}
                onChange={(e) => onPatch({ bodyKo: e.target.value })}
                style={{ lineHeight: 1.7, resize: 'vertical' }}
              />
            </label>
          </div>

          {/* ── 사진 ─────────────────────────────────────────────── */}
          <div>
            <p className="nx-section-title">사진 (선택)</p>
            <div className="nx-imgbox" style={{ marginTop: 10 }}>
              {notice.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={notice.image} alt="" className="nx-preview" />
              ) : null}
              <DropTarget
                onFile={(f) => void pickImage(f)}
                accept={['image/*']}
                disabled={uploading}
                hint="사진 끌어놓기"
                style={{ flex: 1, minWidth: 220, padding: 16, borderRadius: 10, display: 'grid', gap: 8 }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void pickImage(f);
                  }}
                />
                <button
                  type="button"
                  className="btn ghost small"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  style={{ justifySelf: 'start' }}
                >
                  {uploading ? '⏳ 올리는 중...' : notice.image ? '사진 바꾸기' : '사진 올리기'}
                </button>
                {notice.image ? (
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => onPatch({ image: undefined })}
                    style={{ justifySelf: 'start' }}
                  >
                    사진 빼기
                  </button>
                ) : null}
                <p className="nx-hint">
                  게시판 목록·상세 페이지·팝업에 함께 나옵니다. 가로로 긴 사진이 잘 맞습니다 (최대 20MB).
                </p>
              </DropTarget>
            </div>
          </div>

          {/* ── 팝업 ─────────────────────────────────────────────── */}
          <div>
            <p className="nx-section-title">팝업 알림</p>
            <label className="nx-check" style={{ marginTop: 10 }}>
              <input
                type="checkbox"
                checked={!!popup?.enabled}
                onChange={(e) =>
                  onPatch({ popup: { ...(popup ?? {}), enabled: e.target.checked } })
                }
              />
              🔔 사이트 접속 시 팝업으로 띄우기
            </label>
            {popup?.enabled ? (
              <div style={{ marginTop: 12, maxWidth: 320 }}>
                <label>
                  <span className="nx-label">노출 종료일 · 비워두면 계속 노출</span>
                  <input
                    type="date"
                    value={popup.until ?? ''}
                    min={todayIso()}
                    onChange={(e) => onPatch({ popup: { ...popup, until: e.target.value } })}
                  />
                </label>
                <p className="nx-hint">
                  방문자가 <strong>오늘 하루 보지 않기</strong>를 누르면 그날은 다시 뜨지 않습니다.
                  팝업이 여러 개면 목록에서 위에 있는 것 하나만 나옵니다.
                </p>
              </div>
            ) : null}
          </div>

          {/* ── 영어 (선택) ──────────────────────────────────────── */}
          <div>
            <button
              type="button"
              className="btn ghost small"
              onClick={() => setShowEn((v) => !v)}
            >
              {showEn ? '영어 입력 접기 ▲' : '영어 입력 펼치기 ▼'}
            </button>
            {showEn ? (
              <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                <label>
                  <span className="nx-label">Title (English)</span>
                  <input
                    type="text"
                    value={notice.titleEn}
                    onChange={(e) => onPatch({ titleEn: e.target.value })}
                  />
                </label>
                <label>
                  <span className="nx-label">Body (English)</span>
                  <textarea
                    rows={7}
                    value={notice.bodyEn}
                    onChange={(e) => onPatch({ bodyEn: e.target.value })}
                    style={{ lineHeight: 1.7, resize: 'vertical' }}
                  />
                </label>
              </div>
            ) : (
              <p className="nx-hint">
                비워두면 영문 페이지에서도 한국어 제목이 그대로 표시됩니다.
              </p>
            )}
          </div>

          {/* ── 주소 ─────────────────────────────────────────────── */}
          <div>
            <p className="nx-section-title">공지 주소</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 10, flexWrap: 'wrap' }}>
              <label style={{ flex: 1, minWidth: 240 }}>
                <span className="nx-label">/notices/…  · 영문·숫자·하이픈만</span>
                <input
                  type="text"
                  value={notice.id}
                  onChange={(e) => onPatch({ id: e.target.value })}
                  style={{ fontFamily: 'var(--mono)' }}
                />
              </label>
              <button
                type="button"
                className="btn ghost small"
                onClick={() => onPatch({ id: slugify(notice.titleEn || notice.titleKo) })}
              >
                자동 생성
              </button>
            </div>
            <p className="nx-hint">
              한 번 게시한 뒤에는 바꾸지 마세요. 기존 주소로 들어오는 링크가 깨집니다.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
