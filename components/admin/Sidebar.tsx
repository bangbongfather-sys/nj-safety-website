'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdmin } from './AdminContext';

type NavItem = { href: string; label: string; section: 'main' | 'tools' };

const ITEMS: NavItem[] = [
  { href: '/admin',            label: '대시보드',                  section: 'main'  },
  { href: '/admin/edit',       label: '✎ 메인 페이지 편집',         section: 'main'  },
  { href: '/admin/about/edit', label: '✎ 회사소개 편집',           section: 'main'  },
  { href: '/admin/contact/edit', label: '✎ 문의 편집',             section: 'main'  },
  { href: '/admin/text',       label: '텍스트 편집 (폼)',          section: 'main'  },
  { href: '/admin/products',   label: '제품 관리',                  section: 'main'  },
  { href: '/admin/products/categories', label: '↳ 카테고리 (하위탭)', section: 'main'  },
  { href: '/admin/settings',   label: '설정',                       section: 'tools' },
];

export default function Sidebar() {
  const { state, logout } = useAdmin();
  const pathname = usePathname() ?? '';
  const login = state.status === 'authenticated' ? state.login : '';

  function isActive(href: string): boolean {
    if (href === '/admin') return pathname === '/admin' || pathname === '/admin/';
    // A href is active when the current path equals it OR starts with it,
    // BUT only if no other sidebar entry is a more-specific (longer) match.
    // Otherwise `/admin/products` would stay lit on `/admin/products/categories`
    // alongside the categories entry itself.
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
        <Link href="/admin" className="admin-brand-logo" aria-label="NJ SAFETY 어드민 홈">
          <img src="/nj-logo.png" alt="NJ SAFETY" className="admin-brand-img" />
          <span className="admin-tag">ADMIN</span>
        </Link>
      </div>

      <nav className="admin-nav">
        <div className="admin-nav-group">
          <div className="admin-nav-grouphead">관리</div>
          {ITEMS.filter((i) => i.section === 'main').map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={`admin-nav-link${isActive(i.href) ? ' is-active' : ''}`}
            >
              {i.label}
            </Link>
          ))}
        </div>

        <div className="admin-nav-group">
          <div className="admin-nav-grouphead">기타</div>
          {ITEMS.filter((i) => i.section === 'tools').map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={`admin-nav-link${isActive(i.href) ? ' is-active' : ''}`}
            >
              {i.label}
            </Link>
          ))}
          <a
            className="admin-nav-link admin-nav-ext"
            href="/ko/"
            target="_blank"
            rel="noreferrer"
          >
            사이트 미리보기 ↗
          </a>
        </div>
      </nav>

      <div className="admin-sidebar-foot">
        {login ? (
          <>
            <div className="admin-meta">
              <span className="k">GH</span>
              <span className="v">{login}</span>
            </div>
            <button className="btn ghost small" type="button" onClick={logout}>
              로그아웃
            </button>
          </>
        ) : null}
      </div>
    </aside>
  );
}
