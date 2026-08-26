'use client';

/**
 * 방문 기록 비콘.
 *
 * 공개 페이지가 열릴 때 Worker 에 한 번 알린다(`POST /api/pv`). 외부
 * 분석 스크립트를 붙이지 않고 우리 D1 에만 숫자를 쌓기 위한 것이라
 * 보내는 내용이 없다 — 본문 없는 POST 한 번이 전부고, 집계에 쓰이는
 * 날짜·식별자는 서버가 만든다.
 *
 * App Router 에서는 페이지를 옮겨도 레이아웃이 다시 마운트되지 않는다.
 * 그래서 pathname 을 지켜보다가 바뀔 때마다 보낸다 — 그러지 않으면
 * 첫 페이지만 세고 그 뒤 이동은 통째로 빠진다.
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function ViewBeacon() {
  const pathname = usePathname();
  /** 같은 경로에서 두 번 보내지 않도록. 개발 모드의 이중 마운트와
   *  리렌더를 함께 걸러 준다. */
  const sent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    // 관리자 화면은 방문이 아니다.
    if (pathname.startsWith('/admin')) return;
    if (sent.current === pathname) return;
    sent.current = pathname;

    // keepalive: 링크를 눌러 페이지를 떠나는 중이어도 요청이 끊기지
    // 않는다. 실패는 무시한다 — 통계 때문에 화면이 흔들릴 이유는 없다.
    void fetch('/api/pv', { method: 'POST', keepalive: true }).catch(() => {});
  }, [pathname]);

  return null;
}
