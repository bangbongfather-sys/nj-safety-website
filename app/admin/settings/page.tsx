'use client';

import { useAdmin } from '@/components/admin/AdminContext';
import { REPO_OWNER, REPO_NAME, REPO_BRANCH } from '@/lib/admin/github';

export default function SettingsPage() {
  const { state, logout } = useAdmin();
  const login = state.status === 'authenticated' ? state.login : '';

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <span className="eyebrow">— Settings</span>
        <h1>설정</h1>
      </header>

      <section className="admin-card">
        <h2>GitHub 인증</h2>
        <div className="admin-kv-grid">
          <span className="k">로그인</span><span className="v"><code>{login || '—'}</code></span>
          <span className="k">저장소</span><span className="v"><code>{REPO_OWNER}/{REPO_NAME}</code></span>
          <span className="k">브랜치</span><span className="v"><code>{REPO_BRANCH}</code></span>
        </div>
        <p className="admin-help">
          토큰은 이 기기 브라우저(localStorage)에만 저장되어 있습니다. 다른 기기에서는 다시 입력해야 합니다.
          토큰이 노출되거나 분실되었다면 <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer">github.com/settings/tokens</a>에서 폐기 후 새로 발급하세요.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="button" className="btn ghost" onClick={logout}>
            로그아웃 (토큰 삭제)
          </button>
          <a
            href={`https://github.com/${REPO_OWNER}/${REPO_NAME}`}
            target="_blank"
            rel="noreferrer"
            className="btn ghost"
          >
            GitHub 저장소 ↗
          </a>
        </div>
      </section>

      <section className="admin-card">
        <h2>배포</h2>
        <div className="admin-kv-grid">
          <span className="k">호스팅</span><span className="v">Cloudflare Workers + Static Assets</span>
          <span className="k">URL</span><span className="v"><a href="https://nj-safety-website.njsafety91.workers.dev" target="_blank" rel="noreferrer">nj-safety-website.njsafety91.workers.dev</a></span>
          <span className="k">최종 도메인</span><span className="v">njfashion.co.kr (사이트 완성 후 가비아 배포 예정)</span>
        </div>
        <p className="admin-help">
          main 브랜치에 커밋이 푸시될 때마다 Cloudflare가 자동으로 빌드 + 재배포합니다 (~1~2분).
          빌드 상태는 <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer">Cloudflare 대시보드</a> → Workers &amp; Pages → nj-safety-website에서 확인.
        </p>
      </section>

      <section className="admin-card">
        <h2>곧 추가될 기능</h2>
        <ul className="admin-todo-list">
          <li>WYSIWYG 인라인 편집 — 실제 페이지에서 텍스트 클릭→바로 편집</li>
          <li>이미지 업로드 — admin에서 직접 이미지 업로드 (R2 또는 GitHub)</li>
          <li>PDF / 파일 업로드 — 카탈로그, 시험성적서 등</li>
          <li>고급: 변경사항 미리보기 (PR 기반 워크플로)</li>
        </ul>
      </section>
    </div>
  );
}
