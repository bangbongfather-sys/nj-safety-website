'use client';

/**
 * Admin: 공지사항 관리
 *
 * Authors the notice board shown at /<locale>/notices. Each row is one
 * notice with bilingual title + body, a type tag, an optional pin, and a
 * publish date.
 *
 * Source of truth: `data/notices.json`, committed via the GitHub Contents
 * API like every other admin edit. After save the Cloudflare build picks
 * up the new file on the next deploy (~1–2 min) and both the list page and
 * each notice's static detail page are regenerated.
 */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { ghGetFile, ghPutFile } from '@/lib/admin/github';
import { NOTICE_TYPES, type Notice, type NoticeType } from '@/lib/notice-types';

type NoticesFile = { notices: Notice[] };

const NOTICES_PATH = 'data/notices.json';

const TYPE_LABEL: Record<NoticeType, string> = {
  notice: '공지',
  product: '제품',
  cert: '인증',
  event: '행사',
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

export default function NoticesAdminPage() {
  const { state } = useAdmin();
  const pat = state.status === 'authenticated' ? state.pat : '';

  const [notices, setNotices] = useState<Notice[] | null>(null);
  const [sha, setSha] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

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

  useEffect(() => { void reload(); }, [reload]);

  const mutate = useCallback((fn: (list: Notice[]) => Notice[]) => {
    setNotices((cur) => (cur ? fn(cur) : cur));
    setDirty(true);
    setSavedAt(null);
  }, []);

  const handleAdd = () => {
    mutate((list) => [
      {
        id: `notice-${Date.now().toString(36)}`,
        type: 'notice',
        pinned: false,
        date: todayIso(),
        titleKo: '새 공지',
        titleEn: 'New notice',
        bodyKo: '',
        bodyEn: '',
      },
      ...list,
    ]);
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
        setErr(`잘못된 ID: "${n.id}". 영소문자/숫자/하이픈만 사용해주세요.`);
        return;
      }
      if (ids.has(n.id)) {
        setErr(`중복된 ID: "${n.id}". 각 공지는 고유 ID가 필요합니다.`);
        return;
      }
      ids.add(n.id);
      if (!n.titleKo.trim() && !n.titleEn.trim()) {
        setErr(`제목이 비어 있는 공지가 있습니다 (id: "${n.id}").`);
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(n.date)) {
        setErr(`날짜 형식이 올바르지 않습니다 (id: "${n.id}"). YYYY-MM-DD 형식이어야 합니다.`);
        return;
      }
    }

    setSaving(true);
    setErr(null);
    try {
      const out: NoticesFile = { notices };
      const text = JSON.stringify(out, null, 2) + '\n';
      const r = await ghPutFile(
        pat,
        NOTICES_PATH,
        text,
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

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <span className="eyebrow">— Notices</span>
        <h1>공지사항 <em>관리</em></h1>
        <p>
          상단 메뉴 <strong>공지사항</strong> 게시판에 노출되는 글을 관리합니다.
          제목·본문은 한국어/영어를 따로 입력하며, 저장하면 GitHub에 커밋되고
          1~2분 뒤 라이브 사이트(목록 + 상세 페이지)에 반영됩니다.
        </p>
        <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn primary" onClick={handleAdd}>
            + 새 공지
          </button>
          <button type="button" className="btn ghost" onClick={() => void reload()}>
            새로고침
          </button>
          <Link href="/admin" className="btn ghost">← 대시보드</Link>
        </div>
      </header>

      {err ? <p className="admin-err">에러: {err}</p> : null}

      {notices === null ? (
        <p className="admin-meta">로딩 중...</p>
      ) : notices.length === 0 ? (
        <div className="admin-card admin-card-flat" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--muted)' }}>
            아직 등록된 공지가 없습니다. 위 <strong>+ 새 공지</strong> 버튼으로 시작하세요.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {notices.map((n, idx) => (
            <NoticeRow
              key={`${n.id}-${idx}`}
              notice={n}
              index={idx}
              total={notices.length}
              onPatch={(patch) => handlePatch(idx, patch)}
              onDelete={() => handleDelete(idx)}
              onMove={(dir) => handleMove(idx, dir)}
            />
          ))}
        </div>
      )}

      {dirty || saving || savedAt ? (
        <div className="cat-save-bar">
          <div className="cat-save-bar-inner">
            {dirty ? (
              <span className="cat-save-state cat-save-state-dirty">● 저장하지 않은 변경사항</span>
            ) : saving ? (
              <span className="cat-save-state">⏳ 저장 중...</span>
            ) : savedAt ? (
              <span className="cat-save-state cat-save-state-saved">✓ 저장됨</span>
            ) : null}
            <button
              type="button"
              className="btn primary"
              disabled={!dirty || saving}
              onClick={() => void handleSave()}
            >
              {saving ? '저장 중...' : '저장 (GitHub에 커밋)'}
            </button>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .cat-save-bar {
          position: sticky;
          bottom: 16px;
          margin-top: 32px;
          z-index: 20;
        }
        .cat-save-bar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          background: rgba(20, 20, 22, .98);
          border: 1px solid var(--border-soft);
          border-radius: 12px;
          padding: 14px 18px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, .45);
          backdrop-filter: saturate(150%) blur(14px);
        }
        .cat-save-state { font-size: 13px; color: var(--muted); }
        .cat-save-state-dirty { color: #ffb066; }
        .cat-save-state-saved { color: #4ade80; }
      `}</style>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────── */

function NoticeRow({
  notice,
  index,
  total,
  onPatch,
  onDelete,
  onMove,
}: {
  notice: Notice;
  index: number;
  total: number;
  onPatch: (patch: Partial<Notice>) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="admin-card admin-card-flat" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button type="button" className="btn ghost small" disabled={index === 0} onClick={() => onMove(-1)} title="위로">↑</button>
          <button type="button" className="btn ghost small" disabled={index === total - 1} onClick={() => onMove(1)} title="아래로">↓</button>
          <span style={{ marginLeft: 8, color: 'var(--muted)', fontSize: 13 }}>#{index + 1}</span>
        </div>
        <button type="button" className="btn danger small" onClick={onDelete}>삭제</button>
      </div>

      {/* Meta row: type / pinned / date */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
        <label style={{ display: 'block' }}>
          <div style={fieldLabel}>유형</div>
          <select
            value={notice.type}
            onChange={(e) => onPatch({ type: e.target.value as NoticeType })}
            style={inputStyle}
          >
            {NOTICE_TYPES.map((ty) => (
              <option key={ty} value={ty}>{TYPE_LABEL[ty]}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'block' }}>
          <div style={fieldLabel}>게시일</div>
          <input
            type="date"
            value={notice.date}
            onChange={(e) => onPatch({ date: e.target.value })}
            style={inputStyle}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'end', paddingBottom: 8 }}>
          <input
            type="checkbox"
            checked={!!notice.pinned}
            onChange={(e) => onPatch({ pinned: e.target.checked })}
          />
          <span style={{ fontSize: 14 }}>📌 상단 고정</span>
        </label>
      </div>

      {/* Titles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 14 }}>
        <Field label="제목 (한국어)" value={notice.titleKo} onChange={(v) => onPatch({ titleKo: v })} />
        <Field label="Title (English)" value={notice.titleEn} onChange={(v) => onPatch({ titleEn: v })} />
      </div>

      {/* Bodies */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 14 }}>
        <TextArea
          label="본문 (한국어)"
          hint="빈 줄로 문단 구분"
          value={notice.bodyKo}
          onChange={(v) => onPatch({ bodyKo: v })}
        />
        <TextArea
          label="Body (English)"
          hint="Blank line = new paragraph"
          value={notice.bodyEn}
          onChange={(v) => onPatch({ bodyEn: v })}
        />
      </div>

      {/* ID */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Field
            label="URL ID"
            hint="/notices/[ID]"
            value={notice.id}
            mono
            onChange={(v) => onPatch({ id: v.trim() })}
          />
        </div>
        <button
          type="button"
          className="btn ghost small"
          onClick={() => {
            const auto = slugify(notice.titleEn || notice.titleKo);
            if (auto && auto !== notice.id) onPatch({ id: auto });
          }}
          title="제목에서 ID 자동 생성"
          style={{ marginBottom: 1 }}
        >
          ID 자동
        </button>
      </div>
    </div>
  );
}

const fieldLabel: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4 };
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: 'rgba(255,255,255,.04)',
  border: '1px solid var(--border-soft)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: 14,
  fontFamily: 'inherit',
};

function Field({
  label,
  hint,
  value,
  onChange,
  mono,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  mono?: boolean;
}) {
  return (
    <label style={{ display: 'block' }}>
      <div style={fieldLabel}>
        {label}
        {hint ? <span style={{ marginLeft: 6, opacity: .7 }}>· {hint}</span> : null}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, fontFamily: mono ? 'var(--mono)' : 'inherit' }}
      />
    </label>
  );
}

function TextArea({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label style={{ display: 'block' }}>
      <div style={fieldLabel}>
        {label}
        {hint ? <span style={{ marginLeft: 6, opacity: .7 }}>· {hint}</span> : null}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={7}
        style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
      />
    </label>
  );
}
