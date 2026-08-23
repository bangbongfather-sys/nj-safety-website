'use client';

/**
 * 계정 관리.
 *
 * 예전에는 직원을 한 명 추가하려면 터미널에서 해시를 만들어 Cloudflare
 * 시크릿에 다시 넣고 배포해야 했다. 그 일을 전부 이 화면으로 옮겼다.
 *
 * 처음 들어오면 계정이 하나도 없고, GitHub 토큰으로 로그인한 상태다.
 * 그래서 맨 위에 "첫 계정 만들기" 만 크게 띄우고 나머지는 숨긴다 —
 * 무엇부터 해야 하는지 화면이 스스로 말하게.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import {
  changePassword,
  createAccount,
  deleteAccount,
  fetchAccounts,
  fetchTokenStatus,
  saveGitHubToken,
  type AccountsView,
} from '@/lib/admin/accounts';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function AccountsPage() {
  const { state } = useAdmin();
  const token = state.status === 'authenticated' ? state.pat : '';

  const [view, setView] = useState<AccountsView | null>(null);
  const [tokenSaved, setTokenSaved] = useState<boolean | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token) return;
    const [accounts, tok] = await Promise.all([
      fetchAccounts(token),
      fetchTokenStatus(token),
    ]);
    if (accounts.ok) {
      setView(accounts.data);
      setLoadErr(null);
    } else {
      setLoadErr(accounts.error);
    }
    if (tok.ok) setTokenSaved(tok.data.saved);
  }, [token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!token) return null;

  const isOwner = view?.me.role === 'owner';
  const firstRun = view != null && view.users.length === 0;

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <span className="eyebrow">— Accounts</span>
        <h1>계정 관리</h1>
      </header>

      {loadErr ? <p className="admin-err">{loadErr}</p> : null}

      {firstRun ? (
        <FirstAccountCard token={token} onDone={reload} />
      ) : (
        <>
          {isOwner && tokenSaved === false ? (
            <TokenCard token={token} onDone={reload} urgent />
          ) : null}

          <MyAccountCard
            token={token}
            me={view?.me}
            onDone={reload}
          />

          {isOwner ? (
            <StaffCard token={token} view={view} onDone={reload} />
          ) : null}

          {isOwner && tokenSaved ? <TokenCard token={token} onDone={reload} /> : null}
        </>
      )}
    </div>
  );
}

/* ─── 첫 계정 ─────────────────────────────────────────────────────── */

function FirstAccountCard({ token, onDone }: { token: string; onDone: () => void }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) {
      setErr('두 비밀번호가 다릅니다.');
      return;
    }
    setErr(null);
    setBusy(true);
    const r = await createAccount(token, { id, password: pw, role: 'owner' });
    setBusy(false);
    if (!r.ok) setErr(r.error);
    else onDone();
  }

  return (
    <section className="admin-card">
      <h2>첫 계정 만들기</h2>
      <p className="admin-help">
        지금은 GitHub 토큰으로 들어와 계십니다. 여기서 아이디와 비밀번호를 정하면
        다음부터는 토큰 없이 그것으로 로그인하시면 됩니다. 이 계정이 <strong>대표 계정</strong>이
        되어 직원 계정을 추가하거나 지울 수 있습니다.
      </p>
      <form onSubmit={submit} className="admin-form">
        <div>
          <label htmlFor="fa-id">아이디</label>
          <input
            id="fa-id" type="text" value={id} disabled={busy}
            autoCapitalize="none" autoCorrect="off" spellCheck={false}
            onChange={(e) => setId(e.target.value)}
            placeholder="영문 소문자·숫자 (예: njsafety)"
          />
        </div>
        <div>
          <label htmlFor="fa-pw">비밀번호 (8자 이상)</label>
          <input id="fa-pw" type="password" value={pw} disabled={busy}
            autoComplete="new-password"
            onChange={(e) => setPw(e.target.value)} />
        </div>
        <div>
          <label htmlFor="fa-pw2">비밀번호 확인</label>
          <input id="fa-pw2" type="password" value={pw2} disabled={busy}
            autoComplete="new-password"
            onChange={(e) => setPw2(e.target.value)} />
        </div>
        <button className="btn primary" type="submit" disabled={busy || !id || !pw || !pw2}>
          {busy ? '만드는 중...' : '대표 계정 만들기'}
        </button>
      </form>
      {err ? <p className="admin-err">{err}</p> : null}
    </section>
  );
}

/* ─── 내 계정 ─────────────────────────────────────────────────────── */

function MyAccountCard({
  token, me, onDone,
}: {
  token: string;
  me: AccountsView['me'] | undefined;
  onDone: () => void;
}) {
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const viaToken = me?.mode === 'pat';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) {
      setErr('두 비밀번호가 다릅니다.');
      setMsg(null);
      return;
    }
    setErr(null);
    setMsg(null);
    setBusy(true);
    const r = await changePassword(token, { currentPassword: cur, password: pw });
    setBusy(false);
    if (!r.ok) setErr(r.error);
    else {
      setMsg('비밀번호를 바꿨습니다. 다음 로그인부터 새 비밀번호를 쓰세요.');
      setCur(''); setPw(''); setPw2('');
      onDone();
    }
  }

  return (
    <section className="admin-card">
      <h2>내 계정</h2>
      <div className="admin-kv-grid">
        <span className="k">아이디</span><span className="v"><code>{me?.id ?? '—'}</code></span>
        <span className="k">권한</span>
        <span className="v">{me?.role === 'owner' ? '대표 (직원 계정 관리 가능)' : '직원'}</span>
      </div>

      {viaToken ? (
        <p className="admin-help">
          지금은 GitHub 토큰으로 들어와 계십니다. 아이디·비밀번호로 로그인하시면
          여기서 비밀번호를 바꾸실 수 있습니다.
        </p>
      ) : (
        <>
          <h3 className="admin-subhead">비밀번호 변경</h3>
          <form onSubmit={submit} className="admin-form">
            <div>
              <label htmlFor="mp-cur">현재 비밀번호</label>
              <input id="mp-cur" type="password" value={cur} disabled={busy}
                autoComplete="current-password"
                onChange={(e) => setCur(e.target.value)} />
            </div>
            <div>
              <label htmlFor="mp-new">새 비밀번호 (8자 이상)</label>
              <input id="mp-new" type="password" value={pw} disabled={busy}
                autoComplete="new-password"
                onChange={(e) => setPw(e.target.value)} />
            </div>
            <div>
              <label htmlFor="mp-new2">새 비밀번호 확인</label>
              <input id="mp-new2" type="password" value={pw2} disabled={busy}
                autoComplete="new-password"
                onChange={(e) => setPw2(e.target.value)} />
            </div>
            <button className="btn primary" type="submit" disabled={busy || !cur || !pw || !pw2}>
              {busy ? '바꾸는 중...' : '비밀번호 변경'}
            </button>
          </form>
          {msg ? <p className="admin-meta admin-ok">{msg}</p> : null}
          {err ? <p className="admin-err">{err}</p> : null}
        </>
      )}
    </section>
  );
}

/* ─── 직원 계정 ───────────────────────────────────────────────────── */

function StaffCard({
  token, view, onDone,
}: {
  token: string;
  view: AccountsView | null;
  onDone: () => void;
}) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState('');

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    const r = await createAccount(token, { id, password: pw, displayName: name });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setMsg(`${id} 계정을 만들었습니다. 아이디와 비밀번호를 본인에게 알려주세요.`);
    setId(''); setName(''); setPw('');
    onDone();
  }

  async function remove(target: string) {
    if (!window.confirm(`${target} 계정을 지울까요? 그 즉시 로그인할 수 없게 됩니다.`)) return;
    setErr(null); setMsg(null);
    const r = await deleteAccount(token, target);
    if (!r.ok) setErr(r.error);
    else { setMsg(`${target} 계정을 지웠습니다.`); onDone(); }
  }

  async function reset(target: string) {
    setErr(null); setMsg(null);
    const r = await changePassword(token, { id: target, password: resetPw });
    if (!r.ok) { setErr(r.error); return; }
    setMsg(`${target} 의 비밀번호를 새로 정했습니다. 본인에게 알려주세요.`);
    setResetting(null); setResetPw('');
    onDone();
  }

  return (
    <section className="admin-card">
      <h2>직원 계정</h2>

      <div className="acct-list">
        {(view?.users ?? []).map((u) => (
          <div className="acct-row" key={u.id}>
            <div className="acct-main">
              <code className="acct-id">{u.id}</code>
              {u.displayName && u.displayName !== u.id ? (
                <span className="acct-name">{u.displayName}</span>
              ) : null}
              <span className={`acct-role${u.role === 'owner' ? ' is-owner' : ''}`}>
                {u.role === 'owner' ? '대표' : '직원'}
              </span>
            </div>
            <div className="acct-meta">최근 로그인 {fmtDate(u.lastLoginAt)}</div>
            <div className="acct-actions">
              <button type="button" className="btn"
                onClick={() => { setResetting(resetting === u.id ? null : u.id); setResetPw(''); }}>
                비밀번호 재설정
              </button>
              {u.id !== view?.me.id ? (
                <button type="button" className="btn" onClick={() => remove(u.id)}>삭제</button>
              ) : null}
            </div>
            {resetting === u.id ? (
              <div className="acct-reset">
                <label htmlFor={`rs-${u.id}`}>{u.id} 의 새 비밀번호 (8자 이상)</label>
                <div className="acct-reset-row">
                  <input id={`rs-${u.id}`} type="text" value={resetPw}
                    autoComplete="off"
                    placeholder="본인에게 알려줄 임시 비밀번호"
                    onChange={(e) => setResetPw(e.target.value)} />
                  <button type="button" className="btn primary"
                    disabled={resetPw.length < 8} onClick={() => reset(u.id)}>
                    설정
                  </button>
                </div>
                <p className="admin-help">
                  본인이 로그인한 뒤 &lsquo;내 계정&rsquo; 에서 직접 바꾸도록 안내해 주세요.
                </p>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <h3 className="admin-subhead">직원 추가</h3>
      <form onSubmit={add} className="admin-form">
        <div>
          <label htmlFor="st-id">아이디</label>
          <input id="st-id" type="text" value={id} disabled={busy}
            autoCapitalize="none" autoCorrect="off" spellCheck={false}
            placeholder="영문 소문자·숫자 (예: kimjw)"
            onChange={(e) => setId(e.target.value)} />
        </div>
        <div>
          <label htmlFor="st-name">이름 (선택)</label>
          <input id="st-name" type="text" value={name} disabled={busy}
            placeholder="김직원"
            onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="st-pw">임시 비밀번호 (8자 이상)</label>
          <input id="st-pw" type="text" value={pw} disabled={busy}
            autoComplete="off"
            placeholder="본인에게 알려줄 비밀번호"
            onChange={(e) => setPw(e.target.value)} />
        </div>
        <button className="btn primary" type="submit" disabled={busy || !id || pw.length < 8}>
          {busy ? '만드는 중...' : '직원 계정 만들기'}
        </button>
      </form>

      {msg ? <p className="admin-meta admin-ok">{msg}</p> : null}
      {err ? <p className="admin-err">{err}</p> : null}
    </section>
  );
}

/* ─── GitHub 토큰 ─────────────────────────────────────────────────── */

function TokenCard({
  token, onDone, urgent,
}: {
  token: string;
  onDone: () => void;
  urgent?: boolean;
}) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(Boolean(urgent));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    const r = await saveGitHubToken(token, value);
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setMsg('서버에 저장했습니다. 이제 아이디·비밀번호로 로그인해도 수정 내용이 저장됩니다.');
    setValue('');
    onDone();
  }

  return (
    <section className={`admin-card${urgent ? ' admin-card-urgent' : ''}`}>
      <h2>{urgent ? '⚠ 서버에 GitHub 토큰이 필요합니다' : '서버 GitHub 토큰'}</h2>
      {urgent ? (
        <p className="admin-help">
          아이디·비밀번호로 로그인하면 브라우저에는 GitHub 토큰이 없습니다. 그래서
          <strong> 서버가 대신 저장</strong>할 토큰이 한 번 필요합니다. 지금 쓰고 계신 토큰을
          아래에 붙여넣으면 그것으로 끝입니다 — 이후로는 어느 기기에서도 토큰을 넣을 일이 없습니다.
        </p>
      ) : (
        <p className="admin-help">
          서버에 토큰이 저장되어 있습니다. 토큰을 새로 발급했을 때만 여기서 교체하세요.
        </p>
      )}

      {!urgent && !open ? (
        <button type="button" className="btn" onClick={() => setOpen(true)}>토큰 교체</button>
      ) : (
        <form onSubmit={submit} className="admin-form">
          <div>
            <label htmlFor="gh-token">GITHUB 토큰</label>
            <input id="gh-token" type="password" value={value} disabled={busy}
              autoComplete="off"
              placeholder="ghp_xxxx 또는 github_pat_xxxx"
              onChange={(e) => setValue(e.target.value)} />
          </div>
          <button className="btn primary" type="submit" disabled={busy || !value}>
            {busy ? '확인 중...' : '서버에 저장'}
          </button>
        </form>
      )}

      {msg ? <p className="admin-meta admin-ok">{msg}</p> : null}
      {err ? <p className="admin-err">{err}</p> : null}
    </section>
  );
}
