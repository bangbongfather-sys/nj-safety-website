'use client';

/**
 * Admin: 문의 접수함 — 메일함형 (2026-08 개편).
 *
 * 왼쪽 목록 / 오른쪽 상세. 예전에는 모든 문의가 펼쳐진 채 세로로
 * 쌓여서, 스무 건만 넘어가도 스크롤이 끝없이 길어지고 어느 것이
 * 처리됐는지 훑을 수가 없었다. 목록과 내용을 나누면 건수가 늘어도
 * 스크롤은 왼쪽 목록에만 생긴다.
 *
 * 함께 들어온 것:
 *   · 검색 — 회사·담당자·전화·이메일·본문·유형을 한 번에. 한글 초성도
 *     받는다("ㅇㄹㅁㄷ" → 아라미드). lib/search 의 헬퍼를 재사용한다.
 *   · 「메일로 회신」 — 가장 자주 하는 일이 가장 큰 버튼이 되도록.
 *     예전에는 본문 속 이메일 글자 하나가 전부였다.
 *   · 전화·이메일 복사 버튼 — 견적서 쓰려고 옮겨 적을 때 쓴다.
 *
 * 데이터 경로는 그대로다. 다른 관리자 화면과 달리 GitHub 을 거치지
 * 않고 Worker 의 `/api/admin/inquiries` 로 R2 를 직접 읽고 쓴다 —
 * 저장소 내용이 아니라 런타임 접수분이라 커밋할 것도, 빌드를 기다릴
 * 것도 없다. 여기서의 변경은 R2 가 응답하는 순간 반영된다.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { BADGE_CACHE_KEY } from '@/components/admin/Sidebar';
import { normalize, toChosung } from '@/lib/search';

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

/** 접수 시각은 한국 고객이 보낸 것이므로 관리자가 어디 있든 KST. */
function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' });
}

/** 목록용 짧은 시각 — 오늘이면 시:분, 아니면 월.일. */
function fmtShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

/** 목록을 오늘 / 지난 7일 / 그 이전으로 묶는다. */
function bucketOf(iso: string): '오늘' | '지난 7일' | '이전' {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '이전';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (d >= startOfToday) return '오늘';
  if (d >= startOfToday - 6 * 86400_000) return '지난 7일';
  return '이전';
}

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** 한 문의에서 검색 대상이 되는 모든 글자. */
function haystack(i: Inquiry): string {
  return [i.company, i.contactName, i.phone, i.email, i.inquiryLabel, i.message].join(' ');
}

function matches(i: Inquiry, q: string): boolean {
  const nq = normalize(q);
  if (!nq) return true;
  const hay = normalize(haystack(i));
  if (hay.includes(nq)) return true;
  // 초성만 친 경우("ㅇㅊㅈㄹ")도 받아 준다.
  if (/^[ㄱ-ㅎ]+$/.test(nq)) return toChosung(hay).includes(nq);
  return false;
}

export default function InquiriesAdminPage() {
  const { state } = useAdmin();
  const pat = state.status === 'authenticated' ? state.pat : '';

  const [items, setItems] = useState<Inquiry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /**
   * 휴대폰에서는 목록과 본문을 같이 못 보여 준다 — 둘 다 넣으면 목록은
   * 손바닥만 한 스크롤 창이 되고 본문은 화면 밖으로 밀린다. 메일 앱처럼
   * 목록 → (탭) → 본문 → (뒤로) 로 오간다. 넓은 화면에서는 이 값이
   * 무엇이든 둘 다 보이므로 아무 영향이 없다.
   */
  const [mobileDetail, setMobileDetail] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

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
        setSelectedId((cur) => (cur === item.id ? null : cur));
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setBusyId(null);
      }
    },
    [pat],
  );

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    } catch {
      // 클립보드가 막힌 브라우저 — 글자는 화면에 그대로 있으니 직접 긁으면 된다.
    }
  }

  const newCount = useMemo(() => (items ?? []).filter((i) => i.status === 'new').length, [items]);

  // 사이드바의 "새 문의" 배지는 60초 캐시를 본다. 여기서 처리완료로
  // 바꿨는데 옆 배지가 옛 숫자를 들고 있으면 방금 한 일이 안 먹은
  // 것처럼 보이므로, 목록이 바뀔 때마다 캐시를 갱신해 둔다.
  useEffect(() => {
    if (items === null) return;
    try {
      window.sessionStorage.setItem(
        BADGE_CACHE_KEY,
        JSON.stringify({ n: newCount, at: Date.now() }),
      );
    } catch {
      // 저장소가 막혀 있으면 배지가 조금 늦게 맞춰질 뿐이다.
    }
  }, [items, newCount]);

  const shown = useMemo(
    () =>
      (items ?? [])
        .filter((i) => (filter === 'all' ? true : i.status === filter))
        .filter((i) => matches(i, query)),
    [items, filter, query],
  );

  // 목록이 바뀌면 고른 문의가 사라질 수 있다. 그럴 땐 맨 위로.
  useEffect(() => {
    if (shown.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !shown.some((i) => i.id === selectedId)) {
      setSelectedId(shown[0].id);
    }
  }, [shown, selectedId]);

  const selected = shown.find((i) => i.id === selectedId) ?? null;

  // 날짜 묶음 머리글을 목록 중간에 끼워 넣기 위한 전처리.
  const rows = useMemo(() => {
    const out: ({ kind: 'head'; label: string } | { kind: 'item'; item: Inquiry })[] = [];
    let last = '';
    for (const item of shown) {
      const b = bucketOf(item.receivedAt);
      if (b !== last) {
        out.push({ kind: 'head', label: b });
        last = b;
      }
      out.push({ kind: 'item', item });
    }
    return out;
  }, [shown]);

  const TABS: { key: Filter; label: string }[] = [
    { key: 'all', label: `전체 ${items ? items.length : ''}` },
    { key: 'new', label: `신규 ${items ? newCount : ''}` },
    { key: 'done', label: `처리완료 ${items ? items.length - newCount : ''}` },
  ];

  return (
    <div className="admin-page inq-page">
      <header className="inq-head">
        <div className="inq-head-l">
          <span className="eyebrow">— Inquiries</span>
          <h1>문의 접수함</h1>
        </div>
        <div className="inq-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`btn ${filter === t.key ? 'primary' : ''} small`}
              onClick={() => setFilter(t.key)}
            >
              {t.label}
            </button>
          ))}
          {query ? (
            <span className="admin-meta inq-tabs-note">
              &lsquo;{query}&rsquo; {shown.length}건
            </span>
          ) : null}
        </div>
        <div className="inq-head-r">
          <div className="inq-search">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7}>
              <circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" />
            </svg>
            <input
              type="text"
              value={query}
              placeholder="회사·담당자·전화·내용 검색"
              onChange={(e) => setQuery(e.target.value)}
            />
            {query ? (
              <button type="button" className="inq-search-clear" onClick={() => setQuery('')} aria-label="검색어 지우기">✕</button>
            ) : null}
          </div>
          <button type="button" className="btn" onClick={() => void reload()}>새로고침</button>
          <Link href="/admin" className="btn">← 홈</Link>
        </div>
      </header>

      {err ? <p className="admin-err">에러: {err}</p> : null}

      {items === null ? (
        <p className="admin-meta">로딩 중...</p>
      ) : (
        <div className={`inq-split${mobileDetail ? ' is-detail' : ''}`}>
          <div className="inq-list">
            {rows.length === 0 ? (
              <div className="inq-empty">
                {query
                  ? '검색 결과가 없습니다.'
                  : items.length === 0
                    ? '아직 접수된 문의가 없습니다.'
                    : '이 조건에 해당하는 문의가 없습니다.'}
              </div>
            ) : (
              rows.map((r, idx) =>
                r.kind === 'head' ? (
                  <div className="inq-list-head" key={`h-${r.label}-${idx}`}>{r.label}</div>
                ) : (
                  <button
                    type="button"
                    key={r.item.id}
                    className={`inq-row${r.item.id === selectedId ? ' is-sel' : ''}${r.item.status === 'new' ? ' is-new' : ''}`}
                    onClick={() => {
                      setSelectedId(r.item.id);
                      setMobileDetail(true);
                    }}
                  >
                    <span className="inq-row-top">
                      {r.item.status === 'new' ? (
                        <span className="inq-dot" aria-label="신규" />
                      ) : (
                        <svg className="inq-check" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-label="처리완료"><path d="M3 8.5l3.5 3.5L13 5" /></svg>
                      )}
                      <span className="inq-row-co">{r.item.company || r.item.contactName}</span>
                      <span className="inq-row-when">{fmtShort(r.item.receivedAt)}</span>
                    </span>
                    <span className="inq-row-type">{r.item.inquiryLabel}</span>
                    <span className="inq-row-msg">{r.item.message}</span>
                  </button>
                ),
              )
            )}
          </div>

          <div className="inq-detail">
            {!selected ? (
              <div className="inq-empty">왼쪽에서 문의를 선택하세요.</div>
            ) : (
              <>
                <div className="inq-detail-head">
                  <button type="button" className="inq-back" onClick={() => setMobileDetail(false)}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5" /></svg>
                    목록
                  </button>
                  <div className="inq-detail-title">
                    <div className="inq-detail-name">
                      <strong>{selected.company || selected.contactName}</strong>
                      <span className={`inq-badge${selected.status === 'new' ? ' is-new' : ''}`}>
                        {selected.status === 'new' ? '신규' : '처리완료'}
                      </span>
                    </div>
                    <div className="admin-meta">
                      {selected.inquiryLabel} · {fmtWhen(selected.receivedAt)}
                      {selected.company && selected.contactName ? ` · ${selected.contactName}` : ''}
                    </div>
                  </div>
                  <div className="inq-detail-actions">
                    <a
                      className="btn primary"
                      href={`mailto:${selected.email}?subject=${encodeURIComponent(`[NJ SAFETY] ${selected.inquiryLabel} 회신`)}&body=${encodeURIComponent(`${selected.contactName || selected.company} 님, 안녕하세요.\nNJ SAFETY 입니다.\n\n문의 주신 내용에 대해 회신드립니다.\n\n\n─────────────────\n보내신 내용\n${selected.message}\n`)}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.7}><path d="M2 4h12v8H2z" /><path d="M2 4.5l6 4 6-4" /></svg>
                      메일로 회신
                    </a>
                    <button
                      type="button"
                      className="btn"
                      disabled={busyId === selected.id}
                      onClick={() => void setStatus(selected.id, selected.status === 'new' ? 'done' : 'new')}
                    >
                      {selected.status === 'new' ? '처리완료' : '신규로 되돌리기'}
                    </button>
                  </div>
                </div>

                <div className="inq-contacts">
                  <div className="inq-contact">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M3 3h3l1 3-2 1a7 7 0 0 0 4 4l1-2 3 1v3a11 11 0 0 1-10-10z" /></svg>
                    <a href={`tel:${selected.phone.replace(/[^0-9+]/g, '')}`}>{selected.phone}</a>
                    <button type="button" onClick={() => void copy(selected.phone, 'phone')}>
                      {copied === 'phone' ? '복사됨' : '복사'}
                    </button>
                  </div>
                  <div className="inq-contact">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M2 4h12v8H2z" /><path d="M2 4.5l6 4 6-4" /></svg>
                    <a href={`mailto:${selected.email}`}>{selected.email}</a>
                    <button type="button" onClick={() => void copy(selected.email, 'email')}>
                      {copied === 'email' ? '복사됨' : '복사'}
                    </button>
                  </div>
                </div>

                <div className="inq-body">{selected.message}</div>

                <div className="inq-foot">
                  {selected.attachments.length > 0 ? (
                    <div className="inq-files">
                      {selected.attachments.map((a) => (
                        <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="inq-file">
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M9 2.5L4 7.5a2.5 2.5 0 0 0 3.5 3.5l5-5a4 4 0 0 0-5.5-5.5l-5 5" /></svg>
                          {a.name} <span className="admin-meta">({fmtSize(a.size)})</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="admin-meta">첨부 없음</span>
                  )}
                  <button
                    type="button"
                    className="btn danger small"
                    disabled={busyId === selected.id}
                    onClick={() => void remove(selected)}
                  >
                    삭제
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
