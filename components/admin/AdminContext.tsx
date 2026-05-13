'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { usePat, type PatApi } from '@/lib/admin/usePat';

const AdminCtx = createContext<PatApi | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const pat = usePat();
  return <AdminCtx.Provider value={pat}>{children}</AdminCtx.Provider>;
}

export function useAdmin(): PatApi {
  const v = useContext(AdminCtx);
  if (!v) throw new Error('useAdmin() must be inside <AdminProvider>');
  return v;
}
