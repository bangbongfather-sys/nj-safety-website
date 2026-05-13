'use client';

import { useCallback, useEffect, useState } from 'react';
import { ghWhoami } from './github';

const PAT_KEY = 'nj_admin_github_pat';

export type PatState =
  | { status: 'unknown' }                // initial mount before checking localStorage
  | { status: 'unauthenticated' }        // no token saved
  | { status: 'verifying'; pat: string } // saved token, validating with GitHub
  | { status: 'authenticated'; pat: string; login: string }
  | { status: 'error'; pat: string; error: string };

export type PatApi = {
  state: PatState;
  login: (pat: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
};

export function usePat(): PatApi {
  const [state, setState] = useState<PatState>({ status: 'unknown' });

  // Restore + verify saved token on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(PAT_KEY);
    if (!saved) {
      setState({ status: 'unauthenticated' });
      return;
    }
    setState({ status: 'verifying', pat: saved });
    let cancelled = false;
    void ghWhoami(saved).then((r) => {
      if (cancelled) return;
      if (r.ok && r.login) {
        setState({ status: 'authenticated', pat: saved, login: r.login });
      } else {
        window.localStorage.removeItem(PAT_KEY);
        setState({ status: 'unauthenticated' });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (pat: string) => {
    const v = pat.trim();
    if (!v) return { ok: false, error: '토큰이 비어 있습니다' };
    setState({ status: 'verifying', pat: v });
    const r = await ghWhoami(v);
    if (r.ok && r.login) {
      window.localStorage.setItem(PAT_KEY, v);
      setState({ status: 'authenticated', pat: v, login: r.login });
      return { ok: true };
    } else {
      setState({ status: 'error', pat: v, error: r.error ?? 'unknown error' });
      return { ok: false, error: r.error };
    }
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(PAT_KEY);
    setState({ status: 'unauthenticated' });
  }, []);

  return { state, login, logout };
}
