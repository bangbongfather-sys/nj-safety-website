'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdmin } from './AdminContext';

type NavItem = { href: string; label: string; section: 'main' | 'tools' };

const ITEMS: NavItem[] = [
  { href: '/admin',            label: '대시보드',     section: 'main'  },
  { href: '/admin/text',       label: '텍스트 편집',  section: 'main'  },
  { href: '/admin/products',   label: '제품 관리',    section: 'main'  },
  { href: '/admin/settings',   label: '설정',         section: 'tools' },
];

export default function Sidebar() {
  const { state, logout } = useAdmin();
  const pathname = usePathname() ?? '';
  const login = state.status === 'authenticated' ? state.login : '';

  function isActive(href: string): boolean {
    if (href === '/admin') return pathname === '/admin' || pathname === '/admin/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <Link href="/admin" className="admin-brand-logo">
          <span className="mark" />
          <span>
            <span className="nj">NJ</span>
            <span className="sf">SAFETY</span>
            <span className="admin-tag">ADMIN</span>
          </span>
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
