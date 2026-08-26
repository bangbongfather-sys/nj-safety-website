'use client';

/**
 * 방문자 통계.
 *
 * 숫자는 Worker 가 D1 에 쌓아 둔 것을 그대로 받아 온다(`/api/admin/stats`).
 * 차트는 라이브러리 없이 인라인 SVG 로 그린다 — 이 화면 하나 때문에
 * 차트 라이브러리를 번들에 넣을 이유가 없고, 막대와 선 두 가지면
 * 일별·월별 추이를 보는 데 충분하다.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';

type DailyRow = { day: string; views: number; visitors: number };
type MonthlyRow = { month: string; views: number; visitors: number };
type Summary = {
  todayViews: number; todayVisitors: number;
  monthViews: number; monthVisitors: number;
  totalViews: number;
};
type Payload = {
  ok?: boolean; error?: string; today?: string;
  summary?: Summary; daily?: DailyRow[]; monthly?: MonthlyRow[];
};

type Tab = 'daily' | 'monthly';

const RANGES = [
  { days: 14, label: '최근 14일' },
  { days: 30, label: '최근 30일' },
  { days: 90, label: '최근 90일' },
];

const fmt = (n: number) => n.toLocaleString('ko-KR');

/** '2026-08-23' → '8.23 (토)' — 표와 축에 쓰는 짧은 형태. */
function dayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00+09:00`);
  const wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getMonth() + 1}.${d.getDate()} (${wd})`;
}
function monthLabel(iso: string): string {
  const [y, m] = iso.split('-');
  return `${y}년 ${Number(m)}월`;
}

export default function AnalyticsPage() {
  const { state } = useAdmin();
  const pat = state.status === 'authenticated' ? state.pat : '';

  const [tab, setTab] = useState<Tab>('daily');
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!pat) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/admin/stats?days=${days}&months=12`, {
        headers: { Authorization: `token ${pat}` },
      });
      const p = (await r.json().catch(() => ({}))) as Payload;
      if (!r.ok || !p.ok) throw new Error(p.error || `요청 실패 (${r.status})`);
      setData(p);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [pat, days]);

  useEffect(() => { void load(); }, [load]);

  const daily = data?.daily ?? [];
  const monthly = data?.monthly ?? [];
  const s = data?.summary;

  // 표는 최근 것이 위로 오는 게 보기 편하다. 차트는 시간순 그대로.
  const dailyDesc = useMemo(() => [...daily].reverse(), [daily]);
  const monthlyDesc = useMemo(() => [...monthly].reverse(), [monthly]);

  const hasAny = (s?.totalViews ?? 0) > 0;

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <span className="eyebrow">— Analytics</span>
        <h1>방문자 통계</h1>
      </header>

      {err ? <div className="admin-error">불러오지 못했습니다 — {err}</div> : null}

      <section className="admin-card">
        <h2>요약</h2>
        <div className="stat-cards">
          <StatCard label="오늘 방문자" value={s?.todayVisitors} sub={`페이지뷰 ${fmt(s?.todayViews ?? 0)}`} accent />
          <StatCard label="이번 달 방문자" value={s?.monthVisitors} sub={`페이지뷰 ${fmt(s?.monthViews ?? 0)}`} />
          <StatCard label="전체 페이지뷰" value={s?.totalViews} sub="집계 시작 이후 누적" />
        </div>
        <p className="admin-help">
          <strong>방문자</strong>는 같은 사람이 하루에 여러 번 들어와도 1로 세고,
          <strong> 페이지뷰</strong>는 페이지를 열 때마다 셉니다. 검색엔진 크롤러와
          관리자 페이지 접속은 빼고 계산합니다. 날짜는 한국 시간 기준입니다.
        </p>
      </section>

      <section className="admin-card">
        <div className="stat-head">
          <h2>추이</h2>
          <div className="stat-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'daily'}
              className={tab === 'daily' ? 'on' : ''} onClick={() => setTab('daily')}>일별</button>
            <button type="button" role="tab" aria-selected={tab === 'monthly'}
              className={tab === 'monthly' ? 'on' : ''} onClick={() => setTab('monthly')}>월별</button>
          </div>
        </div>

        {tab === 'daily' ? (
          <div className="stat-ranges">
            {RANGES.map((r) => (
              <button key={r.days} type="button"
                className={`btn small${days === r.days ? ' primary' : ' ghost'}`}
                onClick={() => setDays(r.days)}>{r.label}</button>
            ))}
            <button type="button" className="btn small ghost" onClick={() => void load()} disabled={loading}>
              {loading ? '불러오는 중...' : '새로고침'}
            </button>
          </div>
        ) : null}

        {!hasAny && !loading ? (
          <p className="admin-help" style={{ marginTop: 16 }}>
            아직 기록된 방문이 없습니다. 이 기능을 켠 시점부터 쌓이기 시작하며,
            사이트에 방문이 있으면 다음 날부터 그래프가 채워집니다.
          </p>
        ) : (
          <>
            <Chart
              rows={tab === 'daily'
                ? daily.map((d) => ({ key: d.day, label: dayLabel(d.day), views: d.views, visitors: d.visitors }))
                : monthly.map((m) => ({ key: m.month, label: monthLabel(m.month), views: m.views, visitors: m.visitors }))}
            />
            <StatTable
              unit={tab === 'daily' ? '날짜' : '월'}
              rows={tab === 'daily'
                ? dailyDesc.map((d) => ({ key: d.day, label: dayLabel(d.day), views: d.views, visitors: d.visitors }))
                : monthlyDesc.map((m) => ({ key: m.month, label: monthLabel(m.month), views: m.views, visitors: m.visitors }))}
            />
          </>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: {
  label: string; value?: number; sub?: string; accent?: boolean;
}) {
  return (
    <div className={`stat-card${accent ? ' is-accent' : ''}`}>
      <span className="stat-card-l">{label}</span>
      <span className="stat-card-v">{value == null ? '—' : fmt(value)}</span>
      {sub ? <span className="stat-card-s">{sub}</span> : null}
    </div>
  );
}

type Row = { key: string; label: string; views: number; visitors: number };

/**
 * 막대(페이지뷰) 위에 선(방문자)을 얹은 그래프.
 *
 * viewBox 로만 그리고 CSS 로 폭을 100% 주기 때문에 화면이 좁아져도
 * 축이 깨지지 않는다. 가로축 글자는 칸이 좁으면 겹치므로, 개수에 따라
 * 몇 개 건너뛰며 찍는다.
 */
function Chart({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return null;

  const W = 900, H = 260, PAD_L = 44, PAD_R = 12, PAD_T = 16, PAD_B = 34;
  const iw = W - PAD_L - PAD_R;
  const ih = H - PAD_T - PAD_B;
  const max = Math.max(1, ...rows.map((r) => Math.max(r.views, r.visitors)));
  // 눈금은 4칸으로 나누되, 값이 작을 때 소수가 나오지 않도록 올림한다.
  const step = Math.max(1, Math.ceil(max / 4));
  const top = step * 4;

  const bw = iw / rows.length;
  const x = (i: number) => PAD_L + bw * i;
  const y = (v: number) => PAD_T + ih - (v / top) * ih;

  const labelEvery = Math.ceil(rows.length / 12);
  const line = rows.map((r, i) => `${x(i) + bw / 2},${y(r.visitors)}`).join(' ');

  return (
    <div className="stat-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`방문 추이 그래프 — ${rows.length}개 구간`}>
        {[0, 1, 2, 3, 4].map((k) => {
          const v = step * k;
          return (
            <g key={k}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)} className="stat-grid" />
              <text x={PAD_L - 8} y={y(v) + 4} textAnchor="end" className="stat-axis">{fmt(v)}</text>
            </g>
          );
        })}

        {rows.map((r, i) => {
          const h = Math.max(0, y(0) - y(r.views));
          return (
            <rect key={r.key} className="stat-bar"
              x={x(i) + bw * 0.22} width={Math.max(1, bw * 0.56)}
              y={y(r.views)} height={h} rx={2}>
              <title>{`${r.label} · 방문자 ${fmt(r.visitors)} · 페이지뷰 ${fmt(r.views)}`}</title>
            </rect>
          );
        })}

        <polyline className="stat-line" points={line} />
        {rows.map((r, i) => (
          <circle key={r.key} className="stat-dot" cx={x(i) + bw / 2} cy={y(r.visitors)} r={2.4}>
            <title>{`${r.label} · 방문자 ${fmt(r.visitors)}`}</title>
          </circle>
        ))}

        {rows.map((r, i) =>
          i % labelEvery === 0 ? (
            <text key={r.key} className="stat-axis" x={x(i) + bw / 2} y={H - 12} textAnchor="middle">
              {r.label.replace(/\s*\(.\)$/, '')}
            </text>
          ) : null,
        )}
      </svg>
      <div className="stat-legend">
        <span><i className="sw-bar" /> 페이지뷰</span>
        <span><i className="sw-line" /> 방문자</span>
      </div>
    </div>
  );
}

function StatTable({ rows, unit }: { rows: Row[]; unit: string }) {
  const totalViews = rows.reduce((a, r) => a + r.views, 0);
  const totalVisitors = rows.reduce((a, r) => a + r.visitors, 0);
  return (
    <div className="stat-table-wrap">
      <table className="stat-table">
        <thead>
          <tr><th>{unit}</th><th>방문자</th><th>페이지뷰</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>{r.label}</td>
              <td>{fmt(r.visitors)}</td>
              <td>{fmt(r.views)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>합계</td>
            <td>{fmt(totalVisitors)}</td>
            <td>{fmt(totalViews)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="admin-help">
        월별 방문자는 그 달에 여러 날 방문한 사람을 한 명으로 세므로,
        일별 숫자를 더한 값보다 작을 수 있습니다.
      </p>
    </div>
  );
}
