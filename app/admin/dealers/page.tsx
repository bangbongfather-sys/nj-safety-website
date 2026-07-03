'use client';

/**
 * Admin: 대리점 (Dealers) 관리
 *
 * Edits `data/dealers.json` — two parallel arrays:
 *   - `regions`: ordered region buckets. Rename + reorder + delete.
 *   - `dealers`: flat list. Add / edit / delete / reassign to a region.
 *
 * Same shape as /admin/products/categories: GitHub Contents API
 * round-trip, sticky save bar, manual save commits the whole file
 * in one PUT. The page mirrors the public /dealers grouping so the
 * operator can see exactly what visitors will see after publish.
 */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { ghGetFile, ghPutFile } from '@/lib/admin/github';

const FILE_PATH = 'data/dealers.json';

type Region = { id: string; ko: string; en: string };
type Dealer = {
  id: string;
  regionId: string;
  name: string;
  addr?: string;
  tel?: string;
  fax?: string;
  email?: string;
  hours?: string;
  manager?: string;
  note?: string;
  /** Online store link — becomes the "쇼핑몰 바로가기" chip on /dealers. */
  shopUrl?: string;
  /** Dealer homepage link — becomes the "사이트 바로가기" chip on /dealers. */
  siteUrl?: string;
  /** Optional pre-resolved coords; when absent the locator geocodes addr. */
  lat?: number;
  lng?: number;
};
type DealersFile = { regions: Region[]; dealers: Dealer[] };

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function DealersAdminPage() {
  const { state } = useAdmin();
  const pat = state.status === 'authenticated' ? state.pat : '';

  const [data, setData] = useState<DealersFile | null>(null);
  const [sha, setSha] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const reload = useCallback(async () => {
    if (!pat) return;
    setErr(null);
    setData(null);
    try {
      const f = await ghGetFile(pat, FILE_PATH);
      if (f) {
        const parsed = JSON.parse(f.content) as DealersFile;
        setData({
          regions: parsed.regions ?? [],
          dealers: parsed.dealers ?? [],
        });
        setSha(f.sha);
      } else {
        setData({ regions: [], dealers: [] });
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

  const mutate = useCallback((fn: (cur: DealersFile) => DealersFile) => {
    setData((cur) => (cur ? fn(cur) : cur));
    setDirty(true);
    setSavedAt(null);
  }, []);

  /* ── Region handlers ─────────────────────────────────────────── */
  const addRegion = () => {
    mutate((cur) => ({
      ...cur,
      regions: [
        ...cur.regions,
        { id: uid('region'), ko: '새 지역', en: 'New Region' },
      ],
    }));
  };
  const deleteRegion = (idx: number) => {
    const r = data?.regions[idx];
    if (!r) return;
    const inUse = (data?.dealers ?? []).filter((d) => d.regionId === r.id).length;
    if (inUse > 0) {
      window.alert(
        `이 지역에 등록된 대리점이 ${inUse}곳 있습니다. 먼저 대리점들을 다른 지역으로 옮기거나 삭제해주세요.`,
      );
      return;
    }
    if (!window.confirm(`"${r.ko}" 지역을 삭제할까요?`)) return;
    mutate((cur) => ({ ...cur, regions: cur.regions.filter((_, i) => i !== idx) }));
  };
  const moveRegion = (idx: number, dir: -1 | 1) => {
    mutate((cur) => {
      const next = [...cur.regions];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return cur;
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...cur, regions: next };
    });
  };
  const patchRegion = (idx: number, patch: Partial<Region>) => {
    mutate((cur) => ({
      ...cur,
      regions: cur.regions.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    }));
  };

  /* ── Dealer handlers ─────────────────────────────────────────── */
  const addDealer = (regionId?: string) => {
    const target = regionId ?? data?.regions[0]?.id;
    if (!target) {
      window.alert('먼저 지역을 한 개 이상 추가하세요.');
      return;
    }
    mutate((cur) => ({
      ...cur,
      dealers: [
        ...cur.dealers,
        { id: uid('dealer'), regionId: target, name: '새 대리점' },
      ],
    }));
  };
  const deleteDealer = (id: string) => {
    const d = data?.dealers.find((x) => x.id === id);
    if (!d) return;
    if (!window.confirm(`"${d.name}" 대리점을 삭제할까요?`)) return;
    mutate((cur) => ({ ...cur, dealers: cur.dealers.filter((x) => x.id !== id) }));
  };
  const patchDealer = (id: string, patch: Partial<Dealer>) => {
    mutate((cur) => ({
      ...cur,
      dealers: cur.dealers.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));
  };

  /* ── Save ────────────────────────────────────────────────────── */
  const handleSave = useCallback(async () => {
    if (!pat || !data) return;
    // Quick sanity check: every dealer must point at an existing region.
    const validIds = new Set(data.regions.map((r) => r.id));
    const bad = data.dealers.find((d) => !validIds.has(d.regionId));
    if (bad) {
      setErr(`"${bad.name}" 대리점이 존재하지 않는 지역을 가리킵니다.`);
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const text = JSON.stringify(data, null, 2) + '\n';
      const r = await ghPutFile(
        pat,
        FILE_PATH,
        text,
        `chore(dealers): update directory (${data.dealers.length} dealers, ${data.regions.length} regions)`,
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
  }, [pat, data, sha]);

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <span className="eyebrow">— Dealers</span>
        <h1>공식 <em>대리점 관리</em></h1>
        <p>
          공개 <code>/dealers</code> 지도 로케이터에 노출되는 지역 + 대리점을 관리합니다.
          <strong>주소</strong>만 입력하면 지도에 핀이 자동 생성되고(카카오 지오코딩),
          <strong>쇼핑몰 URL</strong>을 넣으면 카드에 &ldquo;쇼핑몰 바로가기&rdquo; 링크가 붙습니다.
          저장하면 GitHub 에 커밋되고 1~2분 뒤 반영됩니다.
        </p>
        <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn primary" onClick={() => addDealer()}>
            + 새 대리점
          </button>
          <button type="button" className="btn ghost" onClick={addRegion}>
            + 새 지역
          </button>
          <a
            href="/ko/dealers/"
            target="_blank"
            rel="noreferrer"
            className="btn ghost"
          >
            공개 페이지 ↗
          </a>
          <button type="button" className="btn ghost" onClick={() => void reload()}>
            새로고침
          </button>
        </div>
      </header>

      {err ? <p className="admin-err">에러: {err}</p> : null}

      {data === null ? (
        <p className="admin-meta">로딩 중...</p>
      ) : (
        <div style={{ display: 'grid', gap: 32 }}>
          {/* Region list — compact controls so the operator can rename
              + reorder in place without leaving the page. */}
          <section className="admin-card admin-card-flat" style={{ padding: 20 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>
              지역 ({data.regions.length})
            </h2>
            {data.regions.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
                등록된 지역이 없습니다. 위 <strong>+ 새 지역</strong> 버튼으로 시작하세요.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {data.regions.map((region, idx) => {
                  const count = data.dealers.filter((d) => d.regionId === region.id).length;
                  return (
                    <div
                      key={region.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '24px 1fr 1fr 96px auto',
                        gap: 10,
                        alignItems: 'center',
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,.03)',
                        border: '1px solid var(--border-soft)',
                        borderRadius: 8,
                      }}
                    >
                      <span style={{ color: 'var(--muted)', fontSize: 12, fontFamily: 'var(--mono, ui-monospace, monospace)' }}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <input
                        type="text"
                        value={region.ko}
                        onChange={(e) => patchRegion(idx, { ko: e.target.value })}
                        placeholder="한국어"
                        style={inputStyle}
                      />
                      <input
                        type="text"
                        value={region.en}
                        onChange={(e) => patchRegion(idx, { en: e.target.value })}
                        placeholder="English"
                        style={inputStyle}
                      />
                      <span style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'right' }}>
                        {count}곳
                      </span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          className="btn ghost small"
                          disabled={idx === 0}
                          onClick={() => moveRegion(idx, -1)}
                          title="위로"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn ghost small"
                          disabled={idx === data.regions.length - 1}
                          onClick={() => moveRegion(idx, 1)}
                          title="아래로"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="btn danger small"
                          onClick={() => deleteRegion(idx)}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Dealers — grouped by region so editing feels like the
              public layout. Each card edits in place. */}
          <section>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>
              대리점 ({data.dealers.length})
            </h2>
            {data.regions.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                먼저 지역을 한 개 이상 추가하세요.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 28 }}>
                {data.regions.map((region) => {
                  const dealers = data.dealers.filter((d) => d.regionId === region.id);
                  return (
                    <div key={region.id}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: 12,
                          marginBottom: 10,
                          flexWrap: 'wrap',
                        }}
                      >
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                          {region.ko} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {region.en}</span>
                        </h3>
                        <button
                          type="button"
                          className="btn ghost small"
                          onClick={() => addDealer(region.id)}
                        >
                          + 이 지역에 추가
                        </button>
                      </div>
                      {dealers.length === 0 ? (
                        <p style={{ color: 'var(--muted)', fontSize: 12, margin: '8px 0 0' }}>
                          등록된 대리점이 없습니다.
                        </p>
                      ) : (
                        <div style={{ display: 'grid', gap: 12 }}>
                          {dealers.map((d) => (
                            <DealerEditor
                              key={d.id}
                              dealer={d}
                              regions={data.regions}
                              onPatch={(patch) => patchDealer(d.id, patch)}
                              onDelete={() => deleteDealer(d.id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Sticky save bar */}
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: 'rgba(255,255,255,.04)',
  border: '1px solid var(--border-soft)',
  borderRadius: 6,
  color: 'var(--text)',
  fontSize: 13,
};

function DealerEditor({
  dealer,
  regions,
  onPatch,
  onDelete,
}: {
  dealer: Dealer;
  regions: Region[];
  onPatch: (patch: Partial<Dealer>) => void;
  onDelete: () => void;
}) {
  return (
    <div
      style={{
        padding: 16,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid var(--border-soft)',
        borderRadius: 10,
        display: 'grid',
        gap: 10,
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 10, alignItems: 'center' }}>
        <input
          type="text"
          value={dealer.name}
          onChange={(e) => onPatch({ name: e.target.value })}
          placeholder="대리점 상호"
          style={{ ...inputStyle, fontWeight: 700, fontSize: 14 }}
        />
        <select
          value={dealer.regionId}
          onChange={(e) => onPatch({ regionId: e.target.value })}
          style={inputStyle}
        >
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.ko}
            </option>
          ))}
        </select>
        <button type="button" className="btn danger small" onClick={onDelete}>
          삭제
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
        <Field label="주소 (지도 핀 자동 생성)" value={dealer.addr ?? ''} onChange={(v) => onPatch({ addr: v })} />
        <Field label="전화" value={dealer.tel ?? ''} onChange={(v) => onPatch({ tel: v })} />
        <Field label="쇼핑몰 URL (선택)" value={dealer.shopUrl ?? ''} onChange={(v) => onPatch({ shopUrl: v })} />
        <Field label="사이트 URL (선택)" value={dealer.siteUrl ?? ''} onChange={(v) => onPatch({ siteUrl: v })} />
        <Field label="팩스" value={dealer.fax ?? ''} onChange={(v) => onPatch({ fax: v })} />
        <Field label="이메일" value={dealer.email ?? ''} onChange={(v) => onPatch({ email: v })} />
        <Field label="영업시간" value={dealer.hours ?? ''} onChange={(v) => onPatch({ hours: v })} />
        <Field label="담당자" value={dealer.manager ?? ''} onChange={(v) => onPatch({ manager: v })} />
      </div>
      <Field
        label="비고 (선택)"
        value={dealer.note ?? ''}
        onChange={(v) => onPatch({ note: v })}
        multiline
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 11, color: 'var(--muted-2)', marginBottom: 4, letterSpacing: '.04em', textTransform: 'uppercase' }}>
        {label}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
        />
      )}
    </label>
  );
}
