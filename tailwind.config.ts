import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
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
