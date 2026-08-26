/**
 * 방문자 통계 (D1).
 *
 * 외부 분석 서비스를 붙이지 않고 Worker 안에서 센다. 방문자에게
 * 추적 스크립트를 하나 더 물리지 않아도 되고, 숫자가 우리 D1 에만
 * 남는다.
 *
 * 남기는 것은 두 가지뿐이다.
 *   page_hits  날짜별 페이지뷰 합계 — 하루 한 줄.
 *   page_seen  날짜별 방문자 식별자 — 순 방문자를 세기 위한 것.
 *
 * IP 는 저장하지 않는다. 식별자는 (IP + 브라우저 + 날짜 + 소금)의
 * SHA-256 앞 16자리라서 날짜가 바뀌면 같은 사람도 다른 값이 되고,
 * 값만 봐서는 누구인지 되돌릴 수 없다.
 */

import type { D1Database } from './users';

/* 한국 기준 날짜로 묶는다. UTC 로 세면 오전 9시 이전 방문이 전날로
 * 잡혀서, 사장님이 보는 '오늘'과 표의 '오늘'이 어긋난다. */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function kstDay(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 순 방문자 식별자를 며칠까지 들고 있을지. page_hits(하루 한 줄)는
 *  계속 남기고, 줄 수가 방문자 수만큼 늘어나는 이쪽만 정리한다. */
const SEEN_RETENTION_DAYS = 400;

const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS page_hits (
    day   TEXT PRIMARY KEY,
    views INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS page_seen (
    day TEXT NOT NULL,
    vid TEXT NOT NULL,
    PRIMARY KEY (day, vid)
  )`,
];

let schemaReady = false;

export async function ensureAnalyticsSchema(db: D1Database): Promise<void> {
  if (schemaReady) return;
  for (const sql of SCHEMA_SQL) await db.prepare(sql).run();
  schemaReady = true;
}

/* 사람이 아닌 접속. 검색엔진 크롤러와 모니터링 봇을 걸러내지 않으면
 * 표의 숫자가 실제 방문과 무관해진다. */
const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|whatsapp|telegram|headless|phantom|puppeteer|playwright|selenium|python-requests|python-urllib|curl\/|wget|go-http-client|java\/|okhttp|axios\/|node-fetch|monitor|uptime|pingdom|lighthouse|gtmetrix|ahrefs|semrush|mj12|dotbot|petalbot|yandex|baiduspider|daum|naverbot|yeti/i;

export function isBot(ua: string): boolean {
  if (!ua) return true; // UA 없는 요청은 사람으로 보지 않는다
  return BOT_RE.test(ua);
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function visitorId(ip: string, ua: string, day: string, salt: string): Promise<string> {
  return (await sha256Hex(`${ip}|${ua}|${day}|${salt}`)).slice(0, 16);
}

/** 방문 한 건 기록. 페이지뷰는 무조건 +1, 순 방문자는 그날 처음일 때만. */
export async function recordView(db: D1Database, day: string, vid: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO page_hits (day, views) VALUES (?, 1)
       ON CONFLICT(day) DO UPDATE SET views = views + 1`,
    )
    .bind(day)
    .run();
  await db
    .prepare('INSERT OR IGNORE INTO page_seen (day, vid) VALUES (?, ?)')
    .bind(day, vid)
    .run();
}

/** 오래된 식별자 정리. 매 요청 돌릴 일은 아니라 호출 쪽에서 가끔만 부른다. */
export async function pruneSeen(db: D1Database, today: string): Promise<void> {
  const cutoff = new Date(new Date(`${today}T00:00:00Z`).getTime() - SEEN_RETENTION_DAYS * 86400000)
    .toISOString()
    .slice(0, 10);
  await db.prepare('DELETE FROM page_seen WHERE day < ?').bind(cutoff).run();
}

export type DailyRow = { day: string; views: number; visitors: number };
export type MonthlyRow = { month: string; views: number; visitors: number };

/**
 * 최근 N일. 방문이 하나도 없던 날은 표에 줄이 없으므로, 빈 날을 0으로
 * 채워서 돌려준다 — 그래야 차트의 가로축이 날짜만큼 고르게 벌어진다.
 */
export async function dailyStats(db: D1Database, days: number, today: string): Promise<DailyRow[]> {
  const startMs = new Date(`${today}T00:00:00Z`).getTime() - (days - 1) * 86400000;
  const start = new Date(startMs).toISOString().slice(0, 10);

  const { results: hits } = await db
    .prepare('SELECT day, views FROM page_hits WHERE day >= ? ORDER BY day')
    .bind(start)
    .all<{ day: string; views: number }>();
  const { results: seen } = await db
    .prepare('SELECT day, COUNT(*) AS visitors FROM page_seen WHERE day >= ? GROUP BY day')
    .bind(start)
    .all<{ day: string; visitors: number }>();

  const viewsBy = new Map(hits.map((r) => [r.day, r.views]));
  const visitorsBy = new Map(seen.map((r) => [r.day, r.visitors]));

  const out: DailyRow[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startMs + i * 86400000).toISOString().slice(0, 10);
    out.push({ day: d, views: viewsBy.get(d) ?? 0, visitors: visitorsBy.get(d) ?? 0 });
  }
  return out;
}

/**
 * 월별. 순 방문자는 같은 사람이 그 달에 여러 날 왔어도 한 명으로 센다
 * (COUNT DISTINCT) — 일별 숫자를 그냥 더한 값과는 다르고, 이쪽이 맞다.
 */
export async function monthlyStats(db: D1Database, months: number): Promise<MonthlyRow[]> {
  const { results: hits } = await db
    .prepare(
      `SELECT substr(day, 1, 7) AS month, SUM(views) AS views
       FROM page_hits GROUP BY month ORDER BY month DESC LIMIT ?`,
    )
    .bind(months)
    .all<{ month: string; views: number }>();
  const { results: seen } = await db
    .prepare(
      `SELECT substr(day, 1, 7) AS month, COUNT(DISTINCT vid) AS visitors
       FROM page_seen GROUP BY month ORDER BY month DESC LIMIT ?`,
    )
    .bind(months)
    .all<{ month: string; visitors: number }>();

  const visitorsBy = new Map(seen.map((r) => [r.month, r.visitors]));
  return hits
    .map((r) => ({ month: r.month, views: r.views, visitors: visitorsBy.get(r.month) ?? 0 }))
    .reverse();
}

/** 요약 숫자 — 화면 맨 위 카드에 쓴다. */
export async function summary(db: D1Database, today: string): Promise<{
  todayViews: number; todayVisitors: number;
  monthViews: number; monthVisitors: number;
  totalViews: number;
}> {
  const month = today.slice(0, 7);
  const t = await db
    .prepare('SELECT views FROM page_hits WHERE day = ?')
    .bind(today)
    .first<{ views: number }>();
  const tv = await db
    .prepare('SELECT COUNT(*) AS n FROM page_seen WHERE day = ?')
    .bind(today)
    .first<{ n: number }>();
  const m = await db
    .prepare("SELECT SUM(views) AS n FROM page_hits WHERE substr(day,1,7) = ?")
    .bind(month)
    .first<{ n: number | null }>();
  const mv = await db
    .prepare("SELECT COUNT(DISTINCT vid) AS n FROM page_seen WHERE substr(day,1,7) = ?")
    .bind(month)
    .first<{ n: number }>();
  const all = await db.prepare('SELECT SUM(views) AS n FROM page_hits').first<{ n: number | null }>();

  return {
    todayViews: t?.views ?? 0,
    todayVisitors: tv?.n ?? 0,
    monthViews: m?.n ?? 0,
    monthVisitors: mv?.n ?? 0,
    totalViews: all?.n ?? 0,
  };
}
