'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { defaultLocale } from '@/lib/i18n';

const TARGET = `/${defaultLocale}/`;

export default function RootIndex() {
  useEffect(() => {
    window.location.replace(TARGET);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1c1c1e',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <p>
        Redirecting to{' '}
        <Link href={TARGET} style={{ color: '#ff6b1a', textDecoration: 'underline' }}>
          {TARGET}
        </Link>
        …
      </p>
    </div>
  );
}
