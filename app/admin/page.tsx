'use client';

/**
 * 관리자 홈 — 타일 런처 (2026-08 개편).
 *
 * 처음 온 직원이 매뉴얼 없이 시작할 수 있어야 한다는 요구에서 나온
 * 화면. 원칙 두 가지:
 *
 *   · 타일은 버튼이 아니라 창이다 — 들어가 보지 않아도 새 문의가 몇
 *     건인지, 마지막 공지가 뭔지 홈에서 보인다.
 *   · 설명은 화면 안에 있다 — 1·2·3 안내 배너(닫으면 다시 안 뜸)와
 *     타일마다 한 줄 설명. 별도 교육이 필요 없게.
 *
 * 사이드바는 여기엔 없다. 타일을 눌러 작업 화면으로 들어가면 왼쪽
 * 메뉴가 생기고, 그 메뉴 맨 위 "홈" 으로 언제든 돌아온다 (iCloud 방식).
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { RESUME_KEY, useAdminTheme } from '@/components/admin/AdminShell';
import AdminBrand from '@/components/admin/AdminBrand';
import ThemeToggle from '@/components/admin/ThemeToggle';
import AdminSearch from '@/components/admin/AdminSearch';
import {
  IcInbox, IcNotice, IcProduct, IcFolder, IcPen, IcUser, IcStore, IcChart,
  IcArrowRight, IcExternal, IcResume, IcSearch,
} from '@/components/admin/AdminIcons';
import { ghGetFile, ghListDir } from '@/lib/admin/github';

const INTRO_KEY = 'nj_admin_intro_dismissed';

type Inquiry = {
  receivedAt: string;
  status: 'new' | 'done';
  inquiryLabel: string;
  contactName: string;
};

type HomeData = {
  newInquiries: number | null;
  latestInquiry: Inquiry | null;
  noticeCount: number | null;
  latestNotice: { title: string; date: string } | null;
  productCount: number | null;
  resourceCount: number | null;
  staffCount: number | null;
  lastDeploy: { date: string; author?: string } | null;
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '늦은 밤까지 고생 많으세요';
  if (h < 12) return '좋은 아침이에요';
  if (h < 18) return '좋은 오후예요';
  return '좋은 저녁이에요';
}

function todayLabel(): string {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
}

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function AdminHome() {
  const { state, logout } = useAdmin();
  const { pref, resolved, cycle } = useAdminTheme();
  const pat = state.status === 'authenticated' ? state.pat : '';
  const login = state.status === 'authenticated' ? state.login : '';

  const [data, setData] = useState<HomeData>({
    newInquiries: null, latestInquiry: null, noticeCount: null, latestNotice: null,
    productCount: null, resourceCount: null, staffCount: null, lastDeploy: null,
  });
  const [showIntro, setShowIntro] = useState(false);
  const [resume, setResume] = useState<{ path: string; label: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    try {
      setShowIntro(!window.localStorage.getItem(INTRO_KEY));
      const raw = window.localStorage.getItem(RESUME_KEY);
      if (raw) {
        const r = JSON.parse(raw) as { path: string; label: string; at: number };
        // 일주일 넘은 기억은 "이어서" 라기엔 멋쩍다.
        if (Date.now() - r.at < 7 * 24 * 3600_000) setResume({ path: r.path, label: r.label });
      }
    } catch { /* 저장소가 막혀 있으면 배너·칩 없이 */ }
  }, []);

  // ⌘K / Ctrl+K → 검색
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!pat) return;
    let cancelled = false;
    const patch = (p: Partial<HomeData>) => {
      if (!cancelled) setData((d) => ({ ...d, ...p }));
    };

    void (async () => {
      try {
        const r = await fetch('/api/admin/inquiries', { headers: { Authorization: `token ${pat}` } });
        const payload = (await r.json()) as { items?: Inquiry[] };
        const items = payload.items ?? [];
        patch({
          newInquiries: items.filter((i) => i.status === 'new').length,
          latestInquiry: items[0] ?? null,
        });
      } catch { patch({ newInquiries: null }); }
    })();

    void (async () => {
      try {
        const f = await ghGetFile(pat, 'data/notices.json');
        const notices = (JSON.parse(f?.content ?? '{}').notices ?? []) as
          { titleKo?: string; date?: string }[];
        const latest = [...notices].sort((a, b) => (a.date! < b.date! ? 1 : -1))[0];
        patch({
          noticeCount: notices.length,
          latestNotice: latest ? { title: latest.titleKo ?? '', date: latest.date ?? '' } : null,
        });
      } catch { patch({ noticeCount: null }); }
    })();

    void (async () => {
      try {
        const files = await ghListDir(pat, 'data/products');
        patch({ productCount: files.filter((p) => p.endsWith('.json')).length });
      } catch { patch({ productCount: null }); }
    })();

    void (async () => {
      try {
        const f = await ghGetFile(pat, 'data/site-resources.json');
        const res = JSON.parse(f?.content ?? '{}') as { catalog?: unknown; documents?: unknown[] };
        patch({ resourceCount: (res.documents?.length ?? 0) + (res.catalog ? 1 : 0) });
      } catch { patch({ resourceCount: null }); }
    })();

    void (async () => {
      try {
        const r = await fetch('/api/admin/users', { headers: { Authorization: `token ${pat}` } });
        const payload = (await r.json()) as { users?: unknown[] };
        patch({ staffCount: payload.users?.length ?? null });
      } catch { patch({ staffCount: null }); }
    })();

    void (async () => {
      try {
        const r = await fetch('/api/admin/gh/commits?sha=main&per_page=1', {
          headers: { Authorization: `token ${pat}` },
        });
        const commits = (await r.json()) as { commit?: { author?: { date?: string; name?: string } } }[];
        const c = commits[0]?.commit?.author;
        patch({ lastDeploy: c?.date ? { date: c.date, author: c.name } : null });
      } catch { patch({ lastDeploy: null }); }
    })();

    return () => { cancelled = true; };
  }, [pat]);

  const deployLabel = useMemo(() => {
    if (!data.lastDeploy) return '—';
    const d = new Date(data.lastDeploy.date);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return sameDay ? `오늘 ${hm}` : `${d.getMonth() + 1}.${d.getDate()} ${hm}`;
  }, [data.lastDeploy]);

  function dismissIntro() {
    setShowIntro(false);
    try { window.localStorage.setItem(INTRO_KEY, '1'); } catch { /* 다음에 또 보이는 것뿐 */ }
  }

  return (
    <div className="adm-home">
      <div className="adm-stripe" aria-hidden="true" />

      <header className="adm-topbar">
        <AdminBrand dark={resolved === 'dark'} suffix="관리자" />
        <button type="button" className="adm-searchbox" onClick={() => setSearchOpen(true)}>
          <IcSearch />
          <span>공지·제품·화면 검색</span>
          <kbd>⌘K</kbd>
        </button>
        <div className="adm-topbar-user">
          <ThemeToggle pref={pref} onCycle={cycle} compact />
          <span className="adm-avatar">{(login || '?').slice(0, 1).toUpperCase()}</span>
          <span className="adm-user-name">{login}</span>
          <button type="button" className="adm-foot-link" onClick={logout}>로그아웃</button>
        </div>
      </header>

      <main className="adm-home-main">
        <div className="adm-hero">
          <div className="adm-hero-text">
            <span className="adm-date">{todayLabel()}</span>
            <h1>{greeting()}{login ? `, ${login}님` : ''}</h1>
          </div>
          {resume ? (
            <Link href={resume.path} className="adm-resume-chip">
              <IcResume stroke="var(--accent)" />
              <span>이어서: {resume.label}</span>
            </Link>
          ) : null}
        </div>

        {showIntro ? (
          <div className="adm-intro">
            <strong>처음이신가요?</strong>
            <span className="adm-intro-steps">
              <span><em>1</em> 아래 타일을 눌러 들어가고</span>
              <IcArrowRight stroke="#d2d2d7" />
              <span><em>2</em> 내용을 고치고 저장하면</span>
              <IcArrowRight stroke="#d2d2d7" />
              <span><em>3</em> 1~2분 뒤 사이트에 반영됩니다</span>
            </span>
            <button type="button" className="adm-intro-close" onClick={dismissIntro}>
              다시 보지 않기 ✕
            </button>
          </div>
        ) : null}

        <div className="adm-tiles">
          <Link href="/admin/inquiries" className={`adm-tile${data.newInquiries ? ' is-hot' : ''}`}>
            <div className="adm-tile-top">
              <span className="adm-tile-ic"><IcInbox size={19} stroke="var(--accent)" /></span>
              {data.newInquiries ? <span className="adm-badge">새 문의 {data.newInquiries}</span> : null}
            </div>
            <span className="adm-tile-name">문의 접수함</span>
            {data.latestInquiry ? (
              <span className="adm-tile-live">
                <i />
                {data.latestInquiry.contactName} · {data.latestInquiry.inquiryLabel} · {relTime(data.latestInquiry.receivedAt)}
              </span>
            ) : (
              <span className="adm-tile-desc">고객 문의를 읽고 처리 상태를 표시합니다</span>
            )}
          </Link>

          <Link href="/admin/notices" className="adm-tile">
            <div className="adm-tile-top">
              <span className="adm-tile-ic"><IcNotice size={19} stroke="var(--accent)" /></span>
            </div>
            <span className="adm-tile-name">공지사항</span>
            <span className="adm-tile-desc">
              {data.noticeCount != null
                ? `공지 ${data.noticeCount}건${data.latestNotice ? ` · 마지막 ${data.latestNotice.date.slice(5).replace('-', '.')} 「${data.latestNotice.title}」` : ''}`
                : '새 소식을 올리거나 팝업 공지를 띄웁니다'}
            </span>
          </Link>

          <Link href="/admin/products" className="adm-tile">
            <div className="adm-tile-top">
              <span className="adm-tile-ic"><IcProduct size={19} stroke="var(--accent)" /></span>
            </div>
            <span className="adm-tile-name">제품 관리</span>
            <span className="adm-tile-desc">
              {data.productCount != null ? `${data.productCount}개 등록 · 사진과 시험성적서 관리` : '제품 정보와 사진, 시험성적서를 관리합니다'}
            </span>
          </Link>

          <Link href="/admin/resources" className="adm-tile">
            <div className="adm-tile-top">
              <span className="adm-tile-ic"><IcFolder size={19} stroke="var(--accent)" /></span>
            </div>
            <span className="adm-tile-name">자료실</span>
            <span className="adm-tile-desc">
              {data.resourceCount != null ? `카탈로그·인증서 파일 ${data.resourceCount}개` : '카탈로그와 인증서 파일을 올립니다'}
            </span>
          </Link>

          <Link href="/admin/edit" className="adm-tile">
            <div className="adm-tile-top">
              <span className="adm-tile-ic"><IcPen size={19} stroke="var(--accent)" /></span>
            </div>
            <span className="adm-tile-name">페이지 편집</span>
            <span className="adm-tile-desc">메인 · 회사소개 · 문의 페이지 글을 고칩니다</span>
          </Link>

          <Link href="/admin/analytics" className="adm-tile">
            <div className="adm-tile-top">
              <span className="adm-tile-ic"><IcChart size={19} stroke="var(--accent)" /></span>
            </div>
            <span className="adm-tile-name">방문자 통계</span>
            <span className="adm-tile-desc">일별·월별 방문자 추이를 그래프와 표로 봅니다</span>
          </Link>

          <Link href="/admin/accounts" className="adm-tile">
            <div className="adm-tile-top">
              <span className="adm-tile-ic"><IcUser size={19} stroke="var(--accent)" /></span>
            </div>
            <span className="adm-tile-name">계정·설정</span>
            <span className="adm-tile-desc">
              {data.staffCount != null ? `직원 ${data.staffCount}명 · 내 비밀번호 변경` : '비밀번호 변경, 직원 계정 관리'}
            </span>
          </Link>
        </div>

        <div className="adm-more-row">
          <Link href="/admin/dealers" className="adm-more-link"><IcStore size={14} /> 대리점·거래처 관리</Link>
          <Link href="/admin/text" className="adm-more-link"><IcPen size={14} /> 텍스트 편집 (폼)</Link>
        </div>

        <div className="adm-statusbar">
          <span className="adm-status-ok"><i />사이트 정상 운영 중</span>
          <span className="adm-status-sep" />
          <span>최근 반영 <strong>{deployLabel}</strong>{data.lastDeploy?.author ? ` · ${data.lastDeploy.author}` : ''}</span>
          <a href="/ko/" target="_blank" rel="noreferrer" className="adm-status-site">
            사이트 보기 <IcExternal stroke="var(--accent)" />
          </a>
        </div>
      </main>

      {searchOpen ? <AdminSearch pat={pat} onClose={() => setSearchOpen(false)} /> : null}
    </div>
  );
}
