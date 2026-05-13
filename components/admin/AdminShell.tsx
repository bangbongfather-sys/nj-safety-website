'use client';

import type { ReactNode } from 'react';
import { AdminProvider, useAdmin } from './AdminContext';
import PatLoginForm from './PatLoginForm';
import Sidebar from './Sidebar';

function Gate({ children }: { children: ReactNode }) {
  const { state } = useAdmin();

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
