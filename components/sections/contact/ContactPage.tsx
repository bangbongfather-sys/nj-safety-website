'use client';

/**
 * /ko/contact — 문의 페이지.
 *
 * Now reads every visible string from `dict.contact.*`, so the
 * existing WYSIWYG admin (and the new /admin/contact/edit route)
 * can edit copy inline using the same EditableText primitive
 * everywhere else uses. Form mechanics (input names, select option
 * lists used for backend filtering, submit endpoint) stay hardcoded
 * because they're functional UI, not editorial copy.
 */

import { useRef, useState, type FormEvent } from 'react';
import type { Dictionary, Locale } from '@/lib/i18n';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';
import { CustomBlocksLayer } from '@/components/admin/CustomBlocks';
import NaverMap from './NaverMap';
import './contact.css';

/**
 * Fallback HQ coordinates for the embedded Naver Map (서울 중랑구
 * 신내역로 111 SK V1 센터). Used only when the dict has no
 * mapLat / mapLng yet. Once the admin clicks the map to place the
 * pin, the real coords live in contact.visit.mapLat / mapLng and
 * these literals are ignored.
 */
const HQ_LAT = 37.6135;
const HQ_LNG = 127.1015;
const HQ_ZOOM = 16;

type InquiryType = 'quote' | 'b2b' | 'oem' | 'cert' | 'as';

type Props = {
  locale: Locale;
  dict: Dictionary;
  editor?: EditorApi;
};

type ContactDict = NonNullable<Dictionary['contact']>;

export default function ContactPage({ locale, dict, editor }: Props) {
  const contact = dict.contact as ContactDict;
  const [activeType, setActiveType] = useState<InquiryType>('quote');

  const onTypeChange = (t: InquiryType) => {
    setActiveType(t);
    requestAnimationFrame(() => {
      document.getElementById('form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="contact-page cb-page-root">
      <ContactHero contact={contact} editor={editor} />
      <InquiryTypes contact={contact} active={activeType} onChange={onTypeChange} editor={editor} />
      <ContactForm contact={contact} activeType={activeType} locale={locale} editor={editor} />
      <ContactProcess contact={contact} editor={editor} />
      <ContactFaq contact={contact} editor={editor} />
      <ContactVisit contact={contact} editor={editor} />
      <CustomBlocksLayer blocks={dict.customBlocks} route="contact" editor={editor} />
    </div>
  );
}

/* ─── 01. Hero ───────────────────────────────────────────────────── */
function ContactHero({ contact, editor }: { contact: ContactDict; editor?: EditorApi }) {
  const h = contact.hero;
  return (
    <section className="ct-hero" data-screen-label="01 Hero">
      <div className="wrap">
        <div className="ct-hero-content">
          <div className="ct-hero-l">
            <span className="ct-eyebrow">
              <span className="ct-hairline" />{' '}
              <EditableText as="span" path="contact.hero.eyebrow" value={h.eyebrow ?? ''} editor={editor} />
            </span>
            <h1>
              <EditableText path="contact.hero.titleLine1" value={h.titleLine1 ?? ''} editor={editor} />
              <br />
              <EditableText path="contact.hero.titleLine2Pre" value={h.titleLine2Pre ?? ''} editor={editor} />
              <em>
                <EditableText path="contact.hero.titleLine2Em" value={h.titleLine2Em ?? ''} editor={editor} />
              </em>
              <EditableText path="contact.hero.titleLine2Post" value={h.titleLine2Post ?? ''} editor={editor} />
            </h1>
            <EditableText
              as="p"
              className="ct-hero-sub"
              path="contact.hero.sub"
              value={h.sub ?? ''}
              editor={editor}
              multiline
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── 02. Inquiry Types ──────────────────────────────────────────── */
const TYPE_ICONS = [
  // Order matches dict.contact.types.items[0..4] — keep these in sync.
  <svg key="i1" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="15" y2="17" />
  </svg>,
  <svg key="i2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M3 21V8l9-5 9 5v13" />
    <path d="M9 21V12h6v9" />
    <path d="M3 13h18" />
  </svg>,
  <svg key="i3" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>,
  <svg key="i4" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M12 2 4 5v7c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>,
  <svg key="i5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
  </svg>,
];

function InquiryTypes({
  contact, active, onChange, editor,
}: {
  contact: ContactDict;
  active: InquiryType;
  onChange: (t: InquiryType) => void;
  editor?: EditorApi;
}) {
  const t = contact.types;
  const items = t.items ?? [];
  return (
    <section className="ct-types ct-section" data-screen-label="02 Inquiry Types">
      <div className="wrap">
        <div className="ct-section-head">
          <div className="l">
            <EditableText as="span" className="ct-eyebrow" path="contact.types.eyebrow" value={t.eyebrow ?? ''} editor={editor} />
            <h2 className="ct-title">
              <EditableText path="contact.types.titlePre" value={t.titlePre ?? ''} editor={editor} />
              <em>
                <EditableText path="contact.types.titleEm" value={t.titleEm ?? ''} editor={editor} />
              </em>
              <EditableText path="contact.types.titlePost" value={t.titlePost ?? ''} editor={editor} />
            </h2>
          </div>
          <EditableText as="div" className="r" path="contact.types.r" value={t.r ?? ''} editor={editor} />
        </div>

        <div className="ct-types-grid">
          {items.map((item, i) => {
            // type key drives the form's hidden inquiry_type field — stays
            // structural (not edited), but ko/en/body all flow through dict.
            const isActive = item.type === active;
            const Tag = editor ? 'div' : 'button';
            const tagProps = editor
              ? { className: `ct-type-card${isActive ? ' is-active' : ''}` }
              : {
                  type: 'button' as const,
                  className: `ct-type-card${isActive ? ' is-active' : ''}`,
                  onClick: () => onChange(item.type as InquiryType),
                  'aria-pressed': isActive,
                  'data-type': item.type,
                };
            // Index suffix on the key prevents React reconciliation
            // warnings when an admin adds two cards before changing
            // their type fields (both would otherwise share the same
            // `type` value).
            const reactKey = `${item.type ?? 'card'}-${i}`;
            const totalLabel = `${String(i + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
            return (
              <Tag key={reactKey} {...tagProps}>
                <div className="top">
                  <span className="n">{totalLabel}</span>
                  <span className="icon">{TYPE_ICONS[i] ?? null}</span>
                </div>
                {/* Admin-only: delete this inquiry-type card. Stops
                 * the card's parent click so the public-mode button
                 * version doesn't fire activeType change. */}
                {editor?.onArrayDelete ? (
                  <button
                    type="button"
                    className="ct-card-del"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`${i + 1}번째 문의 유형 카드를 삭제할까요?`)) {
                        editor.onArrayDelete?.('contact.types.items', i);
                      }
                    }}
                    title="이 카드 삭제"
                    aria-label="삭제"
                  >
                    × 삭제
                  </button>
                ) : null}
                <div>
                  <EditableText as="h3" path={`contact.types.items[${i}].ko`} value={item.ko ?? ''} editor={editor} />
                  <EditableText as="div" className="en" path={`contact.types.items[${i}].en`} value={item.en ?? ''} editor={editor} />
                </div>
                <EditableText as="p" path={`contact.types.items[${i}].body`} value={item.body ?? ''} editor={editor} multiline />
                <span className="arr">
                  {isActive ? (
                    <EditableText as="span" path="contact.types.selectedLabel" value={t.selectedLabel ?? ''} editor={editor} />
                  ) : (
                    <EditableText as="span" path="contact.types.selectLabel" value={t.selectLabel ?? ''} editor={editor} />
                  )}
                </span>
              </Tag>
            );
          })}
        </div>
        {/* Admin-only: add a new inquiry-type card. Seeds with a
         * placeholder type ('quote' — admin can leave it alone or
         * change it later). Identical seed in ko + en. */}
        {editor?.onArrayAdd ? (
          <button
            type="button"
            className="ct-list-add"
            onClick={() =>
              editor.onArrayAdd?.('contact.types.items', {
                type: 'quote',
                ko: '새 문의 유형',
                en: 'New inquiry type',
                body: '설명을 입력하세요.',
              })
            }
            title="새 문의 유형 카드 추가"
          >
            + 문의 유형 카드 추가
          </button>
        ) : null}
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

function ContactForm({
  contact, activeType, locale, editor,
}: {
  contact: ContactDict;
  activeType: InquiryType;
  locale: Locale;
  editor?: EditorApi;
}) {
  const f = contact.form;
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
    } catch (err: unknown) {
      setSubmit({ status: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setFileNames(Array.from(files).map((x) => x.name));
  };

  const activeIdx = (contact.types.items ?? []).findIndex((it) => it.type === activeType);
  const activeKo = (contact.types.items ?? [])[activeIdx]?.ko ?? '';
  const selectedLabel = `${String(activeIdx + 1).padStart(2, '0')} / ${activeKo}`;
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
            <EditableText as="span" className="ct-eyebrow" path="contact.form.sectionEyebrow" value={f.sectionEyebrow ?? ''} editor={editor} />
            <h2 className="ct-title">
              <EditableText path="contact.form.sectionTitlePre" value={f.sectionTitlePre ?? ''} editor={editor} />
              <em>
                <EditableText path="contact.form.sectionTitleEm" value={f.sectionTitleEm ?? ''} editor={editor} />
              </em>
            </h2>
          </div>
          <EditableText as="div" className="r" path="contact.form.sectionR" value={f.sectionR ?? ''} editor={editor} />
        </div>

        <div className="ct-form-grid">
          <form ref={formRef} className="ct-form" onSubmit={handleSubmit} noValidate>
            <div className="ct-form-title">
              <EditableText as="h2" path="contact.form.title" value={f.title ?? ''} editor={editor} />
              <span className="selected">{selectedLabel}</span>
            </div>

            <input type="hidden" name="inquiry_type" value={activeType} />

            <div className="ct-form-row">
              <div className="ct-field">
                <label htmlFor="company">
                  <EditableText as="span" path="contact.form.labels.company" value={f.labels?.company ?? ''} editor={editor} />
                  {' '}<span className="req">*</span>
                </label>
                <input id="company" name="company" type="text" placeholder={f.placeholders?.company} required />
              </div>
              <div className="ct-field">
                <label htmlFor="industry">
                  <EditableText as="span" path="contact.form.labels.industry" value={f.labels?.industry ?? ''} editor={editor} />
                </label>
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
                <label htmlFor="contact_name">
                  <EditableText as="span" path="contact.form.labels.contactName" value={f.labels?.contactName ?? ''} editor={editor} />
                  {' '}<span className="req">*</span>
                </label>
                <input id="contact_name" name="contact_name" type="text" placeholder={f.placeholders?.contactName} required />
              </div>
              <div className="ct-field">
                <label htmlFor="position">
                  <EditableText as="span" path="contact.form.labels.position" value={f.labels?.position ?? ''} editor={editor} />
                </label>
                <input id="position" name="position" type="text" placeholder={f.placeholders?.position} />
              </div>
            </div>

            <div className="ct-form-row">
              <div className="ct-field">
                <label htmlFor="phone">
                  <EditableText as="span" path="contact.form.labels.phone" value={f.labels?.phone ?? ''} editor={editor} />
                  {' '}<span className="req">*</span>
                </label>
                <input id="phone" name="phone" type="tel" placeholder={f.placeholders?.phone} required />
              </div>
              <div className="ct-field">
                <label htmlFor="email">
                  <EditableText as="span" path="contact.form.labels.email" value={f.labels?.email ?? ''} editor={editor} />
                  {' '}<span className="req">*</span>
                </label>
                <input id="email" name="email" type="email" placeholder={f.placeholders?.email} required />
              </div>
            </div>

            <div className="ct-form-row">
              <div className="ct-field">
                <label htmlFor="quantity_range">
                  <EditableText as="span" path="contact.form.labels.quantityRange" value={f.labels?.quantityRange ?? ''} editor={editor} />
                </label>
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
                <label htmlFor="delivery_date">
                  <EditableText as="span" path="contact.form.labels.deliveryDate" value={f.labels?.deliveryDate ?? ''} editor={editor} />
                </label>
                <input id="delivery_date" name="delivery_date" type="text" placeholder={f.placeholders?.deliveryDate} />
              </div>
            </div>

            <div className="ct-form-row full">
              <div className="ct-field">
                <label htmlFor="message">
                  <EditableText as="span" path="contact.form.labels.message" value={f.labels?.message ?? ''} editor={editor} />
                  {' '}<span className="req">*</span>
                </label>
                <textarea id="message" name="message" placeholder={f.placeholders?.message} required />
              </div>
            </div>

            <div className="ct-form-row full">
              <div className="ct-field">
                <label>
                  <EditableText as="span" path="contact.form.labels.fileAttach" value={f.labels?.fileAttach ?? ''} editor={editor} />
                  {' '}
                  <EditableText as="span" className="ct-hint-mini" path="contact.form.fileHintMini" value={f.fileHintMini ?? ''} editor={editor} />
                </label>
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
                        <b>
                          <EditableText as="span" path="contact.form.fileHintTitle" value={f.fileHintTitle ?? ''} editor={editor} />
                        </b>
                        <br />
                        <EditableText as="span" path="contact.form.fileHintBody" value={f.fileHintBody ?? ''} editor={editor} />
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
                  <label htmlFor="fileInput">
                    <EditableText as="span" path="contact.form.fileSelectLabel" value={f.fileSelectLabel ?? ''} editor={editor} />
                  </label>
                </div>
              </div>
            </div>

            <div className="ct-agree">
              <input id="agree" name="agreed" type="checkbox" required />
              <label htmlFor="agree">
                <EditableText as="span" path="contact.form.agreePre" value={f.agreePre ?? ''} editor={editor} />
                <a href="#privacy" onClick={(e) => e.preventDefault()}>
                  <EditableText as="span" path="contact.form.agreeLink" value={f.agreeLink ?? ''} editor={editor} />
                </a>
                <EditableText as="span" path="contact.form.agreePost" value={f.agreePost ?? ''} editor={editor} />
                <br />
                <EditableText
                  as="span"
                  className="ct-agree-fine"
                  path="contact.form.agreeFine"
                  value={f.agreeFine ?? ''}
                  editor={editor}
                  multiline
                />
              </label>
            </div>

            <div className="ct-form-submit">
              <EditableText
                as="span"
                className="note"
                path="contact.form.submitNote"
                value={f.submitNote ?? ''}
                editor={editor}
              />
              <button
                type="submit"
                className="ct-btn ct-btn-primary"
                disabled={submit.status === 'sending' || !!editor}
                title={editor ? '편집 모드에서는 실제 제출 비활성화' : undefined}
              >
                {submit.status === 'sending' ? (
                  <EditableText as="span" path="contact.form.submitting" value={f.submitting ?? ''} editor={editor} />
                ) : (
                  <EditableText as="span" path="contact.form.submitButton" value={f.submitButton ?? ''} editor={editor} />
                )}
                <span className="arr">→</span>
              </button>
            </div>

            {submit.status === 'ok' ? (
              <div className="ct-form-toast ok">
                <EditableText as="span" path="contact.form.toastOk" value={f.toastOk ?? ''} editor={editor} />
              </div>
            ) : null}
            {submit.status === 'error' ? <div className="ct-form-toast err">⚠ {submit.message}</div> : null}
          </form>

          <ContactSidebar contact={contact} editor={editor} />
        </div>
      </div>
    </section>
  );
}

function ContactSidebar({ contact, editor }: { contact: ContactDict; editor?: EditorApi }) {
  const s = contact.sidebar;
  const rows = s.rows ?? [];
  const actions = s.actions ?? [];
  return (
    <aside className="ct-sidebar">
      <div className="ct-sb-card accent">
        <EditableText as="span" className="lbl" path="contact.sidebar.directLabel" value={s.directLabel ?? ''} editor={editor} />
        <EditableText as="div" className="tel" path="contact.sidebar.tel" value={s.tel ?? ''} editor={editor} />
        <p className="hrs">
          <EditableText as="span" path="contact.sidebar.hoursLine1" value={s.hoursLine1 ?? ''} editor={editor} />
          <br />
          <EditableText as="span" path="contact.sidebar.hoursLine2" value={s.hoursLine2 ?? ''} editor={editor} />
        </p>
      </div>

      <div className="ct-sb-card">
        <EditableText as="span" className="lbl" path="contact.sidebar.otherLabel" value={s.otherLabel ?? ''} editor={editor} />
        <div className="ct-sb-list">
          {rows.map((row, i) => (
            <div key={i} className="ct-sb-row">
              <EditableText as="span" className="k" path={`contact.sidebar.rows[${i}].key`} value={row.key ?? ''} editor={editor} />
              <span className="v">
                {row.href ? (
                  <a href={row.href} target={row.href.startsWith('http') ? '_blank' : undefined} rel={row.href.startsWith('http') ? 'noreferrer' : undefined}>
                    <EditableText as="span" path={`contact.sidebar.rows[${i}].value`} value={row.value ?? ''} editor={editor} />
                  </a>
                ) : (
                  <EditableText as="span" path={`contact.sidebar.rows[${i}].value`} value={row.value ?? ''} editor={editor} />
                )}
              </span>
            </div>
          ))}
        </div>
        <div className="ct-sb-actions">
          {actions.map((a, i) => (
            <a key={i} href={a.href || '#'}>
              <span className="ic">
                {i === 0 ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                )}
              </span>
              <EditableText as="span" path={`contact.sidebar.actions[${i}].ko`} value={a.ko ?? ''} editor={editor} />
            </a>
          ))}
        </div>
      </div>

      <div className="ct-sb-reassure">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>
          <EditableText as="span" path="contact.sidebar.reassurePre" value={s.reassurePre ?? ''} editor={editor} />
          <b>
            <EditableText as="span" path="contact.sidebar.reassureEm" value={s.reassureEm ?? ''} editor={editor} />
          </b>
          <EditableText as="span" path="contact.sidebar.reassurePost" value={s.reassurePost ?? ''} editor={editor} />
        </span>
      </div>
    </aside>
  );
}

/* ─── 04. Process ───────────────────────────────────────────────── */
const PROCESS_ICONS = [
  <svg key="p1" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  <svg key="p2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 11l-3 3-2-2" /></svg>,
  <svg key="p3" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /></svg>,
  <svg key="p4" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>,
];

function ContactProcess({ contact, editor }: { contact: ContactDict; editor?: EditorApi }) {
  const p = contact.process;
  const steps = p.steps ?? [];
  return (
    <section className="ct-process ct-section" data-screen-label="04 Process">
      <div className="wrap">
        <div className="ct-section-head">
          <div className="l">
            <EditableText as="span" className="ct-eyebrow" path="contact.process.eyebrow" value={p.eyebrow ?? ''} editor={editor} />
            <h2 className="ct-title">
              <EditableText path="contact.process.titleLine1" value={p.titleLine1 ?? ''} editor={editor} />
              <br />
              <em>
                <EditableText path="contact.process.titleLine2Em" value={p.titleLine2Em ?? ''} editor={editor} />
              </em>
            </h2>
          </div>
          <EditableText as="div" className="r" path="contact.process.r" value={p.r ?? ''} editor={editor} />
        </div>

        <div className="ct-process-grid">
          {steps.map((s, i) => (
            <div key={i} className="ct-process-step">
              <EditableText as="span" className="n" path={`contact.process.steps[${i}].n`} value={s.n ?? ''} editor={editor} />
              <span className="ic">{PROCESS_ICONS[i] ?? null}</span>
              <EditableText as="h4" path={`contact.process.steps[${i}].ko`} value={s.ko ?? ''} editor={editor} />
              <EditableText as="span" className="en" path={`contact.process.steps[${i}].en`} value={s.en ?? ''} editor={editor} />
              <EditableText as="p" path={`contact.process.steps[${i}].body`} value={s.body ?? ''} editor={editor} multiline />
              <EditableText as="span" className="eta" path={`contact.process.steps[${i}].eta`} value={s.eta ?? ''} editor={editor} />
              {/* Admin-only: delete this process step. */}
              {editor?.onArrayDelete ? (
                <button
                  type="button"
                  className="ct-card-del"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`${i + 1}번째 프로세스 단계를 삭제할까요?`)) {
                      editor.onArrayDelete?.('contact.process.steps', i);
                    }
                  }}
                  title="이 단계 삭제"
                  aria-label="삭제"
                >
                  × 삭제
                </button>
              ) : null}
            </div>
          ))}
        </div>
        {editor?.onArrayAdd ? (
          <button
            type="button"
            className="ct-list-add"
            onClick={() =>
              editor.onArrayAdd?.('contact.process.steps', {
                n: String(steps.length + 1).padStart(2, '0'),
                ko: '새 단계',
                en: 'New step',
                body: '단계 설명을 입력하세요.',
                eta: '',
              })
            }
            title="새 프로세스 단계 추가"
          >
            + 프로세스 단계 추가
          </button>
        ) : null}
      </div>
    </section>
  );
}

/* ─── 05. FAQ ───────────────────────────────────────────────────── */
function ContactFaq({ contact, editor }: { contact: ContactDict; editor?: EditorApi }) {
  const fq = contact.faq;
  const items = fq.items ?? [];
  // In edit mode, show every answer expanded so the admin can edit them
  // without clicking each Q open. Public mode keeps the one-at-a-time
  // accordion behaviour.
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="ct-faq ct-section" data-screen-label="05 FAQ">
      <div className="wrap">
        <div className="ct-section-head">
          <div className="l">
            <EditableText as="span" className="ct-eyebrow" path="contact.faq.eyebrow" value={fq.eyebrow ?? ''} editor={editor} />
            <h2 className="ct-title">
              <EditableText path="contact.faq.titlePre" value={fq.titlePre ?? ''} editor={editor} />
              <em>
                <EditableText path="contact.faq.titleEm" value={fq.titleEm ?? ''} editor={editor} />
              </em>
            </h2>
          </div>
          <EditableText as="div" className="r" path="contact.faq.r" value={fq.r ?? ''} editor={editor} />
        </div>

        <div className="ct-faq-list">
          {items.map((item, i) => {
            const isOpen = editor ? true : openIdx === i;
            return (
              <div key={i} className={`ct-faq-item${isOpen ? ' is-open' : ''}`}>
                {editor ? (
                  <div className="ct-faq-q" aria-disabled>
                    <span className="n">Q {String(i + 1).padStart(2, '0')}</span>
                    <EditableText as="span" className="t" path={`contact.faq.items[${i}].q`} value={item.q ?? ''} editor={editor} />
                    {/* Admin-only: delete this FAQ row. Same trash-can
                     * affordance pattern as CustomBlocks / hero slides.
                     * Stops the row's parent click so the toggle SVG
                     * doesn't also fire. */}
                    {editor.onArrayDelete ? (
                      <button
                        type="button"
                        className="ct-faq-del"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Q${String(i + 1).padStart(2, '0')} 항목을 삭제할까요?`)) {
                            editor.onArrayDelete?.('contact.faq.items', i);
                          }
                        }}
                        title="이 FAQ 항목 삭제"
                        aria-label="삭제"
                      >
                        × 삭제
                      </button>
                    ) : null}
                    <span className="toggle" aria-hidden>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="ct-faq-q"
                    onClick={() => setOpenIdx(isOpen ? null : i)}
                    aria-expanded={isOpen}
                  >
                    <span className="n">Q {String(i + 1).padStart(2, '0')}</span>
                    <span className="t">{item.q}</span>
                    <span className="toggle" aria-hidden>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                    </span>
                  </button>
                )}
                <div className="ct-faq-a">
                  <div className="ct-faq-a-inner">
                    {/* Answer is HTML — EditableText sanitises + preserves inline <b> */}
                    <EditableText
                      as="div"
                      path={`contact.faq.items[${i}].a`}
                      value={item.a ?? ''}
                      editor={editor}
                      multiline
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {/* Admin-only: add a new FAQ row at the end of the list.
           * Seed has the same placeholder text in ko + en — admins
           * diverge them by clicking the inline editors. */}
          {editor?.onArrayAdd ? (
            <button
              type="button"
              className="ct-faq-add"
              onClick={() =>
                editor.onArrayAdd?.('contact.faq.items', { q: '새 질문', a: '새 답변을 입력하세요.' })
              }
              title="새 FAQ 항목 추가"
            >
              + FAQ 항목 추가
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ─── 06. Visit ─────────────────────────────────────────────────── */
function ContactVisit({ contact, editor }: { contact: ContactDict; editor?: EditorApi }) {
  const v = contact.visit;
  const rows = v.rows ?? [];
  const actions = v.mapActions ?? [];
  return (
    <section className="ct-visit ct-section" data-screen-label="06 Visit">
      <div className="wrap">
        <div className="ct-section-head">
          <div className="l">
            <EditableText as="span" className="ct-eyebrow" path="contact.visit.eyebrow" value={v.eyebrow ?? ''} editor={editor} />
            <h2 className="ct-title">
              <EditableText path="contact.visit.titleLine1" value={v.titleLine1 ?? ''} editor={editor} />
              <br />
              <EditableText path="contact.visit.titleLine2Pre" value={v.titleLine2Pre ?? ''} editor={editor} />
              <em>
                <EditableText path="contact.visit.titleLine2Em" value={v.titleLine2Em ?? ''} editor={editor} />
              </em>
              <EditableText path="contact.visit.titleLine2Post" value={v.titleLine2Post ?? ''} editor={editor} />
            </h2>
          </div>
          <EditableText as="div" className="r" path="contact.visit.r" value={v.r ?? ''} editor={editor} />
        </div>

        <div className="ct-visit-grid">
          <div className="ct-visit-info">
            <div className="ct-addr">
              <EditableText as="span" className="ko" path="contact.visit.addr.ko" value={v.addr?.ko ?? ''} editor={editor} />
              <EditableText as="span" className="en" path="contact.visit.addr.en" value={v.addr?.en ?? ''} editor={editor} />
              <EditableText as="span" className="zip" path="contact.visit.addr.zip" value={v.addr?.zip ?? ''} editor={editor} />
            </div>
            <div className="ct-visit-rows">
              {rows.map((row, i) => (
                <div key={i} className="row">
                  <EditableText as="span" className="k" path={`contact.visit.rows[${i}].key`} value={row.key ?? ''} editor={editor} />
                  <span className="v">
                    <span className="ic">●</span>
                    <EditableText as="span" path={`contact.visit.rows[${i}].v`} value={row.v ?? ''} editor={editor} />
                    <EditableText as="span" className="sub" path={`contact.visit.rows[${i}].sub`} value={row.sub ?? ''} editor={editor} />
                  </span>
                  {editor?.onArrayDelete ? (
                    <button
                      type="button"
                      className="ct-row-del"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`"${row.key ?? `${i + 1}번째 행`}" 항목을 삭제할까요?`)) {
                          editor.onArrayDelete?.('contact.visit.rows', i);
                        }
                      }}
                      title="이 행 삭제"
                      aria-label="삭제"
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              ))}
              {editor?.onArrayAdd ? (
                <button
                  type="button"
                  className="ct-list-add ct-list-add-inline"
                  onClick={() =>
                    editor.onArrayAdd?.('contact.visit.rows', {
                      key: '새 항목',
                      v: '내용을 입력하세요.',
                      sub: '',
                    })
                  }
                  title="새 방문 안내 행 추가"
                >
                  + 방문 안내 행 추가
                </button>
              ) : null}
            </div>
          </div>

          <div className="ct-map">
            {/* Real embedded Naver Map. Coordinates come from the dict
             * (contact.visit.mapLat / mapLng) so the admin can place
             * the pin by clicking the map; falls back to the HQ
             * literals before the first placement. In admin mode the
             * map is `editable` — clicking moves the pin and patches
             * the coords. The marker label also lives in the dict
             * (mapPinLabel). */}
            <NaverMap
              lat={Number(v.mapLat) || HQ_LAT}
              lng={Number(v.mapLng) || HQ_LNG}
              zoom={HQ_ZOOM}
              pinLabel={v.mapPinLabel ?? 'NJ SAFETY HQ'}
              editable={!!editor}
              onPickCoord={
                editor
                  ? (newLat, newLng) => {
                      // Coords are shared across locales — write to
                      // both via onImagePatch (which syncs ko + en),
                      // falling back to single-locale onPatch if the
                      // synced handler isn't wired on this route.
                      const setBoth = editor.onImagePatch ?? ((p: string, val: string | null) => editor.onPatch(p, val ?? ''));
                      setBoth('contact.visit.mapLat', newLat.toFixed(6));
                      setBoth('contact.visit.mapLng', newLng.toFixed(6));
                    }
                  : undefined
              }
            />
            <EditableText as="span" className="badge" path="contact.visit.mapBadge" value={v.mapBadge ?? ''} editor={editor} />
            <EditableText as="span" className="stamp" path="contact.visit.mapStamp" value={v.mapStamp ?? ''} editor={editor} />
            {/* Admin-only chips: edit the marker label + a hint that
             * the map is click-to-place. The marker is rendered by
             * NaverMap (custom HTML icon) so its label can't be an
             * inline EditableText — this surfaces it without
             * crowding the public view. */}
            {editor ? (
              <div className="ct-map-pinlabel-edit">
                <span className="hint">📍 핀 라벨</span>
                <EditableText
                  as="span"
                  path="contact.visit.mapPinLabel"
                  value={v.mapPinLabel ?? 'NJ SAFETY HQ'}
                  editor={editor}
                />
              </div>
            ) : null}
            {editor ? (
              <div className="ct-map-click-hint">🖱️ 지도를 클릭하면 핀이 그 위치로 이동합니다</div>
            ) : null}
            <div className="actions">
              {actions.map((a, i) => {
                // External map links (kakao/naver) open in a new tab so the
                // user doesn't lose the inquiry form they were filling in.
                // Anchors that still point to in-page hashes (e.g. `#x`)
                // stay same-tab.
                const external = !!a.href && /^https?:\/\//.test(a.href);
                return (
                  <a
                    key={i}
                    href={a.href || '#'}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                  >
                    <EditableText as="span" path={`contact.visit.mapActions[${i}].ko`} value={a.ko ?? ''} editor={editor} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
