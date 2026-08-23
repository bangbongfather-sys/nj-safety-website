'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AdminProvider, useAdmin } from './AdminContext';
import PatLoginForm from './PatLoginForm';
import Sidebar from './Sidebar';
import OfflineBar from './OfflineBar';
import SwRegistrar from './SwRegistrar';

/**
 * 관리자 화면 구조 (2026-08 개편):
 *
 *   /admin (홈)         타일 런처 — 사이드바 없이 전체 화면. 처음 온
 *                       직원이 "무엇을 하시겠어요?" 타일만 보고 시작한다.
 *   그 외 작업 화면      왼쪽 메뉴 + 본문. 메뉴 맨 위 "홈"으로 언제든
 *                       런처로 돌아간다.
 *   WYSIWYG 편집기       사이트 페이지를 그대로 띄워 놓고 고치는 화면.
 *                       관리자 크롬도, 밝은 테마도 씌우지 않는다 —
 *                       미리보기가 실제 사이트(어두운 테마)와 달라
 *                       보이면 편집기의 의미가 없다.
 *
 * `.admin-light` 는 관리자 크롬 전용 밝은 테마 스코프다. 이 래퍼 안에서
 * 사이트 CSS 변수(--bg, --card, --text …)를 밝은 값으로 재정의하므로,
 * 사이트 컴포넌트를 품는 전체 화면 편집기에는 절대 씌우면 안 된다.
 */

/** 홈의 "이어서 하기" 칩이 가리킬 수 있는 작업 화면들. */
const RESUMABLE: { prefix: string; label: string }[] = [
  { prefix: '/admin/notices', label: '공지사항 관리' },
  { prefix: '/admin/products', label: '제품 관리' },
  { prefix: '/admin/resources', label: '자료실' },
  { prefix: '/admin/dealers', label: '대리점·거래처' },
  { prefix: '/admin/inquiries', label: '문의 접수함' },
  { prefix: '/admin/text', label: '텍스트 편집' },
  { prefix: '/admin/edit', label: '메인 페이지 편집' },
  { prefix: '/admin/about/edit', label: '회사소개 편집' },
  { prefix: '/admin/contact/edit', label: '문의 페이지 편집' },
  { prefix: '/admin/products-page/edit', label: '제품 라인업 페이지' },
];

export const RESUME_KEY = 'nj_admin_last_work';

function Gate({ children }: { children: ReactNode }) {
  const { state } = useAdmin();
  const pathname = usePathname() ?? '';
  const isFullBleed =
    pathname.startsWith('/admin/edit') ||
    pathname.startsWith('/admin/about/edit') ||
    pathname.startsWith('/admin/contact/edit') ||
    pathname.startsWith('/admin/products-page/edit') ||
    /^\/admin\/products\/[^/]+\/edit\/?$/.test(pathname);
  const isHome = pathname === '/admin' || pathname === '/admin/';

  // 마지막으로 열었던 작업 화면을 기억해 둔다 — 홈의 "이어서 하기" 칩용.
  useEffect(() => {
    const hit = RESUMABLE.find((r) => pathname.startsWith(r.prefix));
    if (!hit) return;
    try {
      window.localStorage.setItem(
        RESUME_KEY,
        JSON.stringify({ path: pathname, label: hit.label, at: Date.now() }),
      );
    } catch {
      // 저장 못 하면 칩이 안 뜰 뿐이다.
    }
  }, [pathname]);

  if (state.status === 'unknown' || state.status === 'verifying') {
    return (
      <div className="admin-light">
        <div className="admin-login-wrap">
          <div className="admin-login-card">
            <p className="admin-meta">인증 정보 확인 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (state.status !== 'authenticated') {
    return (
      <div className="admin-light">
        <PatLoginForm />
      </div>
    );
  }

  if (isFullBleed) {
    return (
      <>
        {children}
        <OfflineBar />
      </>
    );
  }

  if (isHome) {
    return (
      <div className="admin-light adm-home-root">
        {children}
        <OfflineBar />
      </div>
    );
  }

  return (
    <div className="admin-light">
      <div className="admin-app">
        <Sidebar />
        <main className="admin-main">{children}</main>
        <OfflineBar />
      </div>
    </div>
  );
}

export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <SwRegistrar />
      <Gate>{children}</Gate>
    </AdminProvider>
  );
}
