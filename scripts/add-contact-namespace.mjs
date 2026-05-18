// One-shot migration: add the `contact` namespace to ko.json + en.json
// with the same copy that was hardcoded in
// components/sections/contact/ContactPage.tsx. Safe to re-run.
//
//   node scripts/add-contact-namespace.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const contact = {
  meta: {
    title: '문의 — NJ SAFETY',
    description:
      '견적·B2B 단체 주문·OEM 제작·인증서 요청·A/S 등 NJ SAFETY 전문가에게 직접 문의하세요. 1영업일 내 회신.',
  },
  hero: {
    eyebrow: 'Contact · 문의',
    titleLine1: '현장에 맞는 방염 솔루션,',
    titleLine2Pre: '',
    titleLine2Em: '전문가 상담',
    titleLine2Post: '으로 시작하세요.',
    sub:
      '제품 견적부터 B2B 단체 주문, OEM 제작, 인증서 발급까지 — NJ SAFETY 전문가가 1영업일 이내 직접 회신해 드립니다.',
    metrics: [
      { lbl: '— Response',  num: '1', unit: '영업일',       desc: '평균 회신 시간 (B2B 우선 처리)' },
      { lbl: '— MOQ',       num: '50', unit: '벌부터',      desc: '단체 견적 최소 수량 · 5% 추가 할인' },
      { lbl: '— Lead Time', num: '3', unit: '–6주',         desc: '평균 납기 · 양산 기준' },
    ],
  },
  types: {
    eyebrow: '— Inquiry Types / 5 Categories',
    titlePre: '먼저, ',
    titleEm: '어떤 문의',
    titlePost: '인지 알려주세요.',
    r: 'Step 01 of 02',
    items: [
      // type key is fixed (used by the form's hidden field); ko/en/body editable.
      { type: 'quote', ko: '제품·견적 문의',    en: 'Product & Quote',       body: '아라미드 시즌 제품의 가격·재고·납기 관련 일반 견적 문의.' },
      { type: 'b2b',   ko: 'B2B 단체 주문',     en: 'Bulk Order',            body: '50벌 이상 단체 주문 · 5% 추가 할인 · 전담 매니저 응대.' },
      { type: 'oem',   ko: 'OEM·ODM 제작',     en: 'Custom Manufacturing',  body: '자체 패턴·자수·로고 작업. 원단부터 봉제까지 본사 직접 제작.' },
      { type: 'cert',  ko: '인증서·시험성적서', en: 'Certification Docs',    body: 'NFPA 2112 UL 인증, ARC 시험성적서, 혼용률 시험 자료 요청.' },
      { type: 'as',    ko: 'A/S·교환·반품',    en: 'After-sales',           body: '사용 중 발생한 하자·사이즈 교환·수선 등의 사후 관리.' },
    ],
    selectLabel: '선택 →',
    selectedLabel: '선택됨 ✓',
  },
  form: {
    sectionEyebrow: '— Inquiry Form / Step 02',
    sectionTitlePre: '담당자 정보를 ',
    sectionTitleEm: '알려주세요.',
    sectionR: '* 표시는 필수',
    title: '문의 양식',
    labels: {
      company:        '회사명',
      industry:       '산업군',
      contactName:    '담당자명',
      position:       '직책',
      phone:          '연락처',
      email:          '이메일',
      quantityRange:  '예상 수량',
      deliveryDate:   '희망 납기',
      message:        '문의 내용',
      fileAttach:     '파일 첨부',
    },
    placeholders: {
      company:        '예) 한국전력 협력업체 ○○○',
      contactName:    '이름',
      position:       '예) 안전관리팀장',
      phone:          '010-0000-0000',
      email:          'name@company.co.kr',
      deliveryDate:   '예) 2026년 7월 말 / 정기 공급',
      message:
        '예) 한전 협력업체용 아라미드 하계 시즌 200벌, 자수 작업 포함 견적 문의드립니다. 사이즈 분포는 추후 공유 가능합니다.',
    },
    fileHintMini: '(시방서·로고·사이즈표 등)',
    fileHintTitle: '최대 5개 파일까지',
    fileHintBody: 'PDF · JPG · PNG · AI · ZIP / 각 20MB 이하',
    fileSelectLabel: '파일 선택',
    agreePre: '',
    agreeLink: '개인정보 수집·이용 약관',
    agreePost: '에 동의합니다.',
    agreeFine:
      '수집 항목: 회사명·담당자명·연락처·이메일 / 보유 기간: 문의 처리 후 6개월 / 이용 목적: 문의 응대 및 견적 발송',
    submitNote: '— 1영업일 이내 회신 드립니다',
    submitButton: '문의 제출하기',
    submitting: '전송 중...',
    toastOk: '✓ 문의가 접수되었습니다. 1영업일 이내 회신 드립니다.',
  },
  sidebar: {
    directLabel: '— Direct Line / B2B 전담',
    tel: '02-777-3079',
    hoursLine1: '평일 09:00 – 18:00 KST',
    hoursLine2: '점심 12:30 – 13:30 · 주말 휴무',
    otherLabel: '— Other Channels',
    rows: [
      { key: 'Email', value: 'njsafety91@naver.com',     href: 'mailto:njsafety91@naver.com' },
      { key: 'Fax',   value: '02-774-1841',              href: '' },
      { key: 'Web',   value: 'www.njfashion.co.kr',      href: 'https://www.njfashion.co.kr' },
    ],
    actions: [
      { ko: '카탈로그 PDF',   href: '#catalog' },
      { ko: '카카오톡 채널', href: '#kakao' },
    ],
    reassurePre: '',
    reassureEm: '평균 회신 1영업일',
    reassurePost: ' — 대형 견적·OEM은 2~3일 소요',
  },
  process: {
    eyebrow: '— How It Works / 4 Steps',
    titleLine1: '문의에서 납품까지,',
    titleLine2Em: '네 단계 프로세스.',
    r: 'Avg. 3 – 6 weeks total',
    steps: [
      { n: 'STEP 01', ko: '문의 접수',       en: 'Inquiry Received',     body: '온라인 폼·전화·이메일로 접수된 문의를 영업팀이 분류·전담 매니저 배정합니다.', eta: '— Day 1 (1영업일 내)' },
      { n: 'STEP 02', ko: '요구사항 확인',  en: 'Consultation',         body: '전화·메일로 수량·사양·납기·인증 요구사항을 구체화합니다. 필요시 샘플 발송.', eta: '— Day 2 – 3' },
      { n: 'STEP 03', ko: '견적서 발송',    en: 'Quotation',            body: '정식 견적서 + 시험성적서/인증서 패키지를 PDF로 발송. 수정 1회 무료.',            eta: '— Day 3 – 5' },
      { n: 'STEP 04', ko: '계약·생산·납품', en: 'Production & Delivery', body: '계약 체결 후 본사 자체 생산 라인에서 봉제·QC·출하. 정기 공급 협의 가능.',         eta: '— 3 – 6주 (양산 기준)' },
    ],
  },
  faq: {
    eyebrow: '— FAQ / 자주 묻는 질문',
    titlePre: '문의 전, ',
    titleEm: '이것부터.',
    r: '8 Questions',
    // Answers are stored as HTML so EditableText can preserve <b> highlights.
    items: [
      { q: '최소 주문 수량(MOQ)은 어떻게 되나요?',
        a: '기성 제품은 <b>1벌부터 주문 가능</b>합니다. 단체 견적(5% 추가 할인)은 <b>50벌부터</b>, OEM 제작(자수·자체 패턴)은 <b>100벌부터</b> 진행합니다. 정기 공급 계약은 별도 협의.' },
      { q: '견적은 어떻게 산정되나요?',
        a: '제품·수량·사이즈 분포·자수/로고 옵션·인증서 요구사항을 기준으로 산정됩니다. 정식 견적서 발송까지 평균 <b>3~5영업일</b> 소요되며, <b>견적서 1회 무료 수정</b>이 포함됩니다.' },
      { q: '평균 납기는 얼마나 걸리나요?',
        a: '기성 재고 보유 사이즈는 <b>출고일 기준 5~7영업일</b>, 신규 양산은 <b>3~6주</b>, OEM 제작은 <b>6~10주</b>입니다. 급한 일정은 사전 협의 시 단축 가능합니다.' },
      { q: 'OEM 자수·로고 작업도 가능한가요?',
        a: '가능합니다. <b>자수·전사·실크프린팅</b> 모두 지원하며, 회사 로고·이름·소속 부서 단위 가공이 가능합니다. AI 또는 고해상도 PNG 파일을 첨부해 주시면 디자인팀이 검토 후 시안을 회신해 드립니다.' },
      { q: '시험성적서·인증서를 받을 수 있나요?',
        a: '제품별 <b>혼용률 시험성적서·방염 시험성적서·ARC 시험성적서</b>를 PDF로 발송해 드립니다. NFPA 2112 UL 인증은 2026년 내 취득 예정이며, 진행 단계별 자료 공유 가능합니다.' },
      { q: '결제 조건은 어떻게 되나요?',
        a: '기성 제품은 <b>발주 시 100% 선결제</b>, OEM·단체 견적은 <b>계약금 30% / 출고 시 70%</b> 분할 가능. 정기 공급 계약은 월별 정산 협의 가능합니다. 세금계산서 발행.' },
      { q: 'A/S 기간과 처리 방식은?',
        a: '제조상 하자는 <b>출고일 기준 1년</b> 무상 교환·수선. 사용 중 발생한 마모·수선 요청은 별도 견적. 사이즈 교환은 출고 후 <b>14일 이내</b>, 미사용 상태일 때만 가능합니다.' },
      { q: '해외 배송·수출이 가능한가요?',
        a: '가능합니다. <b>EXW / FOB / CIF 조건</b>으로 진행하며, 통관·관세·검역 자료는 지원해 드립니다. 영어 시험성적서·인증서 발급 가능 (NFPA 2112 UL 인증 후 영문 ATPV 라벨 부착).' },
    ],
  },
  visit: {
    eyebrow: '— Visit / 오시는 길',
    titleLine1: '현장 미팅·샘플 확인,',
    titleLine2Pre: '',
    titleLine2Em: '직접 방문',
    titleLine2Post: '도 환영합니다.',
    r: 'By appointment',
    addr: {
      ko: '서울특별시 중랑구 신내동',
      en: 'Sinnae-dong, Jungnang-gu, Seoul, KR',
      zip: '우편번호 02075 (가상)',
    },
    rows: [
      { key: 'Subway',  v: '지하철 6호선 신내역 도보 8분',           sub: '경춘선 신내역 2번 출구 도보 약 600m' },
      { key: 'Bus',     v: '간선 202, 240 / 지선 2227',               sub: '신내역.중랑구청 정류장 하차' },
      { key: 'Parking', v: '건물 지하 주차장 2시간 무료',              sub: '방문 미팅 사전 등록 시 적용' },
      { key: 'Visit',   v: '평일 09:00 – 18:00 / 사전 예약 필수',      sub: '샘플 확인·미팅은 02-777-3079로 사전 연락' },
    ],
    mapBadge: 'NJ HQ',
    mapStamp: '37.61° N / 127.10° E',
    mapPinLabel: 'NJ SAFETY HQ',
    mapActions: [
      { ko: '카카오맵 →',   href: '#kakaomap' },
      { ko: '네이버지도 →', href: '#navermap' },
      { ko: '길찾기 →',     href: '#directions' },
    ],
  },
};

for (const path of ['locales/ko.json', 'locales/en.json']) {
  const full = resolve(path);
  const json = JSON.parse(readFileSync(full, 'utf8'));
  json.contact = JSON.parse(JSON.stringify(contact));
  writeFileSync(full, JSON.stringify(json, null, 2) + '\n');
  console.log(`wrote ${path}`);
}
