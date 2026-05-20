'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { ghGetFile, ghPutFile, REPO_OWNER, REPO_NAME, REPO_BRANCH } from '@/lib/admin/github';

type Dict = Record<string, unknown>;

const KO_PATH = 'locales/ko.json';
const EN_PATH = 'locales/en.json';

// Section labels for top-level keys, shown above each card.
const SECTION_LABELS: Record<string, string> = {
  meta:          '사이트 메타',
  nav:           '네비게이션',
  hero:          '히어로 (메인 첫 화면)',
  products:      '제품 섹션 (홈)',
  showcase:      '쇼케이스 (현장 컷)',
  manifesto:     '매니페스토 (브랜드 선언)',
  certifications:'인증 섹션',
  cta:           'CTA / 문의 섹션',
  company:       '회사 정보',
  footer:        '푸터',
  skeleton:      '서브페이지 준비중 텍스트',
};

const FIELD_LABELS: Record<string, string> = {
  title: '제목', description: '설명',
  eyebrow: '아이브로우 (작은 라벨)',
  headline: '헤드라인', headlineLine1: '헤드라인 1행', headlineLine2Pre: '헤드라인 2행 앞', headlineLine2Em: '헤드라인 2행 강조',
  sub: '부제', tagline: '태그라인',
  ctaPrimary: 'CTA 버튼 (메인)', ctaSecondary: 'CTA 버튼 (보조)',
  titlePre: '제목 앞부분', titleEm: '제목 강조부', titleSuffix: '제목 끝부분',
  body: '본문', viewAll: '전체 보기 링크',
  quoteCta: '견적 문의 버튼',
  about: '회사소개', products: '제품', certifications: '인증', clients: '실적', news: '뉴스', contact: '문의',
  scroll: '스크롤 안내', locatorName: '회사명', locatorSub: '회사 부제',
  lineupLabel: '라인업 라벨', fullCatalogue: '전체 카탈로그 링크',
  viewSeries: '시리즈 보기',
  en: '영문 라벨', ko: '한글 라벨',
  weight: '중량', use: '용도', fit: '핏', testTag: '시험성적서 태그',
  summer: '하계', sf: '봄·가을', winter: '동계',
  meta: '메타 라벨',
  tel: '대표번호', fax: '팩스', email: '이메일', hours: '근무시간',
  addressShort: '주소 (간단)', addressFull: '주소 (전체)',
  brn: '사업자등록번호', copyright: '저작권 표기',
  brandDesc: '브랜드 설명', productsHead: '제품 헤더', companyHead: '회사 헤더', connectHead: '연락처 헤더',
  legal: '법적 링크', privacy: '개인정보', terms: '이용약관', sitemap: '사이트맵',
  social: '소셜 라벨', addrKey: '주소 키', telKey: '전화 키', faxKey: '팩스 키', mailKey: '메일 키',
  sigNumber: '시그니처 번호', sigName: '시그니처 이름',
  quotePre: '인용 앞', quoteMain: '인용 본문', quoteEm: '인용 강조', quoteMid: '인용 중간', quoteEnd: '인용 끝',
  titleLine1: '제목 1행', titleLine2Em: '제목 2행 강조', titleLine2End: '제목 2행 끝',
  button: '버튼 라벨',
  cat: '카테고리', date: '날짜', excerpt: '발췌',
  label: '라벨', num: '수치', sup: '단위', desc: '설명',
  specKeys: '스펙 키 라벨',
  items: '항목 목록', logos: '로고 목록', stats: '통계',
  all: '전체 링크',
  id: 'ID', name: '이름', note: '비고',
  headlineLine2: '헤드라인 2행',
};

function isLongText(s: string): boolean {
  return s.length > 60 || s.includes('\n');
}

function setIn(obj: unknown, path: (string | number)[], value: unknown): unknown {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  if (Array.isArray(obj)) {
    const copy = [...obj];
    const idx = Number(head);
    copy[idx] = setIn(copy[idx], rest, value);
    return copy;
  }
  const src = (obj as Dict) ?? {};
  return { ...src, [String(head)]: setIn(src[String(head)], rest, value) };
}

function fieldLabelFor(key: string | number, fallback: string): string {
  if (typeof key === 'number') return `${fallback} #${key + 1}`;
  return FIELD_LABELS[key] ?? key;
}

type FieldProps = {
  pathStr: string;
  pathArr: (string | number)[];
  ko: string;
  en: string;
  label: string;
  onChangeKo: (v: string) => void;
  onChangeEn: (v: string) => void;
};

function FieldRow({ pathStr, ko, en, label, onChangeKo, onChangeEn }: FieldProps) {
  const longest = Math.max(ko.length, en.length);
  const multiline = longest > 60 || ko.includes('\n') || en.includes('\n');
  return (
    <div className="admin-field">
      <div className="admin-field-head">
        <span className="admin-field-label">{label}</span>
        <code className="admin-field-path">{pathStr}</code>
      </div>
      <div className="admin-field-pair">
        <div className="admin-field-col">
          <span className="admin-field-lang">KO</span>
          {multiline ? (
            <textarea
              value={ko}
              rows={Math.min(8, Math.max(2, Math.ceil(ko.length / 60) + 1))}
              onChange={(e) => onChangeKo(e.target.value)}
            />
          ) : (
            <input value={ko} onChange={(e) => onChangeKo(e.target.value)} />
          )}
        </div>
        <div className="admin-field-col">
          <span className="admin-field-lang">EN</span>
          {multiline ? (
            <textarea
              value={en}
              rows={Math.min(8, Math.max(2, Math.ceil(en.length / 60) + 1))}
              onChange={(e) => onChangeEn(e.target.value)}
            />
          ) : (
            <input value={en} onChange={(e) => onChangeEn(e.target.value)} />
          )}
        </div>
      </div>
    </div>
  );
}

type WalkerProps = {
  koVal: unknown;
  enVal: unknown;
  path: (string | number)[];
  parentLabel: string;
  onChange: (lang: 'ko' | 'en', path: (string | number)[], value: string) => void;
  depth: number;
};

function Walker({ koVal, enVal, path, parentLabel, onChange, depth }: WalkerProps) {
  // String leaf — paired editor.
  if (typeof koVal === 'string' || typeof enVal === 'string') {
    const koStr = typeof koVal === 'string' ? koVal : '';
    const enStr = typeof enVal === 'string' ? enVal : '';
    return (
      <FieldRow
        pathStr={path.join('.')}
        pathArr={path}
        label={parentLabel}
        ko={koStr}
        en={enStr}
        onChangeKo={(v) => onChange('ko', path, v)}
        onChangeEn={(v) => onChange('en', path, v)}
      />
    );
  }

  // Skip non-string primitives (numbers / booleans) — uncommon in our schema.
  if (typeof koVal !== 'object' || koVal === null) return null;

  // Array branch.
  if (Array.isArray(koVal)) {
    const enArr = Array.isArray(enVal) ? enVal : [];
    return (
      <div className={`admin-walker admin-walker-arr admin-walker-d${depth}`}>
        {parentLabel ? <div className="admin-walker-head">{parentLabel} <span className="muted">({koVal.length}개)</span></div> : null}
        {koVal.map((item, i) => {
          const enItem = enArr[i];
          const itemLabel = typeof item === 'string' || typeof item === 'number'
            ? `#${i + 1}`
            : `#${i + 1}`;
          return (
            <div key={i} className="admin-walker-item">
              <Walker
                koVal={item}
                enVal={enItem}
                path={[...path, i]}
                parentLabel={itemLabel}
                onChange={onChange}
                depth={depth + 1}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // Object branch.
  const koDict = koVal as Dict;
  const enDict = (enVal as Dict) ?? {};
  return (
    <div className={`admin-walker admin-walker-obj admin-walker-d${depth}`}>
      {parentLabel && depth > 0 ? <div className="admin-walker-head">{parentLabel}</div> : null}
      {Object.keys(koDict).map((k) => (
        <Walker
          key={k}
          koVal={koDict[k]}
          enVal={enDict[k]}
          path={[...path, k]}
          parentLabel={fieldLabelFor(k, k)}
          onChange={onChange}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; ko: Dict; en: Dict; koSha: string; enSha: string }
  | { status: 'error'; message: string };

type SaveState = { status: 'idle' } | { status: 'saving' } | { status: 'done'; sha: string } | { status: 'error'; message: string };

export default function TextEditorPage() {
  const { state } = useAdmin();
  const pat = state.status === 'authenticated' ? state.pat : '';

  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [koDraft, setKoDraft] = useState<Dict | null>(null);
  const [enDraft, setEnDraft] = useState<Dict | null>(null);
  const [save, setSave] = useState<SaveState>({ status: 'idle' });
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['hero', 'nav']));

  useEffect(() => {
    if (!pat) return;
    let cancelled = false;
    (async () => {
      setLoad({ status: 'loading' });
      try {
        const [ko, en] = await Promise.all([ghGetFile(pat, KO_PATH), ghGetFile(pat, EN_PATH)]);
        if (cancelled) return;
        if (!ko || !en) throw new Error('locales 파일을 찾을 수 없습니다');
        const koObj = JSON.parse(ko.content) as Dict;
        const enObj = JSON.parse(en.content) as Dict;
        setLoad({ status: 'ready', ko: koObj, en: enObj, koSha: ko.sha, enSha: en.sha });
        setKoDraft(koObj);
        setEnDraft(enObj);
      } catch (e: unknown) {
        if (!cancelled) setLoad({ status: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => { cancelled = true; };
  }, [pat]);

  const dirty = useMemo(() => {
    if (load.status !== 'ready' || !koDraft || !enDraft) return false;
    return JSON.stringify(koDraft) !== JSON.stringify(load.ko) || JSON.stringify(enDraft) !== JSON.stringify(load.en);
  }, [load, koDraft, enDraft]);

  const onChange = useCallback((lang: 'ko' | 'en', path: (string | number)[], value: string) => {
    if (lang === 'ko') setKoDraft((d) => (d ? (setIn(d, path, value) as Dict) : d));
    else setEnDraft((d) => (d ? (setIn(d, path, value) as Dict) : d));
  }, []);

  const handleSave = useCallback(async () => {
    if (load.status !== 'ready' || !koDraft || !enDraft || !pat) return;
    setSave({ status: 'saving' });
    try {
      const koText = JSON.stringify(koDraft, null, 2) + '\n';
      const enText = JSON.stringify(enDraft, null, 2) + '\n';
      const { commitSha: koCommit } = await ghPutFile(pat, KO_PATH, koText, 'chore(text): update ko locale', load.koSha);
      const { commitSha: enCommit } = await ghPutFile(pat, EN_PATH, enText, 'chore(text): update en locale', load.enSha);
      setSave({ status: 'done', sha: enCommit || koCommit });
      // Re-fetch fresh SHAs so subsequent saves work without 409.
      const [ko2, en2] = await Promise.all([ghGetFile(pat, KO_PATH), ghGetFile(pat, EN_PATH)]);
      if (ko2 && en2) {
        setLoad({ status: 'ready', ko: JSON.parse(ko2.content), en: JSON.parse(en2.content), koSha: ko2.sha, enSha: en2.sha });
      }
    } catch (e: unknown) {
      setSave({ status: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }, [load, koDraft, enDraft, pat]);

  const handleDiscard = useCallback(() => {
    if (load.status !== 'ready') return;
    if (!window.confirm('편집 중인 변경사항을 모두 버릴까요?')) return;
    setKoDraft(load.ko);
    setEnDraft(load.en);
    setSave({ status: 'idle' });
  }, [load]);

  const toggleSection = (k: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <span className="eyebrow">— Text editor</span>
        <h1>사이트 <em>텍스트 편집</em></h1>
        <p>
          홈페이지·푸터·회사 정보 등 사이트의 모든 텍스트를 한국어 / 영어 양쪽 동시에 편집합니다.
          저장하면 <code>locales/ko.json</code> + <code>locales/en.json</code>이 GitHub에 커밋되고, ~1~2분 뒤 사이트에 반영됩니다.
        </p>
      </header>

      {load.status === 'loading' ? <p className="admin-meta">로케일 로드 중...</p> : null}
      {load.status === 'error' ? <p className="admin-err">로드 실패: {load.message}</p> : null}

      {load.status === 'ready' && koDraft && enDraft ? (
        <>
          <div className="admin-save-bar">
            <div className="admin-save-status">
              {dirty ? (
                <span className="admin-save-dirty">● 저장되지 않은 변경사항이 있습니다</span>
              ) : (
                <span className="admin-meta">변경사항 없음</span>
              )}
              {save.status === 'done' ? (
                <span className="admin-ok">✓ 게시 완료 — commit <code>{save.sha.slice(0, 7)}</code></span>
              ) : null}
              {save.status === 'error' ? <span className="admin-err">에러: {save.message}</span> : null}
            </div>
            <div className="admin-save-actions">
              <button className="btn ghost" type="button" disabled={!dirty || save.status === 'saving'} onClick={handleDiscard}>
                되돌리기
              </button>
              <button className="btn primary" type="button" disabled={!dirty || save.status === 'saving'} onClick={() => void handleSave()}>
                {save.status === 'saving' ? '게시 중...' : '변경사항 게시'}
              </button>
            </div>
          </div>

          {Object.keys(koDraft).map((topKey) => {
            const koSection = koDraft[topKey];
            const enSection = enDraft[topKey];
            const isOpen = openSections.has(topKey);
            return (
              <section key={topKey} className={`admin-card admin-section-card${isOpen ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="admin-section-toggle"
                  onClick={() => toggleSection(topKey)}
                  aria-expanded={isOpen}
                >
                  <span className="admin-section-title">
                    <span className="admin-section-mark">{isOpen ? '−' : '+'}</span>
                    {SECTION_LABELS[topKey] ?? topKey}
                  </span>
                  <code className="admin-section-key">{topKey}</code>
                </button>
                {isOpen ? (
                  <div className="admin-section-body">
                    <Walker
                      koVal={koSection}
                      enVal={enSection}
                      path={[topKey]}
                      parentLabel=""
                      onChange={onChange}
                      depth={0}
                    />
                  </div>
                ) : null}
              </section>
            );
          })}

          <div className="admin-save-bar admin-save-bar-bottom">
            <div className="admin-save-status">
              <a
                href={`https://github.com/${REPO_OWNER}/${REPO_NAME}/tree/${REPO_BRANCH}/locales`}
                target="_blank"
                rel="noreferrer"
                className="admin-link"
              >
                GitHub에서 원본 JSON 보기 ↗
              </a>
            </div>
            <div className="admin-save-actions">
              <button className="btn ghost" type="button" disabled={!dirty} onClick={handleDiscard}>되돌리기</button>
              <button className="btn primary" type="button" disabled={!dirty || save.status === 'saving'} onClick={() => void handleSave()}>
                {save.status === 'saving' ? '게시 중...' : '변경사항 게시'}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
