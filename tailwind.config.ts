import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      screens: {
        // Tailwind defaults preserved: sm 640, md 768, lg 1024, xl 1280, 2xl 1536.
        // Added:
        //   xs  → very small phones (legacy 360px breakpoint)
        //   nav → 1100px desktop/mobile cutover for the top nav. The
        //         legacy CSS already used 1100px to hide .menu; keeping
        //         the same number here means the new Tailwind-driven
        //         hamburger appears at the exact same threshold.
        xs: '360px',
        nav: '1100px',
      },
      colors: {
        bg: '#1c1c1e',
        'bg-2': '#2a2a2c',
        'bg-3': '#0d0d0e',
        card: '#252527',
        accent: '#ff6b1a',
        'accent-soft': '#ff8a3a',
        muted: '#a1a1a6',
        'muted-2': '#6b6b70',
        border: '#3a3a3c',
        'border-soft': '#2f2f31',
      },
      fontFamily: {
        sans: ['Pretendard', 'Inter', '-apple-system', 'system-ui', 'sans-serif'],
        display: ['Inter', 'Pretendard', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.045em',
        tighter: '-0.03em',
      },
      maxWidth: {
        wrap: '1440px',
      },
    },
  },
  plugins: [],
};

export default config;
