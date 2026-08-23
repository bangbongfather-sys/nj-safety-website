'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAdmin } from './AdminContext';
import { useAdminTheme } from './AdminShell';
import AdminBrand from './AdminBrand';
import ThemeToggle from './ThemeToggle';
import {
  IcHome, IcInbox, IcNotice, IcProduct, IcFolder, IcStore, IcPen, IcUser, IcGear,
} from './AdminIcons';

type NavItem = {
  href: string;
  label: string;
  group: 'top' | 'work' | 'pages' | 'manage';
  icon?: React.ReactNode;
  /** 상위 메뉴의 하위 항목 — 들여쓰기로 표시. */
  sub?: boolean;
};

const ITEMS: NavItem[] = [
  { href: '/admin',            label: '홈 (전체 메뉴)', group: 'top',  icon: <IcHome /> },

  { href: '/admin/inquiries',  label: '문의 접수함',    group: 'work', icon: <IcInbox /> },
  { href: '/admin/notices',    label: '공지사항',       group: 'work', icon: <IcNotice /> },
  { href: '/admin/products',   label: '제품 관리',      group: 'work', icon: <IcProduct /> },
  { href: '/admin/products/categories', label: '카테고리 (하위탭)', group: 'work', sub: true },
  { href: '/admin/resources',  label: '자료실',         group: 'work', icon: <IcFolder /> },
  { href: '/admin/dealers',    label: '대리점·거래처',   group: 'work', icon: <IcStore /> },

  { href: '/admin/edit',       label: '메인 페이지',     group: 'pages', icon: <IcPen /> },
  { href: '/admin/about/edit', label: '회사소개',        group: 'pages', sub: true },
  { href: '/admin/contact/edit', label: '문의 페이지',    group: 'pages', sub: true },
  { href: '/admin/products-page/edit', label: '제품 라인업', group: 'pages', sub: true },
  { href: '/admin/text',       label: '텍스트 편집 (폼)', group: 'pages', sub: true },

  { href: '/admin/accounts',   label: '계정 관리',       group: 'manage', icon: <IcUser /> },
  { href: '/admin/settings',   label: '설정',           group: 'manage', icon: <IcGear /> },
];

const GROUPS: { key: NavItem['group']; title: string | null }[] = [
  { key: 'top',    title: null },
  { key: 'work',   title: '업무' },
  { key: 'pages',  title: '페이지 편집' },
  { key: 'manage', title: '관리' },
];

export const BADGE_CACHE_KEY = 'nj_admin_inq_badge';

/**
 * 새 문의 개수 배지. 접수함 전체를 읽어 세는데, 화면을 옮길 때마다
 * 그러면 낭비라 60초 동안 sessionStorage 에 들고 있는다.
 */
function useNewInquiryCount(pat: string): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!pat) return;
    try {
      const cached = window.sessionStorage.getItem(BADGE_CACHE_KEY);
      if (cached) {
        const { n, at } = JSON.parse(cached) as { n: number; at: number };
        if (Date.now() - at < 60_000) {
          setCount(n);
          return;
        }
      }
    } catch { /* 캐시 실패는 무시 */ }
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch('/api/admin/inquiries', {
          headers: { Authorization: `token ${pat}` },
        });
        if (!r.ok) return;
        const data = (await r.json()) as { items?: { status?: string }[] };
        const n = (data.items ?? []).filter((i) => i.status === 'new').length;
        if (cancelled) return;
        setCount(n);
        try {
          window.sessionStorage.setItem(BADGE_CACHE_KEY, JSON.stringify({ n, at: Date.now() }));
        } catch { /* 캐시 실패는 무시 */ }
      } catch { /* 오프라인이면 배지 없이 */ }
    })();
    return () => { cancelled = true; };
  }, [pat]);
  return count;
}

export default function Sidebar() {
  const { state, logout } = useAdmin();
  const { pref, resolved, cycle } = useAdminTheme();
  const pathname = usePathname() ?? '';
  const login = state.status === 'authenticated' ? state.login : '';
  const pat = state.status === 'authenticated' ? state.pat : '';
  const newInquiries = useNewInquiryCount(pat);

  function isActive(href: string): boolean {
    if (href === '/admin') return pathname === '/admin' || pathname === '/admin/';
    const matches = pathname === href || pathname.startsWith(href + '/');
    if (!matches) return false;
    const longerMatch = ITEMS.some(
      (i) =>
        i.href !== href &&
        i.href.startsWith(href + '/') &&
        (pathname === i.href || pathname.startsWith(i.href + '/')),
    );
    return !longerMatch;
  }

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <AdminBrand dark={resolved === 'dark'} />
      </div>

      <nav className="admin-nav">
        {GROUPS.map((g) => (
          <div className="admin-nav-group" key={g.key}>
            {g.title ? <div className="admin-nav-grouphead">{g.title}</div> : null}
            {ITEMS.filter((i) => i.group === g.key).map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className={`admin-nav-link${isActive(i.href) ? ' is-active' : ''}${i.sub ? ' is-sub' : ''}`}
              >
                {i.icon ? <span className="adm-nav-ic">{i.icon}</span> : null}
                <span>{i.label}</span>
                {i.href === '/admin/inquiries' && newInquiries ? (
                  <span className="adm-badge">{newInquiries}</span>
                ) : null}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="admin-sidebar-foot">
        <div className="adm-user-row">
          <span className="adm-avatar">{(login || '?').slice(0, 1).toUpperCase()}</span>
          <span className="adm-user-name">{login}</span>
        </div>
        <div className="adm-foot-links">
          <a href="/ko/" target="_blank" rel="noreferrer" className="adm-foot-link">사이트 보기 ↗</a>
          <button type="button" className="adm-foot-link" onClick={logout}>로그아웃</button>
        </div>
        <ThemeToggle pref={pref} onCycle={cycle} />
      </div>
    </aside>
  );
}
