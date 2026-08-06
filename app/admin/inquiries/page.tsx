'use client';

/**
 * Admin: 문의 접수함
 *
 * Reads the submissions the public 문의 폼 writes to R2 (`inquiries/`
 * prefix) through the Worker's `/api/admin/inquiries` routes. Unlike
 * every other admin screen this one does NOT go through GitHub — the
 * data is runtime submissions, not repo content, so there's nothing to
 * commit and nothing to wait for a build on. Changes here are live the
 * moment R2 acknowledges.
 *
 * Auth is the same GitHub PAT the rest of the admin holds; the Worker
 * verifies it against the allowed login before touching the bucket.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';

type Attachment = { name: string; url: string; size: number };

type Inquiry = {
  id: string;
  receivedAt: string;
  status: 'new' | 'done';
  inquiryType: string;
  inquiryLabel: string;
  company: string;
  contactName: string;
  phone: string;
  email: string;
  message: string;
  attachments: Attachment[];
};

type Filter = 'all' | 'new' | 'done';

const API = '/api/admin/inquiries';

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // Submissions come from Korean customers — show KST regardless of
  // where the admin happens to be.
  return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' });
}

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function InquiriesAdminPage() {
  const { state } = useAdmin();
  const pat = state.status === 'authenticated' ? state.pat : '';

  const [items, setItems] = useState<Inquiry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!pat) return;
    setErr(null);
    try {
      const r = await fetch(API, { headers: { Authorization: `token ${pat}` } });
      const payload = (await r.json().catch(() => ({}))) as { ok?: boolean; items?: Inquiry[]; error?: string };
      if (!r.ok || !payload.ok) throw new Error(payload.error || `요청 실패 (${r.status})`);
      setItems(payload.items ?? []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
      setItems([]);
    }
  }, [pat]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setStatus = useCallback(
    async (id: string, status: 'new' | 'done') => {
      setBusyId(id);
      setErr(null);
      try {
        const r = await fetch(`${API}/status`, {
          method: 'POST',
          headers: { Authorization: `token ${pat}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status }),
        });
        const payload = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!r.ok || !payload.ok) throw new Error(payload.error || `요청 실패 (${r.status})`);
        setItems((prev) => (prev ?? []).map((it) => (it.id === id ? { ...it, status } : it)));
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setBusyId(null);
      }
    },
    [pat],
  );

  const remove = useCallback(
    async (item: Inquiry) => {
      if (!window.confirm(`${item.company} 의 문의를 삭제할까요? 되돌릴 수 없습니다.`)) return;
      setBusyId(item.id);
      setErr(null);
      try {
        const r = await fetch(`${API}?id=${encodeURIComponent(item.id)}`, {
          method: 'DELETE',
          headers: { Authorization: `token ${pat}` },
        });
        const payload = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!r.ok || !payload.ok) throw new Error(payload.error || `요청 실패 (${r.status})`);
        setItems((prev) => (prev ?? []).filter((it) => it.id !== item.id));
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setBusyId(null);
      }
    },
    [pat],
  );

  const newCount = useMemo(() => (items ?? []).filter((i) => i.status === 'new').length, [items]);
  const shown = useMemo(
    () => (items ?? []).filter((i) => (filter === 'all' ? true : i.status === filter)),
    [items, filter],
  );

  const TABS: { key: Filter; label: string }[] = [
    { key: 'all', label: `전체 ${items ? `(${items.length})` : ''}` },
    { key: 'new', label: `신규 ${items ? `(${newCount})` : ''}` },
    { key: 'done', label: `처리완료 ${items ? `(${items.length - newCount})` : ''}` },
  ];

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <span className="eyebrow">— Inquiries</span>
        <h1>문의 <em>접수함</em></h1>
        <p>
          사이트 <strong>문의</strong> 페이지에서 들어온 문의가 여기에 쌓입니다.
          별도 메일 알림은 없으니 주기적으로 확인해 주세요. 처리한 문의는{' '}
          <strong>처리완료</strong>로 표시해 두면 신규 건만 골라 볼 수 있습니다.
        </p>
        <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn ghost" onClick={() => void reload()}>
            새로고침
          </button>
          <Link href="/admin" className="btn ghost">← 대시보드</Link>
        </div>
      </header>

      {err ? <p className="admin-err">에러: {err}</p> : null}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`btn ${filter === t.key ? 'primary' : 'ghost'} small`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {items === null ? (
        <p className="admin-meta">로딩 중...</p>
      ) : shown.length === 0 ? (
        <div className="admin-card admin-card-flat" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--muted)' }}>
            {items.length === 0 ? '아직 접수된 문의가 없습니다.' : '이 조건에 해당하는 문의가 없습니다.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {shown.map((item) => (
            <InquiryCard
              key={item.id}
              item={item}
              busy={busyId === item.id}
              onToggle={() => void setStatus(item.id, item.status === 'new' ? 'done' : 'new')}
              onDelete={() => void remove(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InquiryCard({
  item, busy, onToggle, onDelete,
}: {
  item: Inquiry;
  busy: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isNew = item.status === 'new';
  return (
    <div
      className="admin-card admin-card-flat"
      style={{ padding: 20, opacity: busy ? 0.55 : 1, borderLeft: isNew ? '3px solid var(--accent)' : undefined }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 16 }}>{item.company}</strong>
        <span className="admin-meta">{item.inquiryLabel}</span>
        <span className="admin-meta" style={{ marginLeft: 'auto' }}>{fmtWhen(item.receivedAt)}</span>
        <span
          className="admin-meta"
          style={{ color: isNew ? 'var(--accent)' : 'var(--muted)', fontWeight: 600 }}
        >
          {isNew ? '● 신규' : '✓ 처리완료'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '12px 0', fontSize: 14 }}>
        <span>{item.contactName}</span>
        <a href={`tel:${item.phone.replace(/[^0-9+]/g, '')}`}>{item.phone}</a>
        <a href={`mailto:${item.email}?subject=${encodeURIComponent(`[NJ SAFETY] ${item.inquiryLabel} 회신`)}`}>
          {item.email}
        </a>
      </div>

      <div
        style={{
          background: 'var(--bg, #111)',
          border: '1px solid var(--border, #333)',
          padding: 14,
          whiteSpace: 'pre-wrap',
          fontSize: 14,
          lineHeight: 1.7,
        }}
      >
        {item.message}
      </div>

      {item.attachments.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'grid', gap: 6 }}>
          {item.attachments.map((a) => (
            <li key={a.url} style={{ fontSize: 13 }}>
              <a href={a.url} target="_blank" rel="noreferrer">📎 {a.name}</a>{' '}
              <span className="admin-meta">({fmtSize(a.size)})</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn ghost small" onClick={onToggle} disabled={busy}>
          {isNew ? '처리완료로 표시' : '신규로 되돌리기'}
        </button>
        <button type="button" className="btn danger small" onClick={onDelete} disabled={busy}>
          삭제
        </button>
      </div>
    </div>
  );
}
