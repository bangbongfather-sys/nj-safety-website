'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { ghListDir, REPO_OWNER, REPO_NAME, REPO_BRANCH } from '@/lib/admin/github';

const SITE_PREVIEW_BASE = 'https://nj-safety-website.njsafety91.workers.dev';

type Counts = { products: number | null; lastCommitSha: string | null; lastCommitDate: string | null; lastCommitMessage: string | null };

async function fetchLastCommit(pat: string): Promise<{ sha: string; date: string; message: string } | null> {
  try {
    const r = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?sha=${REPO_BRANCH}&per_page=1`,
      { headers: { Authorization: `token ${pat}`, Accept: 'application/vnd.github+json' } },
    );
    if (!r.ok) return null;
    const data = await r.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const c = data[0];
    return {
      sha: c.sha,
      date: c.commit?.author?.date ?? '',
      message: (c.commit?.message ?? '').split('\n')[0],
    };
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const { state } = useAdmin();
  const pat = state.status === 'authenticated' ? state.pat : '';
  const [counts, setCounts] = useState<Counts>({ products: null, lastCommitSha: null, lastCommitDate: null, lastCommitMessage: null });

  useEffect(() => {
    if (!pat) return;
    let cancelled = false;
    (async () => {
      try {
        const [files, lastCommit] = await Promise.all([
          ghListDir(pat, 'data/products'),
          fetchLastCommit(pat),
        ]);
        if (cancelled) return;
        setCounts({
          products: files.filter((p) => p.endsWith('.json')).length,
          lastCommitSha: lastCommit?.sha ?? null,
          lastCommitDate: lastCommit?.date ?? null,
          lastCommitMessage: lastCommit?.message ?? null,
        });
      } catch {
        // ignore — leave counts as null
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pat]);

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <span className="eyebrow">— Dashboard</span>
        <h1>
          NJ SAFETY <em>관리자</em>
        </h1>
        <p>
          사이트 텍스트 수정, 제품 추가 / 관리, 설정을 여기서 처리합니다. 변경사항은 GitHub에 커밋되고,
          ~1~2분 뒤 Cloudflare가 자동 재배포합니다.
        </p>
      </header>

      <section className="admin-stat-grid">
        <div className="admin-stat">
          <span className="admin-stat-label">등록된 제품</span>
          <span className="admin-stat-value">{counts.products ?? '—'}</span>
          <Link href="/admin/products" className="admin-stat-cta">제품 관리 →</Link>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-label">사이트 텍스트</span>
          <span className="admin-stat-value">ko/en</span>
          <Link href="/admin/text" className="admin-stat-cta">텍스트 편집 →</Link>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-label">최근 배포</span>
          <span className="admin-stat-value admin-stat-value-small">
            {counts.lastCommitSha ? counts.lastCommitSha.slice(0, 7) : '—'}
          </span>
          {counts.lastCommitDate ? (
            <span className="admin-stat-sub">
              {new Date(counts.lastCommitDate).toLocaleString('ko-KR')}
            </span>
          ) : null}
        </div>
      </section>

      {counts.lastCommitMessage ? (
        <section className="admin-section">
          <h2>최근 변경</h2>
          <div className="admin-card admin-card-flat">
            <span className="admin-meta">
              <span className="k">commit</span>
              <span className="v">
                <code>{counts.lastCommitSha?.slice(0, 7)}</code>
              </span>
            </span>
            <p style={{ marginTop: 8, fontSize: 14, color: 'var(--text)' }}>{counts.lastCommitMessage}</p>
            <a
              href={`https://github.com/${REPO_OWNER}/${REPO_NAME}/commit/${counts.lastCommitSha}`}
              target="_blank"
              rel="noreferrer"
              className="admin-link"
              style={{ marginTop: 8, display: 'inline-block' }}
            >
              GitHub에서 보기 ↗
            </a>
          </div>
        </section>
      ) : null}

      <section className="admin-section">
        <h2>빠른 작업</h2>
        <div className="admin-action-grid">
          <Link href="/admin/edit" className="admin-action admin-action-feature">
            <span className="admin-action-icon">✎</span>
            <strong>인라인 편집 (WYSIWYG)</strong>
            <span className="admin-action-sub">실제 사이트 화면에서 텍스트 클릭 → 바로 편집</span>
          </Link>
          <Link href="/admin/text" className="admin-action">
            <span className="admin-action-icon">A</span>
            <strong>텍스트 편집 (폼 방식)</strong>
            <span className="admin-action-sub">홈페이지 / 푸터 / 회사 정보 — 폼으로 KO/EN 동시 편집</span>
          </Link>
          <Link href="/admin/products" className="admin-action">
            <span className="admin-action-icon">P</span>
            <strong>제품 목록 관리</strong>
            <span className="admin-action-sub">등록된 제품 확인 / 삭제 / 새 제품 추가</span>
          </Link>
          <Link href="/admin/products/upload" className="admin-action">
            <span className="admin-action-icon">+</span>
            <strong>새 제품 JSON 업로드</strong>
            <span className="admin-action-sub">catalog-app에서 export한 JSON 드래그&드롭</span>
          </Link>
          <Link href="/admin/notices" className="admin-action">
            <span className="admin-action-icon">N</span>
            <strong>공지사항 관리</strong>
            <span className="admin-action-sub">공지 / 제품 / 인증 / 행사 글 추가·수정·삭제</span>
          </Link>
          <a href={`${SITE_PREVIEW_BASE}/ko/`} target="_blank" rel="noreferrer" className="admin-action">
            <span className="admin-action-icon">↗</span>
            <strong>실제 사이트 보기</strong>
            <span className="admin-action-sub">새 탭에서 라이브 사이트 열기</span>
          </a>
        </div>
      </section>
    </div>
  );
}
