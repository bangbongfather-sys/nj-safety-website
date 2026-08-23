'use client';

import { useState } from 'react';
import { useAdmin } from './AdminContext';

/**
 * 관리자 로그인.
 *
 * 기본은 아이디·비밀번호다. GitHub 토큰은 이제 서버(Worker)에만 있고
 * 브라우저로 내려오지 않는다 — 직원은 발급받을 것도, 붙여넣을 것도 없다.
 *
 * 아래 접힌 부분의 토큰 입력은 비상구로만 남겨 둔다. 아이디 로그인이
 * 아직 설정되지 않았거나(서버 시크릿 미설정) 세션 쪽에 문제가 생겼을 때
 * 관리자가 들어올 수 있는 유일한 길이라, 지우지 않는다.
 */
export default function PatLoginForm() {
  const { login, loginWithToken, state } = useAdmin();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const r = await login(id, pw);
    setBusy(false);
    if (!r.ok) setErr(r.error ?? '로그인 실패');
    else {
      setId('');
      setPw('');
    }
  }

  async function submitToken(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const r = await loginWithToken(token);
    setBusy(false);
    if (!r.ok) setErr(r.error ?? '인증 실패');
    else setToken('');
  }

  return (
    <div className="admin-login-wrap">
      <div className="admin-login-card">
        <span className="eyebrow">— Admin · Sign in</span>
        <h1>관리자 로그인</h1>
        <p className="admin-login-lead">
          회사에서 발급받은 아이디와 비밀번호를 입력하세요.
          로그인 상태는 이 기기에서 30일간 유지됩니다.
        </p>

        <form onSubmit={submit}>
          <label htmlFor="admin-id">아이디</label>
          <input
            id="admin-id"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={id}
            onChange={(e) => setId(e.target.value)}
            disabled={busy}
          />

          <label htmlFor="admin-pw">비밀번호</label>
          <input
            id="admin-pw"
            type="password"
            autoComplete="current-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            disabled={busy}
          />

          <button className="btn primary" type="submit" disabled={busy || !id || !pw}>
            {busy ? '확인 중...' : '로그인'}
          </button>
        </form>

        {err ? <p className="admin-err">{err}</p> : null}
        {state.status === 'verifying' ? <p className="admin-meta">인증 정보 확인 중...</p> : null}

        <details className="admin-login-help">
          <summary>비밀번호를 잊었거나 로그인이 안 될 때</summary>
          <p className="admin-meta" style={{ marginTop: 10 }}>
            비밀번호는 서버에도 저장되어 있지 않아 확인해 드릴 수 없고, 새로 발급해야 합니다.
            아래는 그동안 쓰던 GitHub 토큰으로 들어오는 비상 통로입니다.
          </p>
          <form onSubmit={submitToken} style={{ marginTop: 12 }}>
            <label htmlFor="pat-input">GITHUB 토큰 (비상용)</label>
            <input
              id="pat-input"
              type="password"
              placeholder="ghp_xxxx 또는 github_pat_xxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={busy}
            />
            <button className="btn" type="submit" disabled={busy || !token}>
              토큰으로 들어가기
            </button>
          </form>
        </details>
      </div>
    </div>
  );
}
