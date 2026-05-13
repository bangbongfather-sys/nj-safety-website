'use client';

import { useState } from 'react';
import { useAdmin } from './AdminContext';

export default function PatLoginForm() {
  const { login, state } = useAdmin();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const r = await login(input);
    setBusy(false);
    if (!r.ok) setErr(r.error ?? '인증 실패');
    else setInput('');
  }

  return (
    <div className="admin-login-wrap">
      <div className="admin-login-card">
        <span className="eyebrow">— Admin · Sign in</span>
        <h1>관리자 인증</h1>
        <p className="admin-login-lead">
          NJ SAFETY 사이트를 편집하려면 GitHub Personal Access Token이 필요합니다.
          토큰은 본 기기 브라우저(localStorage)에만 저장되고, 외부로 전송되지 않습니다.
        </p>

        <form onSubmit={submit}>
          <label htmlFor="pat-input">PERSONAL ACCESS TOKEN</label>
          <input
            id="pat-input"
            type="password"
            placeholder="ghp_xxxxxxxxxxxx 또는 github_pat_xxxx"
            autoComplete="current-password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <button className="btn primary" type="submit" disabled={busy || !input}>
            {busy ? '확인 중...' : '인증하고 들어가기'}
          </button>
        </form>

        {err ? <p className="admin-err">{err}</p> : null}
        {state.status === 'verifying' ? <p className="admin-meta">저장된 토큰 검증 중...</p> : null}

        <details className="admin-login-help">
          <summary>토큰 발급 방법</summary>
          <ol>
            <li>
              <a
                href="https://github.com/settings/personal-access-tokens/new"
                target="_blank"
                rel="noreferrer"
              >
                github.com/settings/personal-access-tokens/new
              </a>{' '}
              접속
            </li>
            <li>
              <strong>Repository access</strong> → <em>Only select repositories</em> → <code>nj-safety-website</code> 체크
            </li>
            <li>
              <strong>Repository permissions</strong> → <em>Contents</em>: <code>Read and write</code>
            </li>
            <li>
              <strong>Generate token</strong> → 표시된 토큰 복사 → 위 입력란에 붙여넣기
            </li>
          </ol>
        </details>
      </div>
    </div>
  );
}
