'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AdminProvider, useAdmin } from './AdminContext';
import PatLoginForm from './PatLoginForm';
import Sidebar from './Sidebar';

function Gate({ children }: { children: ReactNode }) {
  const { state } = useAdmin();
  const pathname = usePathname() ?? '';
  // The WYSIWYG editors (homepage + per-product) take the whole viewport
  // — hide the admin chrome so the live page render isn't squeezed into
  // the side panel.
  const isFullBleed =
    pathname.startsWith('/admin/edit') ||
    pathname.startsWith('/admin/about/edit') ||
    /^\/admin\/products\/[^/]+\/edit\/?$/.test(pathname);

  if (state.status === 'unknown' || state.status === 'verifying') {
    return (
      <div className="admin-login-wrap">
        <div className="admin-login-card">
          <p className="admin-meta">인증 정보 확인 중...</p>
        </div>
      </div>
    );
  }

  if (state.status !== 'authenticated') {
    return <PatLoginForm />;
  }

  if (isFullBleed) return <>{children}</>;

  return (
    <div className="admin-app">
      <Sidebar />
      <main className="admin-main">{children}</main>
    </div>
  );
}

export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <Gate>{children}</Gate>
    </AdminProvider>
  );
}
