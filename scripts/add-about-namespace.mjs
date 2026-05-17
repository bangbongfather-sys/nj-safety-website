// One-shot migration: add the `about` namespace to ko.json + en.json
// with the same copy currently hardcoded in components/sections/about/AboutPage.tsx.
// Re-running is safe — it overwrites the existing `about` block.
//
//   node scripts/add-about-namespace.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const about = {
  meta: {
    title: '회사소개 — NJ SAFETY',
    description:
      '1987년 나정ETP로 시작해 2025년 현재, 38년간 산업안전복 한 분야에 집중해온 나정엔터프라이즈. 원단 개발부터 출하까지 원스톱으로 책임집니다.',
  },
  hero: {
    eyebrow: 'About · 회사소개',
    yearNum: '38',
    yearLabelK: 'Years of',
    yearLabelV: 'Industrial Safety',
    titleLine1Pre: '방염, ',
    titleLine1Em: '한 길.',
    titleLine2: '나정엔터프라이즈.',
    sub: '1987년 나정ETP로 시작해 38년간 방염 산업안전복 한 분야에만 집중해 왔습니다. 원단 개발부터 디자인·생산·출하까지 — 모든 단계를 책임지는 원스톱 시스템으로 산업 현장의 가장 가까운 곳에서 작업자를 지킵니다.',
    asideTag: '— Brand Mission',
    asidePullPre: '우리는 작업복을 만들지 않습니다.',
    asidePullEm: '생명을 지키는 보호 시스템',
    asidePullPost: '을 설계합니다.',
    corpName: 'NAJUNG ENTERPRISE CO., LTD.',
    corpEst: 'EST. 1987',
  },
  stats: [
    { lbl: '— Heritage', num: '38', unit: 'YEARS', desc: '1987년 창립 이래 방염 산업안전복 단일 카테고리에 집중해온 시간.' },
    { lbl: '— Coverage', num: '4',  unit: '대 산업', desc: '전력·발전 / 전기공사 / 정유·석유화학 / 에너지·가스 현장에 공급.' },
    { lbl: '— Process',  num: '4',  unit: '단계 ONE-STOP', desc: '원단 개발 → 디자인 → 생산 → 출하까지 본사 직접 관리.' },
    { lbl: '— Trust',    num: '∞',  unit: '', desc: '한전 협력사 · SK 계열 · LG 계열 등 산업 리더의 선택.' },
  ],
  ceo: {
    eyebrow: '— CEO Message',
    titleLine1: '산업 현장이 선택한,',
    titleLine2Em: '방염의 가장 가까운 파트너.',
    paragraph1: '1987년, 단 한 가지 신념으로 시작했습니다. 산업 현장에서 일하는 사람의 안전은 결코 타협의 대상이 될 수 없다는 것. 38년이 지난 지금도 그 신념은 변하지 않았습니다.',
    paragraph2: '그동안 우리는 방염 작업복 한 분야에 집중하며 원단부터 봉제, 인증, 사후 관리까지 모든 단계를 직접 다뤄왔습니다. 한전 협력사, SK 계열, LG 계열을 비롯한 국내 주요 산업 현장이 NJ SAFETY를 선택한 이유 — 그것은 우리가 만든 옷이 좋아서가 아니라, 작업자를 지키는 일에 한 번도 한눈팔지 않았기 때문입니다.',
    paragraph3: '앞으로도 우리는 가장 가까운 곳에서, 가장 확실한 방식으로 산업 현장을 지키겠습니다.',
    badge: 'CEO · 대표 인사말',
    stamp: '2026 / SEOUL',
    portraitPlaceholder: '[ PORTRAIT · 대표이사 ]',
    signoffTitle: '대표이사',
    signoffName: '홍 길 동',
    portraitImage: '',
  },
  heritage: {
    eyebrow: '— Heritage / 1987 → Present',
    titlePre: '38년, ',
    titleEm: '한 길.',
    no: 'No. 1987 — 2026',
    phases: [
      {
        yearPre: '',
        yearEm: '1987',
        yearPost: ' — 2010',
        yearSub: 'Foundation Era',
        h3Line1: '나정ETP 창립.',
        h3Line2: '방염복 제조의 기틀.',
        lede: '1987년 7월 5일, 나정ETP를 설립하며 사무복·작업복·근무복·방염복 제조에 첫발.',
        items: [
          { y: '1987', t: '나정ETP 설립 · 자체 봉제 라인 가동' },
          { y: '~2010', t: '국내 자체 생산 공장 설립 · 다품종 생산 체계 정착' },
        ],
        clients: ['금호건설', '한국크로락스', '애경산업', '보령메디앙', '롯데쇼핑'],
        current: false,
      },
      {
        yearPre: '2010 — 2020',
        yearEm: '',
        yearPost: '',
        yearSub: 'Specialization Era',
        h3Line1: '방염복으로의 집중.',
        h3Line2: '한전 협력사 진입.',
        lede: '방염 제품군에 본격적으로 집중하며 한전 협력업체로 등록, 전국구로 확장.',
        items: [
          { y: '2010s', t: '방염복 제품 분야 본격 확장 · R&D 강화' },
          { y: '2017', t: '나정ETP 창립 30주년 · 자체 홈페이지 오픈' },
          { y: '2018+', t: '한전 협력업체 방염복 제작 · 전국구 공급망 확립' },
        ],
        clients: [],
        current: false,
      },
      {
        yearPre: '2021 — ',
        yearEm: '현재',
        yearPost: '',
        yearSub: 'Expansion Era',
        h3Line1: '대기업 협력 확장.',
        h3Line2: '국제 인증 가속.',
        lede: '서울 신내동으로 본사 확장 이전, 대형 산업군과의 계약 본격화.',
        items: [
          { y: '2021', t: '본사 확장 이전 (서울시 신내동)' },
          { y: '2021+', t: 'SK 계열사 · LG 계열사 등 다양한 산업군 계약 확대' },
          { y: '2025', t: '아크 플래시 시험 완료 · NFPA 2112 UL 인증 진행 중' },
          { y: '2026', t: '브랜드 리뉴얼 · NJ SAFETY 디지털 플랫폼 출시' },
        ],
        clients: [],
        current: true,
      },
    ],
  },
  values: {
    eyebrow: '— Core Values / 5 Principles',
    titleLine1: '한 분야를 38년간 지켜온',
    titleLine2Em: '다섯 가지 기준.',
    rMicro: 'Innovation · Quality · Safety · Trust · Expertise',
    items: [
      { n: '01 / 05', en: 'INNOVATION', ko: '혁신 · 소재 / 디자인', body: '아라미드 기반의 고기능 원단을 자체 개발하고, 산업별 작업 환경 데이터를 패턴·부자재에 반영해 끊임없이 다시 설계합니다.' },
      { n: '02 / 05', en: 'QUALITY',    ko: '품질 · 인증 / 시험',  body: '모든 원단 로트와 완제품은 자체 시험과 제3자 시험기관 검증을 거칩니다. NFPA 2112, HRC2, ARC Flash 시험 결과로 입증합니다.' },
      { n: '03 / 05', en: 'SAFETY',     ko: '안전 · 작업자 우선', body: '옷의 멋이 아니라 사람의 생명이 기준입니다. 모든 설계 결정은 "작업자 보호가 더 강해지는가"라는 한 질문 앞에서 검증됩니다.' },
      { n: '04 / 05', en: 'TRUST',      ko: '신뢰 · 38년 한 분야', body: '유행을 따르지 않습니다. 1987년부터 같은 자리, 같은 일에 집중해온 시간이 한전·SK·LG 계열 산업 현장의 신뢰가 되었습니다.' },
      { n: '05 / 05', en: 'EXPERTISE',  ko: '전문성 · 단일 카테고리 집중', body: '다른 분야로 손을 뻗지 않았습니다. 방염 산업안전복 — 단 하나의 카테고리에 모든 자원과 시간을 투입했습니다.' },
    ],
  },
  oneStop: {
    eyebrow: '— One-Stop System / Fabric → Field',
    titleLine1: '원단부터 출하까지,',
    titleLine2Em: '한 지붕 아래.',
    rMicro: '4 Stages · In-House Managed',
    steps: [
      { n: 'STEP 01', ko: '방염 원단 개발', en: 'Fabric R&D',          body: '아라미드 혼방 비율, 정전기 방지사 함량, 메쉬 통기 구조까지 — 원단 단계에서부터 설계에 개입합니다.' },
      { n: 'STEP 02', ko: '패턴·디자인',    en: 'Pattern & Design',    body: '현장에서 수집한 작업 동작 데이터를 패턴·부자재 배치에 직접 반영합니다. 본사 디자인팀이 모든 시즌을 책임집니다.' },
      { n: 'STEP 03', ko: '국내 자체 생산', en: 'In-House Production', body: '국내 자체 생산 공장에서 봉제·검수까지. 외주에 의존하지 않기에 일관된 품질과 빠른 피드백이 가능합니다.' },
      { n: 'STEP 04', ko: 'QC · 출하 · A/S', en: 'QC · Ship · A/S',     body: '출하 전 자체 QC와 시험성적서 확인. 출하 이후에도 A/S 서비스를 통한 철저한 사후 관리가 이어집니다.' },
    ],
    footQuotePre: '전 단계를 본사가 직접 관리하기 때문에, ',
    footQuoteEm: '피드백은 빠르고 품질은 일관됩니다.',
    footBadge: 'In-house · Korea',
  },
  industries: {
    eyebrow: '— Industries Served',
    titleLine1: '네 가지 핵심 산업,',
    titleLine2Em: '가장 위험한 현장.',
    rMicro: 'Power · Electric · Petrochem · Energy',
    items: [
      { n: '01 · POWER',     ko: '전력 · 발전',      en: 'Power Generation',     body: '한전 협력업체 · 발전사 공급. 송배전 · 발전 설비 점검 현장의 방염 작업복.' },
      { n: '02 · ELECTRIC',  ko: '전기 공사',        en: 'Electrical Works',     body: '고압 송전선로 · 활선 작업 등 아크 플래시 위험이 상존하는 전기 공사 전문 보호복.' },
      { n: '03 · PETROCHEM', ko: '정유 · 석유화학', en: 'Refinery & Petrochem', body: '여수·울산 단지의 정기 보수 · 안전 점검. 정전기 방지와 통기성을 동시에 갖춘 라인.' },
      { n: '04 · ENERGY',    ko: '에너지 · 가스',   en: 'Energy & Gas',         body: '가스 공사 · 발전 플랜트 · 신재생 에너지 인프라 현장의 고위험 보호복 솔루션.' },
    ],
  },
  recent: {
    eyebrow: '— Certifications / 2025 — 2026',
    titlePre: '최근 인증 ',
    titleEm: '진행 현황.',
    body: '2025년부터 글로벌 인증 체계를 본격 확대하고 있습니다. 아크 플래시 시험을 완료했고, NFPA 2112 UL 인증을 비롯한 다수의 국제 인증을 진행 중입니다.',
    rows: [
      { y: '2025', title: '아크 플래시 (Arc Flash) 시험 완료', body: '전기 작업복 ATPV 등급 시험을 정식 인증기관에서 완료. 시험 성적서 발급 보유.', status: '완료',   done: true },
      { y: '2025', title: 'NFPA 2112 UL 인증 진행',           body: '북미 플래시 화재 보호 표준 — UL 정식 인증 절차 진행 중. 2026년 내 취득 목표.',          status: '진행중', done: false },
      { y: '2026', title: '국제 인증 다수 추가 진행',          body: 'EN ISO 11612, HRC Level 2, IEC 61482 등 글로벌 인증 체계 확대 추진.',                 status: '진행중', done: false },
    ],
  },
  cta: {
    eyebrow: '— Partner with NJ Safety',
    titleLine1: '현장에 가장 가까운 방염 파트너,',
    titleLine2Em: 'NJ SAFETY와 시작하세요.',
    sub: 'Custom quote · Material consultation · Sample request',
    btnPrimary: '견적 문의하기 →',
    btnSecondary: '제품 라인업 보기 →',
  },
};

for (const path of ['locales/ko.json', 'locales/en.json']) {
  const full = resolve(path);
  const json = JSON.parse(readFileSync(full, 'utf8'));
  // Mutate in place — JSON.stringify with 2-space indent keeps the diff clean.
  json.about = JSON.parse(JSON.stringify(about));
  writeFileSync(full, JSON.stringify(json, null, 2) + '\n');
  console.log(`wrote ${path}`);
}
