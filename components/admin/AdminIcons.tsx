/**
 * 관리자 화면 공용 아이콘. 시안(밝은 애플풍)에서 쓰던 16/20px 선형
 * SVG 를 그대로 옮겼다 — 이모지는 크기·색을 못 맞추니 쓰지 않는다.
 */

type P = { size?: number; stroke?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 16 16',
  fill: 'none' as const,
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const IcHome = ({ size = 17, stroke = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={stroke}><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></svg>
);
export const IcInbox = ({ size = 17, stroke = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={stroke}><path d="M2 3h12v8H6l-3 3V3z" /></svg>
);
export const IcNotice = ({ size = 17, stroke = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={stroke}><path d="M3 2h8l3 3v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" /><path d="M5 8h6M5 11h6" /></svg>
);
export const IcProduct = ({ size = 17, stroke = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={stroke}><rect x="2" y="2" width="12" height="12" rx="2" /><path d="M2 6h12M6 6v8" /></svg>
);
export const IcFolder = ({ size = 17, stroke = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={stroke}><path d="M2 4a1 1 0 0 1 1-1h4l2 2h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" /></svg>
);
export const IcStore = ({ size = 17, stroke = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={stroke}><path d="M2 6l1.5-3.5h9L14 6M2 6v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6M2 6h12M6 14v-4h4v4" /></svg>
);
export const IcPen = ({ size = 17, stroke = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={stroke}><path d="M12 2l2 2-8.5 8.5L3 13l.5-2.5z" /></svg>
);
export const IcUser = ({ size = 17, stroke = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={stroke}><circle cx="8" cy="5" r="3" /><path d="M2 14c1-3 3.5-4 6-4s5 1 6 4" /></svg>
);
export const IcGear = ({ size = 17, stroke = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={stroke}><circle cx="8" cy="8" r="2.5" /><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4" /></svg>
);
export const IcSearch = ({ size = 15, stroke = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={stroke}><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg>
);
export const IcArrowRight = ({ size = 13, stroke = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={stroke} strokeWidth={2}><path d="M6 3l5 5-5 5" /></svg>
);
export const IcExternal = ({ size = 12, stroke = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={stroke}><path d="M4 12L12 4M6 4h6v6" /></svg>
);
export const IcResume = ({ size = 13, stroke = 'currentColor' }: P) => (
  <svg {...base(size)} stroke={stroke}><path d="M8 3a5 5 0 1 0 5 5" /><path d="M13 3v3h-3" /></svg>
);
