'use client';

// Registers the admin service worker (public/sw.js) so /admin keeps
// loading in airplane mode. Mounted only inside the admin shell — public
// visitors never register it.

import { useEffect } from 'react';

export default function SwRegistrar() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failing (unsupported / private mode) just means no
      // offline page loading — the write queue still works.
    });
  }, []);
  return null;
}
