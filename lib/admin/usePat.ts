'use client';

import { useCallback, useEffect, useState } from 'react';
import { ghWhoami } from './github';
import { cacheLogin, getCachedLogin } from './offline';

const PAT_KEY = 'nj_admin_github_pat';

/**
 * iOS Safari throws a SecurityError on `window.localStorage` when site
 * data is blocked (Settings → Safari → 모든 쿠키 차단, Lockdown Mode,
 * some MDM profiles). The unguarded read below used to throw inside the
 * mount effect, so `setState` never ran and the gate sat on
 * "인증 정보 확인 중..." forever — which is exactly what an iPad showed
 * while the same account worked on a laptop.
 *
 * Storage being unavailable must degrade to "not logged in", never to a
 * dead screen. Sign-in still works; the token just isn't remembered.
 */
function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Session-only login — nothing more we can do here.
  }
}
function removeStored(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing was stored in the first place.
  }
}

export type PatState =
  | { status: 'unknown' }                // initial mount before checking localStorage
  | { status: 'unauthenticated' }        // no token saved
  | { status: 'verifying'; pat: string } // saved token, validating with GitHub
  | {
      status: 'authenticated';
      pat: string;
      login: string;
      /** True when GitHub couldn't be reached and we trusted the saved
       *  token (비행기 모드). Re-verified next time the network is back. */
      offline?: boolean;
    }
  | { status: 'error'; pat: string; error: string };

export type PatApi = {
  state: PatState;
  login: (pat: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
};

export function usePat(): PatApi {
  const [state, setState] = useState<PatState>({ status: 'unknown' });

  // Restore + verify saved token on mount. When the network is unreachable
  // (airplane mode) we keep the token and proceed in offline mode instead
  // of discarding it — saves will queue locally until the connection
  // returns. Only a definitive auth failure (e.g. 401) clears the token.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = readStored(PAT_KEY);
    if (!saved) {
      setState({ status: 'unauthenticated' });
      return;
    }
    setState({ status: 'verifying', pat: saved });
    let cancelled = false;
    void ghWhoami(saved).then((r) => {
      if (cancelled) return;
      if (r.ok && r.login) {
        cacheLogin(r.login);
        setState({ status: 'authenticated', pat: saved, login: r.login });
      } else if (r.offline) {
        setState({
          status: 'authenticated',
          pat: saved,
          login: getCachedLogin() ?? 'offline',
          offline: true,
        });
      } else {
        removeStored(PAT_KEY);
        setState({ status: 'unauthenticated' });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // When the connection returns while in offline-authenticated mode,
  // re-verify the token so the badge flips back to a confirmed login.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (state.status !== 'authenticated' || !state.offline) return;
    const pat = state.pat;
    const onOnline = () => {
      void ghWhoami(pat).then((r) => {
        if (r.ok && r.login) {
          cacheLogin(r.login);
          setState({ status: 'authenticated', pat, login: r.login });
        }
      });
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [state]);

  const login = useCallback(async (pat: string) => {
    const v = pat.trim();
    if (!v) return { ok: false, error: '토큰이 비어 있습니다' };
    setState({ status: 'verifying', pat: v });
    const r = await ghWhoami(v);
    if (r.ok && r.login) {
      writeStored(PAT_KEY, v);
      cacheLogin(r.login);
      setState({ status: 'authenticated', pat: v, login: r.login });
      return { ok: true };
    } else if (r.offline) {
      // Can't verify without a network — accept provisionally so the
      // editor is usable; the next online verification settles it.
      writeStored(PAT_KEY, v);
      setState({
        status: 'authenticated',
        pat: v,
        login: getCachedLogin() ?? 'offline',
        offline: true,
      });
      return { ok: true };
    } else {
      setState({ status: 'error', pat: v, error: r.error ?? 'unknown error' });
      return { ok: false, error: r.error };
    }
  }, []);

  const logout = useCallback(() => {
    removeStored(PAT_KEY);
    setState({ status: 'unauthenticated' });
  }, []);

  return { state, login, logout };
}
