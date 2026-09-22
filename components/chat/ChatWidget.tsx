'use client';

/**
 * 상담 챗봇 위젯.
 *
 * 두 단계로 굴러간다.
 *   1) FAQ — 자주 받는 질문을 버튼으로 띄우고 눌린 것의 답을 보여
 *      준다. 사전(contact.faq.items)에서 그대로 읽으므로 관리자에서
 *      FAQ 를 고치면 챗봇 답도 같이 바뀐다. 서버를 거치지 않아 즉시
 *      답하고 비용이 0이다.
 *   2) 상담사 연결 — 이름·연락처를 받고 직원과 실시간으로 주고받는다.
 *      연락처를 받는 이유는 직원이 자리에 없을 때 되돌려 줄 방법이
 *      있어야 하기 때문이다.
 *
 * 실시간은 웹소켓 대신 폴링이다. 방문자 규모가 작아 폴링이 충분하고,
 * 창을 가려 두면 멈추므로 평소 요청량이 거의 없다.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dictionary, Locale } from '@/lib/i18n';
import './chat-widget.css';

type Msg = { id: number; role: 'visitor' | 'staff' | 'bot'; text: string; createdAt: string };
type Faq = { q?: string; a?: string };
type Stage = 'faq' | 'form' | 'live';

const SESSION_KEY = 'nj_chat_session_v1';
/** 열려 있을 때만 이 주기로 새 메시지를 확인한다. */
const POLL_MS = 4000;

function stripTags(s: string | undefined): string {
  return String(s ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function labels(locale: Locale) {
  const ko = locale === 'ko';
  return {
    open: ko ? '상담 문의' : 'Chat',
    title: ko ? '무엇을 도와드릴까요?' : 'How can we help?',
    subtitle: ko ? '자주 묻는 질문을 골라보세요' : 'Pick a common question',
    toStaff: ko ? '상담사와 연결하기' : 'Talk to a person',
    backToFaq: ko ? '← 자주 묻는 질문' : '← Common questions',
    namePh: ko ? '이름 (선택)' : 'Name (optional)',
    contactPh: ko ? '연락처 또는 이메일' : 'Phone or email',
    firstPh: ko ? '문의 내용을 적어주세요' : 'What would you like to ask?',
    start: ko ? '상담 시작' : 'Start chat',
    sendPh: ko ? '메시지를 입력하세요' : 'Type a message',
    send: ko ? '보내기' : 'Send',
    waiting: ko
      ? '상담사에게 알렸습니다. 잠시만 기다려 주세요.'
      : 'We have notified our team. Please hold on.',
    offlineHint: ko
      ? '영업시간(평일 09:00–18:00)이 아니면 답이 늦을 수 있습니다. 연락처를 남겨주시면 확인 후 회신드립니다.'
      : 'Outside business hours (Mon–Fri 09:00–18:00 KST) replies may be delayed.',
    closed: ko ? '상담이 종료되었습니다.' : 'This chat has ended.',
    needContact: ko ? '연락처를 입력해 주세요.' : 'Please enter a contact.',
    failed: ko ? '전송에 실패했습니다. 잠시 후 다시 시도해 주세요.' : 'Failed to send. Please try again.',
    phone: ko ? '전화 02-777-3079' : 'Call 02-777-3079',
    staffLabel: ko ? '상담사' : 'Staff',
    youLabel: ko ? '나' : 'You',
  };
}

export default function ChatWidget({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = labels(locale);
  const faqs: Faq[] = (dict.contact?.faq?.items ?? []) as Faq[];

  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>('faq');
  const [picked, setPicked] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [first, setFirst] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [status, setStatus] = useState<string>('bot');
  const lastIdRef = useRef(0);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // 이전에 상담 중이던 대화가 있으면 이어서 보여 준다. 새로고침하면
  // 대화가 날아가는 것이 가장 답답한 부분이라 세션 id 를 남겨 둔다.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SESSION_KEY);
      if (saved) {
        setSessionId(saved);
        setStage('live');
      }
    } catch {
      /* 저장소를 못 쓰는 브라우저 — 그대로 FAQ 단계로 시작 */
    }
  }, []);

  const scrollDown = useCallback(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  /** 새 메시지만 받아 붙인다. */
  const poll = useCallback(async (sid: string) => {
    try {
      const r = await fetch(`/api/chat/poll?session=${encodeURIComponent(sid)}&after=${lastIdRef.current}`);
      const p = (await r.json().catch(() => ({}))) as {
        ok?: boolean; status?: string; messages?: Msg[];
      };
      if (!p.ok) {
        // 서버에 대화가 없으면(오래되어 정리됨 등) 저장된 id 를 버린다.
        if (r.status === 404) {
          try { window.localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
          setSessionId(null);
          setStage('faq');
        }
        return;
      }
      if (p.status) setStatus(p.status);
      const incoming = p.messages ?? [];
      if (incoming.length > 0) {
        lastIdRef.current = incoming[incoming.length - 1].id;
        setMsgs((prev) => [...prev, ...incoming]);
        requestAnimationFrame(scrollDown);
      }
    } catch {
      /* 네트워크가 끊긴 것 — 다음 주기에 다시 시도한다 */
    }
  }, [scrollDown]);

  // 창이 열려 있고 상담 단계일 때만 폴링한다. 탭을 가리면 멈춘다 —
  // 배경 탭이 하루 종일 서버를 두드릴 이유가 없다.
  useEffect(() => {
    if (!open || stage !== 'live' || !sessionId) return;
    void poll(sessionId);
    let timer: number | null = null;
    const tick = () => {
      if (!document.hidden) void poll(sessionId);
    };
    timer = window.setInterval(tick, POLL_MS);
    return () => { if (timer) window.clearInterval(timer); };
  }, [open, stage, sessionId, poll]);

  async function startChat() {
    if (!contact.trim()) { setErr(t.needContact); return; }
    setBusy(true);
    setErr(null);
    try {
      const s = await fetch('/api/chat/start', { method: 'POST' });
      const sp = (await s.json().catch(() => ({}))) as { ok?: boolean; sessionId?: string; error?: string };
      if (!sp.ok || !sp.sessionId) throw new Error(sp.error || t.failed);

      const r = await fetch('/api/chat/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sp.sessionId, name, contact, text: first }),
      });
      const rp = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!rp.ok) throw new Error(rp.error || t.failed);

      try { window.localStorage.setItem(SESSION_KEY, sp.sessionId); } catch { /* ignore */ }
      setSessionId(sp.sessionId);
      setStage('live');
      setStatus('waiting');
      setFirst('');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : t.failed);
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    const text = draft.trim();
    if (!text || !sessionId) return;
    setDraft('');
    setErr(null);
    // 서버 응답을 기다리지 않고 먼저 보여 준다. 폴링이 같은 메시지를
    // 다시 주지 않도록 id 는 음수로 둔다(서버 id 는 항상 양수).
    setMsgs((prev) => [...prev, { id: -Date.now(), role: 'visitor', text, createdAt: new Date().toISOString() }]);
    requestAnimationFrame(scrollDown);
    try {
      const r = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, text }),
      });
      const p = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!p.ok) setErr(p.error || t.failed);
    } catch {
      setErr(t.failed);
    }
  }

  const closed = status === 'closed';

  return (
    <>
      <button
        type="button"
        className={`cw-fab${open ? ' is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={t.open}
        aria-expanded={open}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        ) : (
          <>
            <svg width="19" height="19" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
              <path d="M14 10.5a1.5 1.5 0 0 1-1.5 1.5H5l-3 2.5V3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5z" />
            </svg>
            <span>{t.open}</span>
          </>
        )}
      </button>

      {open ? (
        <div className="cw-panel" role="dialog" aria-label={t.open}>
          <header className="cw-head">
            <span className="cw-head-brand">NJ SAFETY</span>
            <span className="cw-head-sub">
              {stage === 'live'
                ? status === 'waiting' ? t.waiting : t.staffLabel
                : t.subtitle}
            </span>
          </header>

          <div className="cw-body" ref={bodyRef}>
            {stage === 'faq' ? (
              <>
                <p className="cw-lead">{t.title}</p>
                <div className="cw-faqs">
                  {faqs.map((f, i) => (
                    <div key={i} className="cw-faq">
                      <button
                        type="button"
                        className={`cw-faq-q${picked === i ? ' is-open' : ''}`}
                        onClick={() => setPicked(picked === i ? null : i)}
                      >
                        {stripTags(f.q)}
                      </button>
                      {picked === i ? <p className="cw-faq-a">{stripTags(f.a)}</p> : null}
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {stage === 'form' ? (
              <>
                <p className="cw-lead">{t.toStaff}</p>
                <p className="cw-hint">{t.offlineHint}</p>
                <div className="cw-form">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePh} disabled={busy} />
                  <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t.contactPh} disabled={busy} />
                  <textarea value={first} onChange={(e) => setFirst(e.target.value)} placeholder={t.firstPh} rows={3} disabled={busy} />
                  <button type="button" className="cw-primary" onClick={() => void startChat()} disabled={busy}>
                    {busy ? '…' : t.start}
                  </button>
                </div>
              </>
            ) : null}

            {stage === 'live' ? (
              <div className="cw-msgs">
                {status === 'waiting' ? <p className="cw-sys">{t.waiting}</p> : null}
                {msgs.map((m) => (
                  <div key={m.id} className={`cw-msg cw-msg-${m.role === 'visitor' ? 'me' : 'them'}`}>
                    {m.role !== 'visitor' ? <span className="cw-msg-who">{t.staffLabel}</span> : null}
                    <p>{m.text}</p>
                  </div>
                ))}
                {closed ? <p className="cw-sys">{t.closed}</p> : null}
              </div>
            ) : null}

            {err ? <p className="cw-err">{err}</p> : null}
          </div>

          <footer className="cw-foot">
            {stage === 'faq' ? (
              <button type="button" className="cw-primary" onClick={() => setStage('form')}>
                {t.toStaff}
              </button>
            ) : null}

            {stage === 'form' ? (
              <button type="button" className="cw-ghost" onClick={() => { setStage('faq'); setErr(null); }}>
                {t.backToFaq}
              </button>
            ) : null}

            {stage === 'live' && !closed ? (
              <div className="cw-send">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
                  placeholder={t.sendPh}
                />
                <button type="button" className="cw-primary" onClick={() => void send()} disabled={!draft.trim()}>
                  {t.send}
                </button>
              </div>
            ) : null}

            {stage === 'live' && closed ? (
              <button
                type="button"
                className="cw-ghost"
                onClick={() => {
                  try { window.localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
                  setSessionId(null); setMsgs([]); lastIdRef.current = 0;
                  setStatus('bot'); setStage('faq');
                }}
              >
                {t.backToFaq}
              </button>
            ) : null}

            <a className="cw-tel" href="tel:02-777-3079">{t.phone}</a>
          </footer>
        </div>
      ) : null}
    </>
  );
}
