'use client';

/**
 * /ko/contact — 문의 페이지.
 *
 * 6-section flow per design_handoff_contact_page:
 *   01. Hero            — slogan + 3 metric tiles (response / MOQ / lead time)
 *   02. Inquiry Types   — 5 cards, click to prefill the form's hidden type
 *   03. Form            — main inquiry form + sticky sidebar
 *   04. Process         — 4-step workflow from inquiry to delivery
 *   05. FAQ             — 8 accordion items
 *   06. Visit           — address, transit, map placeholder
 *
 * Site nav + footer auto-mounted by app/[locale]/layout.tsx. This
 * component renders only the page body.
 *
 * Form submission posts multipart/form-data to /api/contact, which the
 * Worker handles (uploads attachments to R2, sends email via the
 * verified Cloudflare send_email binding).
 */

import { useRef, useState, type FormEvent } from 'react';
import type { Locale } from '@/lib/i18n';
import './contact.css';

type InquiryType = 'quote' | 'b2b' | 'oem' | 'cert' | 'as';

const TYPE_LABELS: Record<InquiryType, { num: string; ko: string; en: string }> = {
  quote: { num: '01', ko: '제품·견적 문의',     en: 'Product & Quote' },
  b2b:   { num: '02', ko: 'B2B 단체 주문',     en: 'Bulk Order' },
  oem:   { num: '03', ko: 'OEM·ODM 제작',       en: 'Custom Manufacturing' },
  cert:  { num: '04', ko: '인증서·시험성적서', en: 'Certification Docs' },
  as:    { num: '05', ko: 'A/S·교환·반품',     en: 'After-sales' },
};

export default function ContactPage({ locale }: { locale: Locale }) {
  const [activeType, setActiveType] = useState<InquiryType>('quote');

  const onTypeChange = (t: InquiryType) => {
    setActiveType(t);
    // Smooth-scroll to the form after the state lands.
    requestAnimationFrame(() => {
      document.getElementById('form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="contact-page">
      <ContactHero />
      <InquiryTypes active={activeType} onChange={onTypeChange} />
      <ContactForm activeType={activeType} locale={locale} />
      <ContactProcess />
      <ContactFaq />
      <ContactVisit />
    </div>
  );
}

/* ─── 01. Hero ───────────────────────────────────────────────────── */
function ContactHero() {
  return (
    <section className="ct-hero" data-screen-label="01 Hero">
      <div className="wrap">
        <div className="ct-hero-content">
          <div className="ct-hero-l">
            <span className="ct-eyebrow">
              <span className="ct-hairline" /> Contact · 문의
            </span>
            <h1>
              현장에 맞는 방염 솔루션,
              <br />
              <em>전문가 상담</em>으로 시작하세요.
            </h1>
            <p className="ct-hero-sub">
              제품 견적부터 B2B 단체 주문, OEM 제작, 인증서 발급까지 — NJ SAFETY 전문가가
              1영업일 이내 직접 회신해 드립니다.
            </p>
          </div>
          <div className="ct-hero-metrics">
            <div className="ct-hero-metric">
              <span className="lbl">— Response</span>
              <span className="val">1<span>영업일</span></span>
              <span className="desc">평균 회신 시간 (B2B 우선 처리)</span>
            </div>
            <div className="ct-hero-metric">
              <span className="lbl">— MOQ</span>
              <span className="val">50<span>벌부터</span></span>
              <span className="desc">단체 견적 최소 수량 · 5% 추가 할인</span>
            </div>
            <div className="ct-hero-metric">
              <span className="lbl">— Lead Time</span>
              <span className="val">3<span>–6주</span></span>
              <span className="desc">평균 납기 · 양산 기준</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── 02. Inquiry Types ──────────────────────────────────────────── */
const TYPE_CARDS: { type: InquiryType; body: string; icon: React.ReactNode }[] = [
  {
    type: 'quote',
    body: '아라미드 시즌 제품의 가격·재고·납기 관련 일반 견적 문의.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="15" y2="17" />
      </svg>
    ),
  },
  {
    type: 'b2b',
    body: '50벌 이상 단체 주문 · 5% 추가 할인 · 전담 매니저 응대.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 21V8l9-5 9 5v13" />
        <path d="M9 21V12h6v9" />
        <path d="M3 13h18" />
      </svg>
    ),
  },
  {
    type: 'oem',
    body: '자체 패턴·자수·로고 작업. 원단부터 봉제까지 본사 직접 제작.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    type: 'cert',
    body: 'NFPA 2112 UL 인증, ARC 시험성적서, 혼용률 시험 자료 요청.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 2 4 5v7c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    type: 'as',
    body: '사용 중 발생한 하자·사이즈 교환·수선 등의 사후 관리.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
    ),
  },
];

function InquiryTypes({ active, onChange }: { active: InquiryType; onChange: (t: InquiryType) => void }) {
  return (
    <section className="ct-types ct-section" data-screen-label="02 Inquiry Types">
      <div className="wrap">
        <div className="ct-section-head">
          <div className="l">
            <span className="ct-eyebrow">— Inquiry Types / 5 Categories</span>
            <h2 className="ct-title">
              먼저, <em>어떤 문의</em>인지 알려주세요.
            </h2>
          </div>
          <div className="r">Step 01 of 02</div>
        </div>

        <div className="ct-types-grid">
          {TYPE_CARDS.map((c) => {
            const label = TYPE_LABELS[c.type];
            const isActive = c.type === active;
            return (
              <button
                key={c.type}
                type="button"
                className={`ct-type-card${isActive ? ' is-active' : ''}`}
                data-type={c.type}
                onClick={() => onChange(c.type)}
                aria-pressed={isActive}
              >
                <div className="top">
                  <span className="n">{label.num} / 05</span>
                  <span className="icon">{c.icon}</span>
                </div>
                <div>
                  <h3>{label.ko}</h3>
                  <div className="en">{label.en}</div>
                </div>
                <p>{c.body}</p>
                <span className="arr">{isActive ? '선택됨 ✓' : '선택 →'}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── 03. Form + Sidebar ─────────────────────────────────────────── */
type SubmitState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'ok' }
  | { status: 'error'; message: string };

function ContactForm({ activeType, locale }: { activeType: InquiryType; locale: Locale }) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });
  const [fileNames, setFileNames] = useState<string[]>([]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formRef.current) return;
    setSubmit({ status: 'sending' });
    try {
      const fd = new FormData(formRef.current);
      // hidden field – overwrite with the latest activeType so the
      // type the user has selected (not the default) is what arrives.
      fd.set('inquiry_type', activeType);
      const r = await fetch('/api/contact', { method: 'POST', body: fd });
      const payload = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !payload.ok) {
        setSubmit({ status: 'error', message: payload.error || `요청 실패 (${r.status})` });
        return;
      }
      setSubmit({ status: 'ok' });
      formRef.current.reset();
      setFileNames([]);
    } catch (e: unknown) {
      setSubmit({ status: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setFileNames(Array.from(files).map((f) => f.name));
  };

  const selectedLabel = `${TYPE_LABELS[activeType].num} / ${TYPE_LABELS[activeType].ko}`;
  const namesPreview =
    fileNames.length === 0
      ? null
      : fileNames.join(', ').length > 80
        ? fileNames.join(', ').slice(0, 80) + '...'
        : fileNames.join(', ');

  return (
    <section className="ct-form-section ct-section" id="form" data-screen-label="03 Form">
      <div className="wrap">
        <div className="ct-section-head">
          <div className="l">
            <span className="ct-eyebrow">— Inquiry Form / Step 02</span>
            <h2 className="ct-title">
              담당자 정보를 <em>알려주세요.</em>
            </h2>
          </div>
          <div className="r">* 표시는 필수</div>
        </div>

        <div className="ct-form-grid">
          <form ref={formRef} className="ct-form" onSubmit={handleSubmit} noValidate>
            <div className="ct-form-title">
              <h2>문의 양식</h2>
              <span className="selected">{selectedLabel}</span>
            </div>

            <input type="hidden" name="inquiry_type" value={activeType} />

            <div className="ct-form-row">
              <div className="ct-field">
                <label htmlFor="company">회사명 <span className="req">*</span></label>
                <input id="company" name="company" type="text" placeholder="예) 한국전력 협력업체 ○○○" required />
              </div>
              <div className="ct-field">
                <label htmlFor="industry">산업군</label>
                <select id="industry" name="industry" defaultValue="">
                  <option value="">선택해 주세요</option>
                  <option>전력·발전 (Power)</option>
                  <option>전기 공사 (Electrical)</option>
                  <option>정유·석유화학 (Petrochem)</option>
                  <option>에너지·가스 (Energy)</option>
                  <option>건설·플랜트</option>
                  <option>공공기관·군경</option>
                  <option>기타</option>
                </select>
              </div>
            </div>

            <div className="ct-form-row">
              <div className="ct-field">
                <label htmlFor="contact_name">담당자명 <span className="req">*</span></label>
                <input id="contact_name" name="contact_name" type="text" placeholder="이름" required />
              </div>
              <div className="ct-field">
                <label htmlFor="position">직책</label>
                <input id="position" name="position" type="text" placeholder="예) 안전관리팀장" />
              </div>
            </div>

            <div className="ct-form-row">
              <div className="ct-field">
                <label htmlFor="phone">연락처 <span className="req">*</span></label>
                <input id="phone" name="phone" type="tel" placeholder="010-0000-0000" required />
              </div>
              <div className="ct-field">
                <label htmlFor="email">이메일 <span className="req">*</span></label>
                <input id="email" name="email" type="email" placeholder="name@company.co.kr" required />
              </div>
            </div>

            <div className="ct-form-row">
              <div className="ct-field">
                <label htmlFor="quantity_range">예상 수량</label>
                <select id="quantity_range" name="quantity_range" defaultValue="">
                  <option value="">선택해 주세요</option>
                  <option>1~49 벌 (소량)</option>
                  <option>50~199 벌</option>
                  <option>200~499 벌</option>
                  <option>500~999 벌</option>
                  <option>1,000 벌 이상</option>
                  <option>미정</option>
                </select>
              </div>
              <div className="ct-field">
                <label htmlFor="delivery_date">희망 납기</label>
                <input id="delivery_date" name="delivery_date" type="text" placeholder="예) 2026년 7월 말 / 정기 공급" />
              </div>
            </div>

            <div className="ct-form-row full">
              <div className="ct-field">
                <label htmlFor="message">문의 내용 <span className="req">*</span></label>
                <textarea
                  id="message"
                  name="message"
                  placeholder="예) 한전 협력업체용 아라미드 하계 시즌 200벌, 자수 작업 포함 견적 문의드립니다. 사이즈 분포는 추후 공유 가능합니다."
                  required
                />
              </div>
            </div>

            <div className="ct-form-row full">
              <div className="ct-field">
                <label>파일 첨부 <span className="ct-hint-mini">(시방서·로고·사이즈표 등)</span></label>
                <div className="ct-file-upload">
                  <div className="ic">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M21.44 11.05 12.25 20.24a6 6 0 1 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                  </div>
                  <div className="hint">
                    {namesPreview ? (
                      <>
                        <b>{fileNames.length}개 파일 선택됨</b>
                        <br />
                        <span className="files">{namesPreview}</span>
                      </>
                    ) : (
                      <>
                        <b>최대 5개 파일까지</b>
                        <br />
                        PDF · JPG · PNG · AI · ZIP / 각 20MB 이하
                      </>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    id="fileInput"
                    name="attachments"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.ai,.eps,.zip,.svg,.heic,application/pdf,image/*"
                    onChange={onFilePick}
                  />
                  <label htmlFor="fileInput">파일 선택</label>
                </div>
              </div>
            </div>

            <div className="ct-agree">
              <input id="agree" name="agreed" type="checkbox" required />
              <label htmlFor="agree">
                <a href="#privacy" onClick={(e) => e.preventDefault()}>개인정보 수집·이용 약관</a>에 동의합니다.
                <br />
                <span className="ct-agree-fine">
                  수집 항목: 회사명·담당자명·연락처·이메일 / 보유 기간: 문의 처리 후 6개월 / 이용 목적: 문의 응대 및 견적 발송
                </span>
              </label>
            </div>

            <div className="ct-form-submit">
              <span className="note">— 1영업일 이내 회신 드립니다</span>
              <button
                type="submit"
                className="ct-btn ct-btn-primary"
                disabled={submit.status === 'sending'}
              >
                {submit.status === 'sending' ? '전송 중...' : '문의 제출하기'}
                <span className="arr">→</span>
              </button>
            </div>

            {submit.status === 'ok' ? (
              <div className="ct-form-toast ok">
                ✓ 문의가 접수되었습니다. 1영업일 이내 회신 드립니다.
              </div>
            ) : null}
            {submit.status === 'error' ? (
              <div className="ct-form-toast err">⚠ {submit.message}</div>
            ) : null}
          </form>

          <ContactSidebar locale={locale} />
        </div>
      </div>
    </section>
  );
}

function ContactSidebar({ locale: _locale }: { locale: Locale }) {
  return (
    <aside className="ct-sidebar">
      <div className="ct-sb-card accent">
        <span className="lbl">— Direct Line / B2B 전담</span>
        <div className="tel">02-777-3079</div>
        <p className="hrs">
          평일 09:00 – 18:00 KST
          <br />
          점심 12:30 – 13:30 · 주말 휴무
        </p>
      </div>

      <div className="ct-sb-card">
        <span className="lbl">— Other Channels</span>
        <div className="ct-sb-list">
          <div className="ct-sb-row">
            <span className="k">Email</span>
            <span className="v">
              <a href="mailto:njsafety91@naver.com">njsafety91@naver.com</a>
            </span>
          </div>
          <div className="ct-sb-row">
            <span className="k">Fax</span>
            <span className="v">02-774-1841</span>
          </div>
          <div className="ct-sb-row">
            <span className="k">Web</span>
            <span className="v">
              <a href="https://www.njfashion.co.kr" target="_blank" rel="noreferrer">www.njfashion.co.kr</a>
            </span>
          </div>
        </div>
        <div className="ct-sb-actions">
          {/* TODO: 실제 카탈로그 PDF / 카카오톡 채널 URL 연결 */}
          <a href="#catalog">
            <span className="ic">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </span>
            카탈로그 PDF
          </a>
          <a href="#kakao">
            <span className="ic">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </span>
            카카오톡 채널
          </a>
        </div>
      </div>

      <div className="ct-sb-reassure">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>
          <b>평균 회신 1영업일</b> — 대형 견적·OEM은 2~3일 소요
        </span>
      </div>
    </aside>
  );
}

/* ─── 04. Process ───────────────────────────────────────────────── */
function ContactProcess() {
  const STEPS = [
    {
      n: 'STEP 01',
      ko: '문의 접수',
      en: 'Inquiry Received',
      body: '온라인 폼·전화·이메일로 접수된 문의를 영업팀이 분류·전담 매니저 배정합니다.',
      eta: '— Day 1 (1영업일 내)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      n: 'STEP 02',
      ko: '요구사항 확인',
      en: 'Consultation',
      body: '전화·메일로 수량·사양·납기·인증 요구사항을 구체화합니다. 필요시 샘플 발송.',
      eta: '— Day 2 – 3',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 11l-3 3-2-2" />
        </svg>
      ),
    },
    {
      n: 'STEP 03',
      ko: '견적서 발송',
      en: 'Quotation',
      body: '정식 견적서 + 시험성적서/인증서 패키지를 PDF로 발송. 수정 1회 무료.',
      eta: '— Day 3 – 5',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
        </svg>
      ),
    },
    {
      n: 'STEP 04',
      ko: '계약·생산·납품',
      en: 'Production & Delivery',
      body: '계약 체결 후 본사 자체 생산 라인에서 봉제·QC·출하. 정기 공급 협의 가능.',
      eta: '— 3 – 6주 (양산 기준)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      ),
    },
  ];

  return (
    <section className="ct-process ct-section" data-screen-label="04 Process">
      <div className="wrap">
        <div className="ct-section-head">
          <div className="l">
            <span className="ct-eyebrow">— How It Works / 4 Steps</span>
            <h2 className="ct-title">
              문의에서 납품까지,
              <br />
              <em>네 단계 프로세스.</em>
            </h2>
          </div>
          <div className="r">Avg. 3 – 6 weeks total</div>
        </div>

        <div className="ct-process-grid">
          {STEPS.map((s) => (
            <div key={s.n} className="ct-process-step">
              <span className="n">{s.n}</span>
              <span className="ic">{s.icon}</span>
              <h4>{s.ko}</h4>
              <span className="en">{s.en}</span>
              <p>{s.body}</p>
              <span className="eta">{s.eta}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 05. FAQ ───────────────────────────────────────────────────── */
function ContactFaq() {
  const FAQS: { q: string; a: React.ReactNode }[] = [
    {
      q: '최소 주문 수량(MOQ)은 어떻게 되나요?',
      a: <>기성 제품은 <b>1벌부터 주문 가능</b>합니다. 단체 견적(5% 추가 할인)은 <b>50벌부터</b>, OEM 제작(자수·자체 패턴)은 <b>100벌부터</b> 진행합니다. 정기 공급 계약은 별도 협의.</>,
    },
    {
      q: '견적은 어떻게 산정되나요?',
      a: <>제품·수량·사이즈 분포·자수/로고 옵션·인증서 요구사항을 기준으로 산정됩니다. 정식 견적서 발송까지 평균 <b>3~5영업일</b> 소요되며, <b>견적서 1회 무료 수정</b>이 포함됩니다.</>,
    },
    {
      q: '평균 납기는 얼마나 걸리나요?',
      a: <>기성 재고 보유 사이즈는 <b>출고일 기준 5~7영업일</b>, 신규 양산은 <b>3~6주</b>, OEM 제작은 <b>6~10주</b>입니다. 급한 일정은 사전 협의 시 단축 가능합니다.</>,
    },
    {
      q: 'OEM 자수·로고 작업도 가능한가요?',
      a: <>가능합니다. <b>자수·전사·실크프린팅</b> 모두 지원하며, 회사 로고·이름·소속 부서 단위 가공이 가능합니다. AI 또는 고해상도 PNG 파일을 첨부해 주시면 디자인팀이 검토 후 시안을 회신해 드립니다.</>,
    },
    {
      q: '시험성적서·인증서를 받을 수 있나요?',
      a: <>제품별 <b>혼용률 시험성적서·방염 시험성적서·ARC 시험성적서</b>를 PDF로 발송해 드립니다. NFPA 2112 UL 인증은 2026년 내 취득 예정이며, 진행 단계별 자료 공유 가능합니다.</>,
    },
    {
      q: '결제 조건은 어떻게 되나요?',
      a: <>기성 제품은 <b>발주 시 100% 선결제</b>, OEM·단체 견적은 <b>계약금 30% / 출고 시 70%</b> 분할 가능. 정기 공급 계약은 월별 정산 협의 가능합니다. 세금계산서 발행.</>,
    },
    {
      q: 'A/S 기간과 처리 방식은?',
      a: <>제조상 하자는 <b>출고일 기준 1년</b> 무상 교환·수선. 사용 중 발생한 마모·수선 요청은 별도 견적. 사이즈 교환은 출고 후 <b>14일 이내</b>, 미사용 상태일 때만 가능합니다.</>,
    },
    {
      q: '해외 배송·수출이 가능한가요?',
      a: <>가능합니다. <b>EXW / FOB / CIF 조건</b>으로 진행하며, 통관·관세·검역 자료는 지원해 드립니다. 영어 시험성적서·인증서 발급 가능 (NFPA 2112 UL 인증 후 영문 ATPV 라벨 부착).</>,
    },
  ];

  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="ct-faq ct-section" data-screen-label="05 FAQ">
      <div className="wrap">
        <div className="ct-section-head">
          <div className="l">
            <span className="ct-eyebrow">— FAQ / 자주 묻는 질문</span>
            <h2 className="ct-title">
              문의 전, <em>이것부터.</em>
            </h2>
          </div>
          <div className="r">{FAQS.length} Questions</div>
        </div>

        <div className="ct-faq-list">
          {FAQS.map((f, i) => {
            const isOpen = openIdx === i;
            return (
              <div key={i} className={`ct-faq-item${isOpen ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="ct-faq-q"
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span className="n">Q {String(i + 1).padStart(2, '0')}</span>
                  <span className="t">{f.q}</span>
                  <span className="toggle" aria-hidden>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </button>
                <div className="ct-faq-a">
                  <div className="ct-faq-a-inner">{f.a}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── 06. Visit ─────────────────────────────────────────────────── */
function ContactVisit() {
  return (
    <section className="ct-visit ct-section" data-screen-label="06 Visit">
      <div className="wrap">
        <div className="ct-section-head">
          <div className="l">
            <span className="ct-eyebrow">— Visit / 오시는 길</span>
            <h2 className="ct-title">
              현장 미팅·샘플 확인,
              <br />
              <em>직접 방문</em>도 환영합니다.
            </h2>
          </div>
          <div className="r">By appointment</div>
        </div>

        <div className="ct-visit-grid">
          <div className="ct-visit-info">
            <div className="ct-addr">
              <span className="ko">서울특별시 중랑구 신내동</span>
              <span className="en">Sinnae-dong, Jungnang-gu, Seoul, KR</span>
              {/* TODO 실제 우편번호로 교체 */}
              <span className="zip">우편번호 02075 (가상)</span>
            </div>
            <div className="ct-visit-rows">
              <div className="row">
                <span className="k">Subway</span>
                <span className="v">
                  <span className="ic">●</span>지하철 6호선 신내역 도보 8분
                  <span className="sub">경춘선 신내역 2번 출구 도보 약 600m</span>
                </span>
              </div>
              <div className="row">
                <span className="k">Bus</span>
                <span className="v">
                  <span className="ic">●</span>간선 202, 240 / 지선 2227
                  <span className="sub">신내역.중랑구청 정류장 하차</span>
                </span>
              </div>
              <div className="row">
                <span className="k">Parking</span>
                <span className="v">
                  <span className="ic">●</span>건물 지하 주차장 2시간 무료
                  <span className="sub">방문 미팅 사전 등록 시 적용</span>
                </span>
              </div>
              <div className="row">
                <span className="k">Visit</span>
                <span className="v">
                  <span className="ic">●</span>평일 09:00 – 18:00 / 사전 예약 필수
                  <span className="sub">샘플 확인·미팅은 02-777-3079로 사전 연락</span>
                </span>
              </div>
            </div>
          </div>

          <div className="ct-map">
            <span className="badge">NJ HQ</span>
            <span className="stamp">37.61° N / 127.10° E</span>
            <svg viewBox="0 0 600 480" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <defs>
                <pattern id="ct-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M40 0L0 0L0 40" fill="none" stroke="#2f2f31" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="600" height="480" fill="#1c1c1e" />
              <rect width="600" height="480" fill="url(#ct-grid)" />
              <g stroke="#3a3a3c" strokeWidth="2.5" fill="none">
                <path d="M0 280 Q200 250 320 240 Q450 230 600 220" />
                <path d="M180 0 Q200 200 300 240 Q420 280 480 480" />
                <path d="M0 100 Q150 120 280 180 Q400 240 600 380" />
              </g>
              <g stroke="#2a2a2c" strokeWidth="1.5" fill="none">
                <line x1="0" y1="160" x2="600" y2="160" />
                <line x1="0" y1="380" x2="600" y2="380" />
                <line x1="100" y1="0" x2="100" y2="480" />
                <line x1="420" y1="0" x2="420" y2="480" />
              </g>
              <path d="M260 240 L340 240 L340 270 L380 270" stroke="#ff6b1a" strokeWidth="2" fill="none" strokeOpacity=".6" />
              <g fill="#2a2a2c">
                <rect x="120" y="180" width="40" height="40" />
                <rect x="180" y="290" width="50" height="35" />
                <rect x="380" y="180" width="35" height="55" />
                <rect x="420" y="320" width="45" height="40" />
                <rect x="260" y="340" width="40" height="50" />
                <rect x="80" y="380" width="55" height="40" />
              </g>
              <g transform="translate(180,300)">
                <circle r="6" fill="#3a3a3c" />
                <text x="14" y="4" fontFamily="JetBrains Mono" fontSize="10" fill="#8e8e92" letterSpacing="1">신내역</text>
              </g>
            </svg>
            <div className="pin">
              <div className="lbl">NJ SAFETY HQ</div>
              <div className="marker" />
            </div>
            <div className="actions">
              {/* TODO 실제 카카오맵 / 네이버지도 / 길찾기 URL 연결 */}
              <a href="#kakaomap">카카오맵 →</a>
              <a href="#navermap">네이버지도 →</a>
              <a href="#directions">길찾기 →</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
