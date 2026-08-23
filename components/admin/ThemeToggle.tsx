'use client';

/**
 * 밝게 / 어둡게 / 자동 전환 버튼.
 *
 * 세 상태를 한 버튼으로 돌리면 지금 뭐가 켜져 있는지 헷갈리므로,
 * 아이콘 옆에 상태 이름을 같이 띄운다.
 */

import type { ThemePref } from '@/lib/admin/useTheme';

const LABEL: Record<ThemePref, string> = {
  light: '밝게',
  dark: '어둡게',
  auto: '자동',
};

function Icon({ pref }: { pref: ThemePref }) {
  const p = { width: 15, height: 15, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (pref === 'dark') {
    return <svg {...p}><path d="M13.5 9.5A5.6 5.6 0 0 1 6.5 2.6a5.6 5.6 0 1 0 7 6.9z" /></svg>;
  }
  if (pref === 'light') {
    return <svg {...p}><circle cx="8" cy="8" r="3" /><path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3.1 3.1l1.1 1.1M11.8 11.8l1.1 1.1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1" /></svg>;
  }
  return <svg {...p}><circle cx="8" cy="8" r="5.5" /><path d="M8 2.5v11a5.5 5.5 0 0 0 0-11z" fill="currentColor" stroke="none" /></svg>;
}

export default function ThemeToggle({
  pref, onCycle, compact,
}: {
  pref: ThemePref;
  onCycle: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      className={`adm-theme-btn${compact ? ' is-compact' : ''}`}
      onClick={onCycle}
      title={`화면 밝기: ${LABEL[pref]} (눌러서 전환)`}
      aria-label={`화면 밝기 ${LABEL[pref]}, 눌러서 전환`}
    >
      <Icon pref={pref} />
      {compact ? null : <span>{LABEL[pref]}</span>}
    </button>
  );
}
