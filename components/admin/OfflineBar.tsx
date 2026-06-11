'use client';

// Floating status pill for the admin's offline mode (비행기 모드).
//
//   · offline           → "오프라인 — 변경사항은 이 기기에 저장됩니다"
//   · queued writes     → count + 지금 동기화 button
//   · back online       → auto-flush, then show the result briefly
//
// Mounted by AdminShell for every authenticated admin view (including the
// full-bleed WYSIWYG editors — fixed positioning keeps it out of the flow).

import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from './AdminContext';
import { ghFlushOfflineQueue } from '@/lib/admin/github';
import { getQueue, onQueueChange } from '@/lib/admin/offline';

type FlushNote = { kind: 'ok' | 'err'; text: string } | null;

export default function OfflineBar() {
  const { state } = useAdmin();
  const [online, setOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [note, setNote] = useState<FlushNote>(null);

  const pat = state.status === 'authenticated' ? state.pat : null;

  const flush = useCallback(async () => {
    if (!pat || syncing) return;
    setSyncing(true);
    setNote(null);
    try {
      const r = await ghFlushOfflineQueue(pat);
      if (r.errors.length > 0) {
        setNote({
          kind: 'err',
          text: `${r.errors.length}건 동기화 실패: ${r.errors[0].path} — ${r.errors[0].error}`,
        });
      } else if (r.flushed > 0 && r.remaining === 0) {
        setNote({ kind: 'ok', text: `대기 중이던 변경 ${r.flushed}건을 커밋했습니다` });
        window.setTimeout(() => setNote(null), 6000);
      }
    } finally {
      setQueueCount(getQueue().length);
      setSyncing(false);
    }
  }, [pat, syncing]);

  // Track connectivity + queue length.
  useEffect(() => {
    setOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    setQueueCount(getQueue().length);

    const onUp = () => {
      setOnline(true);
      void flush(); // 연결 복귀 → 자동 동기화
    };
    const onDown = () => setOnline(false);
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    const offQueue = onQueueChange(() => setQueueCount(getQueue().length));
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
      offQueue();
    };
  }, [flush]);

  // On mount: if we're online with leftovers from a previous offline
  // session, push them through without waiting for an 'online' event.
  useEffect(() => {
    if (online && pat && getQueue().length > 0) void flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pat]);

  if (state.status !== 'authenticated') return null;
  if (online && queueCount === 0 && !note && !syncing) return null;

  const bg = !online ? '#7a4a12' : note?.kind === 'err' ? '#7a1f24' : '#1f4d2e';

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        background: bg,
        color: '#f4f1ea',
        fontSize: 13,
        lineHeight: 1.4,
        boxShadow: '0 6px 24px rgba(0,0,0,.45)',
        maxWidth: 360,
      }}
    >
      <span aria-hidden="true">{!online ? '✈' : syncing ? '⟳' : note?.kind === 'err' ? '⚠' : '✓'}</span>
      <span style={{ wordBreak: 'keep-all' }}>
        {!online ? (
          queueCount > 0
            ? `오프라인 — 변경 ${queueCount}건이 이 기기에 저장됨. 연결되면 자동 커밋됩니다.`
            : '오프라인 모드 — 편집 내용은 이 기기에 저장됩니다.'
        ) : syncing ? (
          '동기화 중...'
        ) : note ? (
          note.text
        ) : (
          `대기 중인 변경 ${queueCount}건`
        )}
      </span>
      {online && queueCount > 0 && !syncing ? (
        <button
          type="button"
          onClick={() => void flush()}
          style={{
            border: '1px solid rgba(244,241,234,.4)',
            background: 'transparent',
            color: '#f4f1ea',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          지금 동기화
        </button>
      ) : null}
    </div>
  );
}
