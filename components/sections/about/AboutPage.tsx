/**
 * /ko/about — 회사소개 페이지.
 *
 * 9-section narrative built from design_handoff_about_page:
 *
 *   01. Hero (38년 / 방염, 한 길)
 *   02. Stats strip (4 cells)
 *   03. CEO Message
 *   04. Heritage Timeline (3 phases)
 *   05. Core Values (5 cards)
 *   06. One-Stop System (4 stages)
 *   07. Industries Served (4 cards)
 *   08. Recent Certification Milestones
 *   09. CTA
 *
 * All design tokens (colors, fonts) are inherited from the global theme
 * — see globals.css. Only the about-page-specific layout lives in
 * `about.css`. Site nav + footer are mounted by `app/[locale]/layout.tsx`
 * automatically, so this component renders only the page body.
 *
 * Copy / structure is intentionally hardcoded for now: the design
 * handoff is the single source of truth, and editorial copy here is
 * not under the existing dict-based admin editor. (If we want admin
 * editing later, move the strings into `locales/ko.json` under an
 * `about.*` namespace — same pattern the homepage uses.)
 */

import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import './about.css';

type Props = { locale: Locale };

export default function AboutPage({ locale }: Props) {
  return (
    <div className="about-page">
      <AboutHero />
      <AboutStats />
      <AboutCeo />
      <AboutHeritage />
      <AboutValues />
      <AboutOneStop />
      <AboutIndustries />
      <AboutRecent />
      <AboutCta locale={locale} />
    </div>
  );
}

/* ─── 01. Hero ───────────────────────────────────────────────────── */
function AboutHero() {
  return (
    <section className="ab-hero" data-screen-label="01 Hero">
      <div className="ab-hero-bg" aria-hidden>
        <svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
          <g fill="none" stroke="#ff6b1a" strokeWidth="1">
            <path d="M100 500 L100 100 L500 100 L500 500 Z" opacity=".3" />
            <path d="M150 460 L150 140 L450 140 L450 460 Z" opacity=".2" />
            <path d="M200 420 L200 180 L400 180 L400 420 Z" opacity=".15" />
            <line x1="100" y1="200" x2="500" y2="200" opacity=".3" />
            <line x1="100" y1="300" x2="500" y2="300" opacity=".3" />
            <line x1="100" y1="400" x2="500" y2="400" opacity=".3" />
          </g>
        </svg>
      </div>
      <div className="wrap">
        <div className="ab-hero-content">
          <div className="ab-hero-l">
            <div className="ab-hero-meta">
              <span className="ab-hairline" />
              <span className="ab-eyebrow">About · 회사소개</span>
            </div>
            <div className="ab-hero-year">
              <span className="num">38</span>
              <span className="lbl">
                <span className="k">Years of</span>
                <span className="v">Industrial Safety</span>
              </span>
            </div>
            <h1>
              방염, <em>한 길.</em>
              <br />
              나정엔터프라이즈.
            </h1>
            <p className="ab-hero-sub">
              1987년 나정ETP로 시작해 38년간 방염 산업안전복 한 분야에만 집중해 왔습니다.
              원단 개발부터 디자인·생산·출하까지 — 모든 단계를 책임지는 원스톱 시스템으로
              산업 현장의 가장 가까운 곳에서 작업자를 지킵니다.
            </p>
          </div>
          <aside className="ab-hero-aside">
            <div>
              <div className="tag">— Brand Mission</div>
              <p className="pull">
                우리는 작업복을 만들지 않습니다.
                <br />
                <em>생명을 지키는 보호 시스템</em>을 설계합니다.
              </p>
            </div>
            <div className="corp">
              <span>NAJUNG ENTERPRISE CO., LTD.</span>
              <strong>EST. 1987</strong>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

/* ─── 02. Stats Strip ────────────────────────────────────────────── */
function AboutStats() {
  const STATS = [
    { lbl: '— Heritage', num: '38', unit: 'YEARS',         desc: '1987년 창립 이래 방염 산업안전복 단일 카테고리에 집중해온 시간.' },
    { lbl: '— Coverage', num: '4',  unit: '대 산업',        desc: '전력·발전 / 전기공사 / 정유·석유화학 / 에너지·가스 현장에 공급.' },
    { lbl: '— Process',  num: '4',  unit: '단계 ONE-STOP',  desc: '원단 개발 → 디자인 → 생산 → 출하까지 본사 직접 관리.' },
    { lbl: '— Trust',    num: '∞',  unit: '',               desc: '한전 협력사 · SK 계열 · LG 계열 등 산업 리더의 선택.' },
  ];
  return (
    <section className="ab-stats" data-screen-label="02 Stats">
      <div className="ab-stats-grid">
        {STATS.map((s) => (
          <div key={s.lbl} className="ab-stat">
            <span className="lbl">{s.lbl}</span>
            <span className="val">
              {s.num}
              {s.unit ? <span className="u">{s.unit}</span> : null}
            </span>
            <span className="desc">{s.desc}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── 03. CEO Message ────────────────────────────────────────────── */
function AboutCeo() {
  return (
    <section className="ab-ceo ab-section" data-screen-label="03 CEO Message">
      <div className="wrap">
        <div className="ab-ceo-grid">
          <div className="ab-ceo-portrait">
            <span className="badge">CEO · 대표 인사말</span>
            <svg className="ab-ph-svg" viewBox="0 0 500 625" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <defs>
                <linearGradient id="ab-pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#252527" />
                  <stop offset="1" stopColor="#0d0d0e" />
                </linearGradient>
              </defs>
              <rect width="500" height="625" fill="url(#ab-pg)" />
              <g className="stripes" opacity=".25">
                <line x1="0" y1="120" x2="500" y2="120" />
                <line x1="0" y1="240" x2="500" y2="240" />
                <line x1="0" y1="360" x2="500" y2="360" />
                <line x1="0" y1="480" x2="500" y2="480" />
              </g>
              <g fill="none" stroke="#4a4a4d" strokeWidth="1.5">
                <ellipse cx="250" cy="260" rx="80" ry="100" />
                <path d="M120 625 L120 480 Q120 400 200 380 L300 380 Q380 400 380 480 L380 625" />
              </g>
              <g fill="#ff6b1a" opacity=".5">
                <circle cx="250" cy="260" r="3" />
              </g>
            </svg>
            <span className="ph-name">[ PORTRAIT · 대표이사 ]</span>
            <span className="stamp">2026 / SEOUL</span>
          </div>
          <div className="ab-ceo-body">
            <span className="ab-eyebrow">— CEO Message</span>
            <h2>
              산업 현장이 선택한,
              <br />
              <em>방염의 가장 가까운 파트너.</em>
            </h2>
            <p>
              1987년, 단 한 가지 신념으로 시작했습니다. 산업 현장에서 일하는 사람의
              안전은 결코 타협의 대상이 될 수 없다는 것. 38년이 지난 지금도 그 신념은
              변하지 않았습니다.
            </p>
            <p>
              그동안 우리는 방염 작업복 한 분야에 집중하며 원단부터 봉제, 인증, 사후
              관리까지 모든 단계를 직접 다뤄왔습니다. 한전 협력사, SK 계열, LG 계열을
              비롯한 국내 주요 산업 현장이 NJ SAFETY를 선택한 이유 — 그것은 우리가 만든
              옷이 좋아서가 아니라, 작업자를 지키는 일에 한 번도 한눈팔지 않았기
              때문입니다.
            </p>
            <p>앞으로도 우리는 가장 가까운 곳에서, 가장 확실한 방식으로 산업 현장을 지키겠습니다.</p>
            <div className="signoff">
              <span className="ab-hairline" style={{ background: 'var(--accent)' }} />
              <span>대표이사</span>
              {/* TODO 실제 대표이사 성함으로 교체 */}
              <span className="who">홍 길 동</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── 04. Heritage Timeline ──────────────────────────────────────── */
function AboutHeritage() {
  return (
    <section className="ab-heritage ab-section" data-screen-label="04 Heritage">
      <div className="wrap">
        <div className="ab-section-head">
          <div className="l">
            <span className="ab-eyebrow">— Heritage / 1987 → Present</span>
            <h2 className="ab-title">
              38년, <em>한 길.</em>
            </h2>
          </div>
          <div className="r">No. 1987 — 2026</div>
        </div>

        <div className="ab-timeline">
          {/* Phase 1 */}
          <div className="ab-tl-step">
            <span className="dot" />
            <div className="yr">
              <em>1987</em> — 2010
            </div>
            <div className="yr-sub">Foundation Era</div>
            <h3>
              나정ETP 창립.
              <br />
              방염복 제조의 기틀.
            </h3>
            <ul>
              <li className="lede">
                1987년 7월 5일, 나정ETP를 설립하며 사무복·작업복·근무복·방염복 제조에
                첫발.
              </li>
              <li>
                <span className="yr-mini">1987</span>
                <span>나정ETP 설립 · 자체 봉제 라인 가동</span>
              </li>
              <li>
                <span className="yr-mini">~2010</span>
                <span>국내 자체 생산 공장 설립 · 다품종 생산 체계 정착</span>
              </li>
            </ul>
            <div className="client-strip">
              <span>금호건설</span>
              <span>한국크로락스</span>
              <span>애경산업</span>
              <span>보령메디앙</span>
              <span>롯데쇼핑</span>
            </div>
          </div>

          {/* Phase 2 */}
          <div className="ab-tl-step">
            <span className="dot" />
            <div className="yr">2010 — 2020</div>
            <div className="yr-sub">Specialization Era</div>
            <h3>
              방염복으로의 집중.
              <br />
              한전 협력사 진입.
            </h3>
            <ul>
              <li className="lede">
                방염 제품군에 본격적으로 집중하며 한전 협력업체로 등록, 전국구로 확장.
              </li>
              <li>
                <span className="yr-mini">2010s</span>
                <span>방염복 제품 분야 본격 확장 · R&amp;D 강화</span>
              </li>
              <li>
                <span className="yr-mini">2017</span>
                <span>나정ETP 창립 30주년 · 자체 홈페이지 오픈</span>
              </li>
              <li>
                <span className="yr-mini">2018+</span>
                <span>한전 협력업체 방염복 제작 · 전국구 공급망 확립</span>
              </li>
            </ul>
          </div>

          {/* Phase 3 (current) */}
          <div className="ab-tl-step current">
            <span className="dot" />
            <div className="yr">
              2021 — <em>현재</em>
            </div>
            <div className="yr-sub">Expansion Era</div>
            <h3>
              대기업 협력 확장.
              <br />
              국제 인증 가속.
            </h3>
            <ul>
              <li className="lede">서울 신내동으로 본사 확장 이전, 대형 산업군과의 계약 본격화.</li>
              <li>
                <span className="yr-mini">2021</span>
                <span>본사 확장 이전 (서울시 신내동)</span>
              </li>
              <li>
                <span className="yr-mini">2021+</span>
                <span>SK 계열사 · LG 계열사 등 다양한 산업군 계약 확대</span>
              </li>
              <li>
                <span className="yr-mini">2025</span>
                <span>아크 플래시 시험 완료 · NFPA 2112 UL 인증 진행 중</span>
              </li>
              <li>
                <span className="yr-mini">2026</span>
                <span>브랜드 리뉴얼 · NJ SAFETY 디지털 플랫폼 출시</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── 05. Core Values ────────────────────────────────────────────── */
function AboutValues() {
  // Icon SVGs are inlined to keep the markup self-contained — they're
  // tiny enough that a separate sprite isn't worth the indirection.
  const VALUES = [
    {
      n: '01 / 05',
      en: 'INNOVATION',
      ko: '혁신 · 소재 / 디자인',
      body: '아라미드 기반의 고기능 원단을 자체 개발하고, 산업별 작업 환경 데이터를 패턴·부자재에 반영해 끊임없이 다시 설계합니다.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v18M3 12h18" />
        </svg>
      ),
    },
    {
      n: '02 / 05',
      en: 'QUALITY',
      ko: '품질 · 인증 / 시험',
      body: '모든 원단 로트와 완제품은 자체 시험과 제3자 시험기관 검증을 거칩니다. NFPA 2112, HRC2, ARC Flash 시험 결과로 입증합니다.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M9 12l2 2 4-4" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      ),
    },
    {
      n: '03 / 05',
      en: 'SAFETY',
      ko: '안전 · 작업자 우선',
      body: '옷의 멋이 아니라 사람의 생명이 기준입니다. 모든 설계 결정은 "작업자 보호가 더 강해지는가"라는 한 질문 앞에서 검증됩니다.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 2 4 5v7c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3Z" />
        </svg>
      ),
    },
    {
      n: '04 / 05',
      en: 'TRUST',
      ko: '신뢰 · 38년 한 분야',
      body: '유행을 따르지 않습니다. 1987년부터 같은 자리, 같은 일에 집중해온 시간이 한전·SK·LG 계열 산업 현장의 신뢰가 되었습니다.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 11l-3 3-2-2" />
        </svg>
      ),
    },
    {
      n: '05 / 05',
      en: 'EXPERTISE',
      ko: '전문성 · 단일 카테고리 집중',
      body: '다른 분야로 손을 뻗지 않았습니다. 방염 산업안전복 — 단 하나의 카테고리에 모든 자원과 시간을 투입했습니다.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      ),
    },
  ];
  return (
    <section className="ab-values ab-section" data-screen-label="05 Values">
      <div className="wrap">
        <div className="ab-section-head">
          <div className="l">
            <span className="ab-eyebrow">— Core Values / 5 Principles</span>
            <h2 className="ab-title">
              한 분야를 38년간 지켜온
              <br />
              <em>다섯 가지 기준.</em>
            </h2>
          </div>
          <div className="r">Innovation · Quality · Safety · Trust · Expertise</div>
        </div>

        <div className="ab-values-grid">
          {VALUES.map((v) => (
            <div key={v.en} className="ab-value">
              <div className="top">
                <span className="n">{v.n}</span>
                <span className="ic">{v.icon}</span>
              </div>
              <div>
                <h3>{v.en}</h3>
                <div className="ko">{v.ko}</div>
              </div>
              <p>{v.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 06. One-Stop System ────────────────────────────────────────── */
function AboutOneStop() {
  const STEPS = [
    {
      n: 'STEP 01',
      ko: '방염 원단 개발',
      en: 'Fabric R&D',
      body: '아라미드 혼방 비율, 정전기 방지사 함량, 메쉬 통기 구조까지 — 원단 단계에서부터 설계에 개입합니다.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 6h18M3 12h18M3 18h18" strokeDasharray="2 3" />
        </svg>
      ),
    },
    {
      n: 'STEP 02',
      ko: '패턴·디자인',
      en: 'Pattern & Design',
      body: '현장에서 수집한 작업 동작 데이터를 패턴·부자재 배치에 직접 반영합니다. 본사 디자인팀이 모든 시즌을 책임집니다.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 2 4 7v10l8 5 8-5V7l-8-5Z" />
          <path d="M12 12 4 7" />
          <path d="m12 12 8-5" />
          <path d="M12 12v10" />
        </svg>
      ),
    },
    {
      n: 'STEP 03',
      ko: '국내 자체 생산',
      en: 'In-House Production',
      body: '국내 자체 생산 공장에서 봉제·검수까지. 외주에 의존하지 않기에 일관된 품질과 빠른 피드백이 가능합니다.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="4" width="18" height="16" rx="1" />
          <path d="M3 10h18M9 14h6" />
        </svg>
      ),
    },
    {
      n: 'STEP 04',
      ko: 'QC · 출하 · A/S',
      en: 'QC · Ship · A/S',
      body: '출하 전 자체 QC와 시험성적서 확인. 출하 이후에도 A/S 서비스를 통한 철저한 사후 관리가 이어집니다.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 9l9-5 9 5v6l-9 5-9-5z" />
          <path d="M3 9l9 5 9-5" />
          <path d="M12 14v6" />
        </svg>
      ),
    },
  ];
  return (
    <section className="ab-onestop ab-section" data-screen-label="06 One-stop">
      <div className="wrap">
        <div className="ab-section-head">
          <div className="l">
            <span className="ab-eyebrow">— One-Stop System / Fabric → Field</span>
            <h2 className="ab-title">
              원단부터 출하까지,
              <br />
              <em>한 지붕 아래.</em>
            </h2>
          </div>
          <div className="r">4 Stages · In-House Managed</div>
        </div>

        <div className="ab-onestop-grid">
          {STEPS.map((s) => (
            <div key={s.n} className="ab-step">
              <div className="icon">{s.icon}</div>
              <span className="n">{s.n}</span>
              <h4>{s.ko}</h4>
              <span className="en">{s.en}</span>
              <p>{s.body}</p>
            </div>
          ))}
        </div>

        <div className="ab-onestop-foot">
          <p className="quote">
            전 단계를 본사가 직접 관리하기 때문에, <em>피드백은 빠르고 품질은 일관됩니다.</em>
          </p>
          <span className="badge">In-house · Korea</span>
        </div>
      </div>
    </section>
  );
}

/* ─── 07. Industries Served ──────────────────────────────────────── */
function AboutIndustries() {
  const INDS = [
    {
      n: '01 · POWER',
      ko: '전력 · 발전',
      en: 'Power Generation',
      body: '한전 협력업체 · 발전사 공급. 송배전 · 발전 설비 점검 현장의 방염 작업복.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
        </svg>
      ),
    },
    {
      n: '02 · ELECTRIC',
      ko: '전기 공사',
      en: 'Electrical Works',
      body: '고압 송전선로 · 활선 작업 등 아크 플래시 위험이 상존하는 전기 공사 전문 보호복.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M5 4v16M19 4v16M3 8h4M17 8h4M3 16h4M17 16h4M5 12c5 0 9 0 14 0" />
        </svg>
      ),
    },
    {
      n: '03 · PETROCHEM',
      ko: '정유 · 석유화학',
      en: 'Refinery & Petrochem',
      body: '여수·울산 단지의 정기 보수 · 안전 점검. 정전기 방지와 통기성을 동시에 갖춘 라인.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3v18M5 5l14 14M19 5L5 19" />
        </svg>
      ),
    },
    {
      n: '04 · ENERGY',
      ko: '에너지 · 가스',
      en: 'Energy & Gas',
      body: '가스 공사 · 발전 플랜트 · 신재생 에너지 인프라 현장의 고위험 보호복 솔루션.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M12 2c0 6-6 8-6 14a6 6 0 0 0 12 0c0-6-6-8-6-14z" />
        </svg>
      ),
    },
  ];
  return (
    <section className="ab-industries ab-section" data-screen-label="07 Industries">
      <div className="wrap">
        <div className="ab-section-head">
          <div className="l">
            <span className="ab-eyebrow">— Industries Served</span>
            <h2 className="ab-title">
              네 가지 핵심 산업,
              <br />
              <em>가장 위험한 현장.</em>
            </h2>
          </div>
          <div className="r">Power · Electric · Petrochem · Energy</div>
        </div>

        <div className="ab-industries-grid">
          {INDS.map((i) => (
            <div key={i.n} className="ab-ind">
              <span className="n">{i.n}</span>
              <div>
                <h3>{i.ko}</h3>
                <div className="en">{i.en}</div>
              </div>
              <p>{i.body}</p>
              <div className="icon" aria-hidden>{i.icon}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 08. Recent Certification Milestones ────────────────────────── */
function AboutRecent() {
  const ROWS = [
    {
      y: '2025',
      title: '아크 플래시 (Arc Flash) 시험 완료',
      body: '전기 작업복 ATPV 등급 시험을 정식 인증기관에서 완료. 시험 성적서 발급 보유.',
      status: '완료',
      done: true,
    },
    {
      y: '2025',
      title: 'NFPA 2112 UL 인증 진행',
      body: '북미 플래시 화재 보호 표준 — UL 정식 인증 절차 진행 중. 2026년 내 취득 목표.',
      status: '진행중',
      done: false,
    },
    {
      y: '2026',
      title: '국제 인증 다수 추가 진행',
      body: 'EN ISO 11612, HRC Level 2, IEC 61482 등 글로벌 인증 체계 확대 추진.',
      status: '진행중',
      done: false,
    },
  ];
  return (
    <section className="ab-recent ab-section" data-screen-label="08 Recent">
      <div className="wrap">
        <div className="ab-recent-grid">
          <div className="ab-recent-l">
            <span className="ab-eyebrow">— Certifications / 2025 — 2026</span>
            <h2>
              최근 인증 <em>진행 현황.</em>
            </h2>
            <p>
              2025년부터 글로벌 인증 체계를 본격 확대하고 있습니다. 아크 플래시 시험을
              완료했고, NFPA 2112 UL 인증을 비롯한 다수의 국제 인증을 진행 중입니다.
            </p>
          </div>
          <div className="ab-recent-r">
            {ROWS.map((r) => (
              <div key={r.title} className="ab-cert-row">
                <span className="y">{r.y}</span>
                <div className="body">
                  <h4>{r.title}</h4>
                  <p>{r.body}</p>
                </div>
                <span className={`status ${r.done ? 'done' : 'ongoing'}`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── 09. CTA ────────────────────────────────────────────────────── */
function AboutCta({ locale }: { locale: Locale }) {
  return (
    <section className="ab-cta" data-screen-label="09 CTA">
      <div className="wrap">
        <span className="ab-eyebrow">— Partner with NJ Safety</span>
        <h2>
          현장에 가장 가까운 방염 파트너,
          <br />
          <em>NJ SAFETY와 시작하세요.</em>
        </h2>
        <p>Custom quote · Material consultation · Sample request</p>
        <div className="ab-cta-actions">
          <Link href={`/${locale}/contact`} className="ab-btn ab-btn-primary">
            견적 문의하기 →
          </Link>
          <Link href={`/${locale}/products`} className="ab-btn ab-btn-ghost">
            제품 라인업 보기 →
          </Link>
        </div>
      </div>
    </section>
  );
}
