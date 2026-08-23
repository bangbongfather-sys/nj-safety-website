'use client';

/**
 * 관리자 빠른 검색 (⌘K).
 *
 * 정교한 검색이 아니라 "어느 화면으로 가야 하지?" 를 해결하는 점프
 * 목록이다. 관리자 메뉴 + 공지 제목 + 제품 이름을 한 목록에 놓고
 * 글자를 치면 걸러진다. 데이터는 열 때 한 번만 불러온다.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ghGetFile, ghListDir } from '@/lib/admin/github';
import { IcSearch } from './AdminIcons';

type Entry = { kind: '화면' | '공지' | '제품'; label: string; href: string };

const SCREENS: Entry[] = [
  { kind: '화면', label: '문의 접수함', href: '/admin/inquiries' },
  { kind: '화면', label: '공지사항 관리', href: '/admin/notices' },
  { kind: '화면', label: '제품 관리', href: '/admin/products' },
  { kind: '화면', label: '제품 카테고리', href: '/admin/products/categories' },
  { kind: '화면', label: '자료실', href: '/admin/resources' },
  { kind: '화면', label: '대리점·거래처 관리', href: '/admin/dealers' },
  { kind: '화면', label: '메인 페이지 편집', href: '/admin/edit' },
  { kind: '화면', label: '회사소개 편집', href: '/admin/about/edit' },
  { kind: '화면', label: '문의 페이지 편집', href: '/admin/contact/edit' },
  { kind: '화면', label: '제품 라인업 페이지', href: '/admin/products-page/edit' },
  { kind: '화면', label: '텍스트 편집 (폼)', href: '/admin/text' },
  { kind: '화면', label: '계정 관리', href: '/admin/accounts' },
  { kind: '화면', label: '설정', href: '/admin/settings' },
];

export default function AdminSearch({ pat, onClose }: { pat: string; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [entries, setEntries] = useState<Entry[]>(SCREENS);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    let cancelled = false;
    void (async () => {
      const extra: Entry[] = [];
      try {
        const f = await ghGetFile(pat, 'data/notices.json');
        const notices = (JSON.parse(f?.content ?? '{}').notices ?? []) as
          { id?: string; titleKo?: string }[];
        for (const n of notices) {
          if (n.titleKo) extra.push({ kind: '공지', label: n.titleKo, href: '/admin/notices' });
        }
      } catch { /* 공지 없이 진행 */ }
      try {
        const files = await ghListDir(pat, 'data/products');
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          const slug = file.replace(/^.*\//, '').replace(/\.json$/, '');
          extra.push({ kind: '제품', label: slug, href: `/admin/products/${slug}/edit` });
        }
      } catch { /* 제품 없이 진행 */ }
      if (!cancelled) setEntries([...SCREENS, ...extra]);
    })();
    return () => { cancelled = true; };
  }, [pat]);

  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');
  const hits = q.trim()
    ? entries.filter((e) => norm(e.label).includes(norm(q)))
    : SCREENS;
  const shown = hits.slice(0, 9);

  function go(e: Entry) {
    onClose();
    router.push(e.href);
  }

  function onKey(e: React.KeyboardEvent) {
    // 한글 입력 중 Enter 는 조합 확정이지 선택이 아니다. 이 가드가
    // 없으면 "공지" 까지 치고 누른 첫 Enter 가 바로 이동해 버린다.
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, shown.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && shown[sel]) go(shown[sel]);
  }

  return (
    <div className="adm-search-overlay" onClick={onClose}>
      <div className="adm-search-panel" onClick={(e) => e.stopPropagation()}>
        <div className="adm-search-input">
          <IcSearch stroke="var(--muted-2)" />
          <input
            ref={inputRef}
            value={q}
            placeholder="화면 이름, 공지 제목, 제품 이름..."
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={onKey}
          />
          <kbd>esc</kbd>
        </div>
        <div className="adm-search-list">
          {shown.map((e, i) => (
            <button
              type="button"
              key={`${e.kind}-${e.label}-${e.href}`}
              className={`adm-search-row${i === sel ? ' is-sel' : ''}`}
              onMouseEnter={() => setSel(i)}
              onClick={() => go(e)}
            >
              <span className="adm-search-kind">{e.kind}</span>
              <span>{e.label}</span>
            </button>
          ))}
          {shown.length === 0 ? <div className="adm-search-empty">검색 결과가 없습니다</div> : null}
        </div>
      </div>
    </div>
  );
}
