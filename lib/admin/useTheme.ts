'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * 관리자 화면 테마.
 *
 * 밤 작업용 다크모드. 세 가지 상태를 둔다 — 낮/밤이 갈리는 사람이
 * 많아서, "시스템 설정 따라가기" 가 기본이면 아무도 아무것도 안 눌러도
 * 알아서 맞는다.
 *
 *   auto   기기(맥·아이패드) 설정을 따라간다 (기본)
 *   light  항상 밝게
 *   dark   항상 어둡게
 *
 * 고른 값은 이 기기에만 남는다. 실제 색은 globals.css 의
 * `.admin-light` / `.admin-dark` 스코프가 결정한다.
 */

export type ThemePref = 'auto' | 'light' | 'dark';
export type Resolved = 'light' | 'dark';

const KEY = 'nj_admin_theme';

function readPref(): ThemePref {
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'auto') return v;
  } catch {
    // 저장소가 막혀 있으면 auto 로.
  }
  return 'auto';
}

function systemIsDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

export function useTheme(): {
  pref: ThemePref;
  resolved: Resolved;
  setPref: (p: ThemePref) => void;
  cycle: () => void;
} {
  // 서버 렌더와 첫 클라이언트 렌더가 어긋나면 안 되므로 light 로 시작해
  // 마운트 직후에 실제 값으로 맞춘다.
  const [pref, setPrefState] = useState<ThemePref>('auto');
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    setPrefState(readPref());
    setSystemDark(systemIsDark());
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia('(prefers-color-scheme: dark)');
    } catch {
      return;
    }
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved: Resolved = pref === 'auto' ? (systemDark ? 'dark' : 'light') : pref;

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    try {
      window.localStorage.setItem(KEY, p);
    } catch {
      // 이번 세션에만 적용된다.
    }
  }, []);

  // 버튼 한 번에 밝게 → 어둡게 → 자동 순환.
  const cycle = useCallback(() => {
    setPref(pref === 'light' ? 'dark' : pref === 'dark' ? 'auto' : 'light');
  }, [pref, setPref]);

  return { pref, resolved, setPref, cycle };
}
