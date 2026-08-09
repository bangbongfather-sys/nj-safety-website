'use client';

/**
 * One row of the 공지사항 admin list: a compact summary line that expands
 * into the editor. Split out of app/admin/notices/page.tsx because a Next
 * page file may only export its default, and this needs to be importable
 * (it is the piece worth previewing on its own).
 *
 * Styling lives in globals.css under the `.nx-` prefix rather than a
 * per-instance <style> block, so it isn't duplicated once per notice.
 */

import { useRef, useState } from 'react';
import DropTarget from '@/components/admin/DropTarget';
import { NOTICE_TYPES, type Notice, type NoticeType } from '@/lib/notice-types';

export const TYPE_LABEL: Record<NoticeType, string> = {
  notice: '공지',
  product: '제품',
  cert: '인증',
  event: '행사',
};

export const TYPE_COLOR: Record<NoticeType, string> = {
  notice: '#7c8cff',
  product: '#ff6b1a',
  cert: '#3fbf7f',
  event: '#e0a33a',
};

const UPLOAD_ENDPOINT = '/api/admin/upload-image';
const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // matches the Worker cap

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function slugify(text: string): string {
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

/** Filename -> R2-key-safe stem; the Worker's key regex is ASCII-only. */
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

export default function NoticeItem({
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
