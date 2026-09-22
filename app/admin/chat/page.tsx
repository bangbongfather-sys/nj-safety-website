'use client';

/**
 * 실시간 상담 화면.
 *
 * 왼쪽에 대화 목록, 오른쪽에 내용과 답장칸. 새 메시지는 폴링으로
 * 받는다 — 방문자 쪽 위젯과 같은 이유로 웹소켓을 쓰지 않는다.
 *
 * 목록은 대기 중인 대화가 위로 오도록 서버에서 정렬해 내려온다.
 * 직원이 화면을 열었을 때 가장 급한 것이 먼저 보여야 한다.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';

type Msg = { id: number; role: 'visitor' | 'staff' | 'bot'; text: string; createdAt: string };
type Session = {
  id: string; createdAt: string; lastAt: string;
  status: 'bot' | 'waiting' | 'live' | 'closed';
  visitorName: string; visitorContact: string; unread: number; lastText: string;
};

const LIST_POLL_MS = 5000;
const MSG_POLL_MS = 3000;

const STATUS_LABEL: Record<Session['status'], string> = {
  waiting: '대기 중',
  live: '상담 중',
  closed: '종료',
  bot: 'FAQ',
};

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    ...(today ? { hour: '2-digit', minute: '2-digit' } : { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  });
}

export default function ChatAdminPage() {
  const { state } = useAdmin();
  const pat = state.status === 'authenticated' ? state.pat : '';

  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [summary, setSummary] = useState<{ waiting: number; unread: number }>({ waiting: 0, unread: 0 });
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [status, setStatus] = useState<string>('bot');
  const [who, setWho] = useState<{ name: string; contact: string }>({ name: '', contact: '' });
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState<string | null>(null);
  /** 휴대폰에서는 목록과 대화를 같이 못 보여 준다 — 탭처럼 오간다. */
  const [mobileThread, setMobileThread] = useState(false);

  const lastIdRef = useRef(0);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const headers = useCallback(() => ({ Authorization: `token ${pat}` }), [pat]);

  const loadSessions = useCallback(async () => {
    if (!pat) return;
    try {
      const r = await fetch('/api/admin/chat/sessions', { headers: headers() });
      const p = (await r.json().catch(() => ({}))) as {
        ok?: boolean; sessions?: Session[]; summary?: { waiting: number; unread: number }; error?: string;
      };
      if (!p.ok) throw new Error(p.error || `요청 실패 (${r.status})`);
      setSessions(p.sessions ?? []);
      if (p.summary) setSummary(p.summary);
      setErr(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
      setSessions([]);
    }
  }, [pat, headers]);

  const loadMessages = useCallback(async (sid: string, after: number) => {
    try {
      const r = await fetch(`/api/admin/chat/messages?session=${encodeURIComponent(sid)}&after=${after}`, {
        headers: headers(),
      });
      const p = (await r.json().catch(() => ({}))) as {
        ok?: boolean; status?: string; visitorName?: string; visitorContact?: string; messages?: Msg[]; error?: string;
      };
      if (!p.ok) return;
      if (p.status) setStatus(p.status);
      if (after === 0) setWho({ name: p.visitorName ?? '', contact: p.visitorContact ?? '' });
      const incoming = p.messages ?? [];
      if (incoming.length > 0) {
        lastIdRef.current = incoming[incoming.length - 1].id;
        setMsgs((prev) => (after === 0 ? incoming : [...prev, ...incoming]));
        requestAnimationFrame(() => {
          const el = bodyRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        });
      } else if (after === 0) {
        setMsgs([]);
      }
    } catch {
      /* 다음 주기에 다시 */
    }
  }, [headers]);

  // 목록 폴링 — 탭을 가리면 멈춘다.
  useEffect(() => {
    void loadSessions();
    const t = window.setInterval(() => { if (!document.hidden) void loadSessions(); }, LIST_POLL_MS);
    return () => window.clearInterval(t);
  }, [loadSessions]);

  // 대화 폴링
  useEffect(() => {
    if (!active) return;
    lastIdRef.current = 0;
    void loadMessages(active, 0);
    const t = window.setInterval(() => {
      if (!document.hidden) void loadMessages(active, lastIdRef.current);
    }, MSG_POLL_MS);
    return () => window.clearInterval(t);
  }, [active, loadMessages]);

  async function reply() {
    const text = draft.trim();
    if (!text || !active) return;
    setDraft('');
    try {
      const r = await fetch('/api/admin/chat/reply', {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: active, text }),
      });
      const p = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!p.ok) { setErr(p.error || '전송 실패'); return; }
      await loadMessages(active, lastIdRef.current);
      void loadSessions();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '전송 실패');
    }
  }

  async function close() {
    if (!active) return;
    if (!window.confirm('이 상담을 종료할까요? 방문자 화면에 종료 안내가 표시됩니다.')) return;
    await fetch('/api/admin/chat/close', {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: active }),
    });
    setStatus('closed');
    void loadSessions();
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <span className="eyebrow">— Live Chat</span>
        <h1>
          실시간 상담
          {summary.waiting > 0 ? <span className="ch-badge-hot">대기 {summary.waiting}</span> : null}
        </h1>
      </header>

      {err ? <div className="admin-error">{err}</div> : null}

      <div className={`ch-wrap${mobileThread ? ' is-thread' : ''}`}>
        {/* ── 대화 목록 ── */}
        <aside className="ch-list">
          <div className="ch-list-head">
            <span>대화 {sessions?.length ?? 0}</span>
            {summary.unread > 0 ? <span className="ch-badge">안 읽음 {summary.unread}</span> : null}
          </div>
          {sessions === null ? (
            <p className="admin-help" style={{ padding: 14 }}>불러오는 중…</p>
          ) : sessions.length === 0 ? (
            <p className="admin-help" style={{ padding: 14 }}>
              아직 상담 요청이 없습니다. 방문자가 홈페이지 오른쪽 아래 상담 버튼에서
              &lsquo;상담사와 연결하기&rsquo;를 누르면 여기에 나타납니다.
            </p>
          ) : (
            <ul>
              {sessions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`ch-item${active === s.id ? ' is-on' : ''}${s.status === 'waiting' ? ' is-waiting' : ''}`}
                    onClick={() => { setActive(s.id); setMobileThread(true); }}
                  >
                    <span className="ch-item-top">
                      <b>{s.visitorName || '방문자'}</b>
                      <span className={`ch-status ch-status-${s.status}`}>{STATUS_LABEL[s.status]}</span>
                    </span>
                    <span className="ch-item-last">{s.lastText || '—'}</span>
                    <span className="ch-item-meta">
                      {timeLabel(s.lastAt)}
                      {s.unread > 0 ? <span className="ch-badge">{s.unread}</span> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* ── 대화 내용 ── */}
        <section className="ch-thread">
          {!active ? (
            <p className="admin-help" style={{ padding: 20 }}>왼쪽에서 대화를 선택하세요.</p>
          ) : (
            <>
              <div className="ch-thread-head">
                <button type="button" className="ch-back" onClick={() => setMobileThread(false)}>← 목록</button>
                <div className="ch-thread-who">
                  <b>{who.name || '방문자'}</b>
                  {who.contact ? <a href={`tel:${who.contact}`}>{who.contact}</a> : <span>연락처 미입력</span>}
                </div>
                <div className="ch-thread-act">
                  <span className={`ch-status ch-status-${status}`}>{STATUS_LABEL[(status as Session['status'])] ?? status}</span>
                  {status !== 'closed' ? (
                    <button type="button" className="btn ghost small" onClick={() => void close()}>상담 종료</button>
                  ) : null}
                </div>
              </div>

              <div className="ch-msgs" ref={bodyRef}>
                {msgs.map((m) => (
                  <div key={m.id} className={`ch-msg ch-msg-${m.role === 'staff' ? 'me' : 'them'}`}>
                    <p>{m.text}</p>
                    <span className="ch-msg-time">{timeLabel(m.createdAt)}</span>
                  </div>
                ))}
                {msgs.length === 0 ? <p className="admin-help">아직 메시지가 없습니다.</p> : null}
              </div>

              {status !== 'closed' ? (
                <div className="ch-send">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void reply(); } }}
                    placeholder="답장을 입력하세요 (Enter 전송 · Shift+Enter 줄바꿈)"
                    rows={2}
                  />
                  <button type="button" className="btn primary" onClick={() => void reply()} disabled={!draft.trim()}>
                    보내기
                  </button>
                </div>
              ) : (
                <p className="admin-help" style={{ padding: 14 }}>종료된 상담입니다.</p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
