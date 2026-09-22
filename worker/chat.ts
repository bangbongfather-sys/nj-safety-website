/**
 * 실시간 상담 채팅 (D1).
 *
 * 방문자와 직원이 주고받는 대화를 저장한다. 웹소켓 대신 짧은 주기
 * 폴링으로 굴린다 — 방문자가 하루 열 명 남짓인 규모에서 Durable
 * Object 와 웹소켓을 끌어오는 것은 과하고, 폴링은 무료 플랜에서
 * 그냥 돌아간다. 창을 가려 두면 폴링이 멈추도록 클라이언트에서
 * 제어하므로 평소 요청량도 거의 없다.
 *
 * 저장하는 것은 대화 내용과, 방문자가 남긴 연락처뿐이다. IP 는
 * 남용을 막는 용도로만 쓰고 원문을 남기지 않는다.
 */

import type { D1Database } from './users';

export type ChatRole = 'visitor' | 'staff' | 'bot';

export type ChatMessage = {
  id: number;
  role: ChatRole;
  text: string;
  createdAt: string;
};

export type ChatSessionRow = {
  id: string;
  createdAt: string;
  lastAt: string;
  status: 'bot' | 'waiting' | 'live' | 'closed';
  visitorName: string;
  visitorContact: string;
  /** 방문자가 마지막으로 읽은 메시지 id — 직원 답장 배지에 쓴다. */
  lastReadByStaff: number;
  unread: number;
  lastText: string;
};

const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS chat_sessions (
    id                TEXT PRIMARY KEY,
    created_at        TEXT NOT NULL,
    last_at           TEXT NOT NULL,
    -- bot: FAQ 단계 / waiting: 상담사 호출 후 대기 / live: 직원 응답 중 / closed: 종료
    status            TEXT NOT NULL DEFAULT 'bot',
    visitor_name      TEXT NOT NULL DEFAULT '',
    visitor_contact   TEXT NOT NULL DEFAULT '',
    ip_hash           TEXT NOT NULL DEFAULT '',
    last_read_by_staff INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role       TEXT NOT NULL,
    text       TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_chat_messages_session
     ON chat_messages (session_id, id)`,
];

let schemaReady = false;

export async function ensureChatSchema(db: D1Database): Promise<void> {
  if (schemaReady) return;
  for (const sql of SCHEMA_SQL) await db.prepare(sql).run();
  schemaReady = true;
}

/* ── 한도 ─────────────────────────────────────────────────────────
 * 공개 엔드포인트라 인증을 걸 수 없다. 대신 한 대화가 무한히 길어지
 * 거나 한 사람이 대화를 수백 개 만드는 것을 막는다. 정상적인 상담은
 * 이 숫자에 닿지 않는다. */
export const MAX_TEXT_LEN = 1000;
const MAX_MESSAGES_PER_SESSION = 200;
const MAX_SESSIONS_PER_IP_DAY = 20;

export function newSessionId(): string {
  // 추측으로 남의 대화를 열 수 없을 만큼의 길이.
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export async function hashIp(ip: string, salt: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${ip}|${salt}`));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

/** 같은 사람이 하루에 새 대화를 몇 개나 열었는지. */
export async function sessionsToday(db: D1Database, ipHash: string, today: string): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM chat_sessions WHERE ip_hash = ? AND substr(created_at,1,10) = ?')
    .bind(ipHash, today)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export function overSessionLimit(n: number): boolean {
  return n >= MAX_SESSIONS_PER_IP_DAY;
}

export async function createSession(
  db: D1Database,
  id: string,
  ipHash: string,
  now: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO chat_sessions (id, created_at, last_at, status, ip_hash)
       VALUES (?, ?, ?, 'bot', ?)`,
    )
    .bind(id, now, now, ipHash)
    .run();
}

export async function getSession(db: D1Database, id: string): Promise<{
  id: string; status: string; visitorName: string; visitorContact: string;
} | null> {
  const row = await db
    .prepare('SELECT id, status, visitor_name, visitor_contact FROM chat_sessions WHERE id = ?')
    .bind(id)
    .first<{ id: string; status: string; visitor_name: string; visitor_contact: string }>();
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    visitorName: row.visitor_name,
    visitorContact: row.visitor_contact,
  };
}

export async function countMessages(db: D1Database, sessionId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM chat_messages WHERE session_id = ?')
    .bind(sessionId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export function overMessageLimit(n: number): boolean {
  return n >= MAX_MESSAGES_PER_SESSION;
}

export async function addMessage(
  db: D1Database,
  sessionId: string,
  role: ChatRole,
  text: string,
  now: string,
): Promise<void> {
  await db
    .prepare('INSERT INTO chat_messages (session_id, role, text, created_at) VALUES (?, ?, ?, ?)')
    .bind(sessionId, role, text, now)
    .run();
  await db
    .prepare('UPDATE chat_sessions SET last_at = ? WHERE id = ?')
    .bind(now, sessionId)
    .run();
}

/** 방문자가 '상담사 연결'을 눌렀을 때. 연락처를 함께 받아 둔다. */
export async function requestStaff(
  db: D1Database,
  sessionId: string,
  name: string,
  contact: string,
  now: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE chat_sessions
         SET status = CASE WHEN status = 'live' THEN 'live' ELSE 'waiting' END,
             visitor_name = ?, visitor_contact = ?, last_at = ?
       WHERE id = ?`,
    )
    .bind(name, contact, now, sessionId)
    .run();
}

export async function setStatus(
  db: D1Database,
  sessionId: string,
  status: 'bot' | 'waiting' | 'live' | 'closed',
  now: string,
): Promise<void> {
  await db
    .prepare('UPDATE chat_sessions SET status = ?, last_at = ? WHERE id = ?')
    .bind(status, now, sessionId)
    .run();
}

/** 특정 id 이후의 메시지만. 폴링이 매번 전체를 받아오지 않게 한다. */
export async function messagesAfter(
  db: D1Database,
  sessionId: string,
  afterId: number,
): Promise<ChatMessage[]> {
  const { results } = await db
    .prepare(
      `SELECT id, role, text, created_at FROM chat_messages
        WHERE session_id = ? AND id > ? ORDER BY id LIMIT 100`,
    )
    .bind(sessionId, afterId)
    .all<{ id: number; role: string; text: string; created_at: string }>();
  return results.map((r) => ({
    id: r.id,
    role: (r.role === 'staff' ? 'staff' : r.role === 'bot' ? 'bot' : 'visitor') as ChatRole,
    text: r.text,
    createdAt: r.created_at,
  }));
}

/**
 * 상담 목록. 대기 중인 대화가 위로 오도록 정렬한다 — 직원이 화면을
 * 열었을 때 가장 급한 것이 먼저 보여야 한다.
 */
export async function listSessions(db: D1Database, limit = 50): Promise<ChatSessionRow[]> {
  const { results } = await db
    .prepare(
      `SELECT s.id, s.created_at, s.last_at, s.status, s.visitor_name, s.visitor_contact,
              s.last_read_by_staff,
              (SELECT COUNT(*) FROM chat_messages m
                WHERE m.session_id = s.id AND m.role = 'visitor'
                  AND m.id > s.last_read_by_staff) AS unread,
              (SELECT m2.text FROM chat_messages m2
                WHERE m2.session_id = s.id ORDER BY m2.id DESC LIMIT 1) AS last_text
         FROM chat_sessions s
        WHERE s.status != 'bot' OR EXISTS (
                SELECT 1 FROM chat_messages m3
                 WHERE m3.session_id = s.id AND m3.role = 'visitor')
        ORDER BY (s.status = 'waiting') DESC, s.last_at DESC
        LIMIT ?`,
    )
    .bind(limit)
    .all<{
      id: string; created_at: string; last_at: string; status: string;
      visitor_name: string; visitor_contact: string; last_read_by_staff: number;
      unread: number; last_text: string | null;
    }>();
  return results.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    lastAt: r.last_at,
    status: (['bot', 'waiting', 'live', 'closed'].includes(r.status) ? r.status : 'bot') as ChatSessionRow['status'],
    visitorName: r.visitor_name,
    visitorContact: r.visitor_contact,
    lastReadByStaff: r.last_read_by_staff,
    unread: r.unread ?? 0,
    lastText: r.last_text ?? '',
  }));
}

/** 직원이 대화를 열었을 때 그 시점까지 읽음 처리. */
export async function markRead(db: D1Database, sessionId: string): Promise<void> {
  await db
    .prepare(
      `UPDATE chat_sessions
          SET last_read_by_staff = COALESCE(
                (SELECT MAX(id) FROM chat_messages WHERE session_id = ?), 0)
        WHERE id = ?`,
    )
    .bind(sessionId, sessionId)
    .run();
}

/** 대시보드 배지용 — 대기 중 대화 수와 안 읽은 방문자 메시지 수. */
export async function waitingSummary(db: D1Database): Promise<{ waiting: number; unread: number }> {
  const w = await db
    .prepare("SELECT COUNT(*) AS n FROM chat_sessions WHERE status = 'waiting'")
    .first<{ n: number }>();
  const u = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM chat_messages m
         JOIN chat_sessions s ON s.id = m.session_id
        WHERE m.role = 'visitor' AND m.id > s.last_read_by_staff`,
    )
    .first<{ n: number }>();
  return { waiting: w?.n ?? 0, unread: u?.n ?? 0 };
}
