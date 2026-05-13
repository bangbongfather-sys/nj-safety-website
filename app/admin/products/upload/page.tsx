'use client';

import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { ghGetFileSha, ghPutFile } from '@/lib/admin/github';

type ParsedProduct = {
  slug: string;
  name?: string;
  category?: string;
  model?: string;
  hasHero: boolean;
  hasGallery: boolean;
  hasSpec: boolean;
  sectionCount: number;
  raw: unknown;
};

function stripTags(s: string | undefined): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim();
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/.test(slug);
}

function parseProductJson(text: string): ParsedProduct {
  const obj = JSON.parse(text);
  if (!obj || typeof obj !== 'object') throw new Error('JSON 최상위가 객체가 아닙니다');
  if (!obj.slug || typeof obj.slug !== 'string') throw new Error('`slug` 필드가 없거나 문자열이 아닙니다');
  if (!isValidSlug(obj.slug)) throw new Error(`\`slug\` 형식 오류 (영소문자/숫자/하이픈): "${obj.slug}"`);
  if (!obj.name || typeof obj.name !== 'string') throw new Error('`name` 필드가 없거나 문자열이 아닙니다');

  const sections = ['hero', 'gallery', 'statement', 'material', 'features', 'spec', 'field', 'care', 'order'];
  const sectionCount =
    sections.reduce((n, k) => (obj[k] ? n + 1 : n), 0) +
    (Array.isArray(obj.certs) && obj.certs.length > 0 ? 1 : 0);

  return {
    slug: obj.slug,
    name: obj.name,
    category: obj.category,
    model: obj.model,
    hasHero: !!obj.hero,
    hasGallery: !!(obj.gallery?.items?.length),
    hasSpec: !!(obj.spec?.rows?.length),
    sectionCount,
    raw: obj,
  };
}

type PublishState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'publishing' }
  | { status: 'done'; slug: string; commitSha?: string; updated: boolean }
  | { status: 'error'; message: string };

export default function UploadProductPage() {
  const { state } = useAdmin();
  const pat = state.status === 'authenticated' ? state.pat : '';

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedProduct | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [publish, setPublish] = useState<PublishState>({ status: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setParseError(null);
    setParsed(null);
    setFileName(file.name);
    setPublish({ status: 'idle' });
    if (!file.name.toLowerCase().endsWith('.json')) {
      setParseError('JSON 파일이 아닙니다 (.json 확장자 필요)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '');
        const p = parseProductJson(text);
        setParsed(p);
      } catch (e: unknown) {
        setParseError(e instanceof Error ? e.message : String(e));
      }
    };
    reader.onerror = () => setParseError('파일을 읽을 수 없습니다');
    reader.readAsText(file, 'utf-8');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handlePublish = useCallback(async () => {
    if (!pat || !parsed) return;
    const filePath = `data/products/${parsed.slug}.json`;
    setPublish({ status: 'checking' });
    try {
      const sha = await ghGetFileSha(pat, filePath);
      const updated = sha !== null;
      const content = JSON.stringify(parsed.raw, null, 2) + '\n';
      const msg = updated
        ? `chore(products): update ${parsed.slug}`
        : `feat(products): add ${parsed.slug}`;
      setPublish({ status: 'publishing' });
      const { commitSha } = await ghPutFile(pat, filePath, content, msg, sha);
      setPublish({ status: 'done', slug: parsed.slug, commitSha, updated });
    } catch (e: unknown) {
      setPublish({ status: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }, [pat, parsed]);

  const previewUrl = useMemo(
    () => (parsed ? `https://nj-safety-website.njsafety91.workers.dev/ko/products/${parsed.slug}/` : null),
    [parsed],
  );

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <span className="eyebrow">— Products / Upload</span>
        <h1>제품 <em>JSON 업로드</em></h1>
        <p>
          catalog-app에서 export한 제품 JSON을 드래그&드롭하면 GitHub에 자동 커밋되고, ~1~2분 뒤 사이트에 반영됩니다.
          이미 같은 <code>slug</code>가 있으면 자동 덮어쓰기.
        </p>
        <div style={{ marginTop: 16 }}>
          <Link href="/admin/products" className="admin-link">← 제품 목록</Link>
        </div>
      </header>

      <section className="admin-card">
        <h2>1. JSON 파일 선택</h2>
        <div
          className={`admin-drop${dropActive ? ' active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
          onDragLeave={() => setDropActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
        >
          <strong>JSON 파일 드래그&드롭 또는 클릭하여 선택</strong>
          <span className="sub">{fileName ?? 'catalog-app에서 export한 .json 파일'}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
        {parseError ? <p className="admin-err">{parseError}</p> : null}

        {parsed ? (
          <div className="admin-preview">
            <div className="kv"><span className="k">slug</span><span className="v"><code>{parsed.slug}</code></span></div>
            <div className="kv"><span className="k">name</span><span className="v">{stripTags(parsed.name)}</span></div>
            {parsed.model ? <div className="kv"><span className="k">model</span><span className="v">{parsed.model}</span></div> : null}
            {parsed.category ? <div className="kv"><span className="k">category</span><span className="v">{parsed.category}</span></div> : null}
            <div className="kv"><span className="k">sections</span><span className="v">{parsed.sectionCount}개 (Hero {parsed.hasHero ? '✓' : '—'} · Gallery {parsed.hasGallery ? '✓' : '—'} · Spec {parsed.hasSpec ? '✓' : '—'})</span></div>
            <div className="kv"><span className="k">path</span><span className="v"><code>data/products/{parsed.slug}.json</code></span></div>
          </div>
        ) : null}
      </section>

      <section className="admin-card">
        <h2>2. 게시</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn primary"
            type="button"
            disabled={!pat || !parsed || publish.status === 'checking' || publish.status === 'publishing'}
            onClick={() => void handlePublish()}
          >
            {publish.status === 'checking' ? '기존 파일 확인 중...'
              : publish.status === 'publishing' ? '게시 중...'
              : 'GitHub에 게시'}
          </button>
          {parsed && previewUrl ? (
            <a className="btn ghost" href={previewUrl} target="_blank" rel="noreferrer">
              미리보기 (현재 라이브)
            </a>
          ) : null}
        </div>

        {publish.status === 'done' ? (
          <>
            <p className="admin-meta admin-ok">
              ✓ {publish.updated ? '업데이트' : '신규 등록'} 완료 — commit{' '}
              <code>{publish.commitSha?.slice(0, 7)}</code>. Cloudflare가 ~1~2분 후 자동 재배포합니다.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <Link href="/admin/products" className="btn primary">
                ← 제품 목록으로
              </Link>
              <a className="btn ghost" href={previewUrl ?? '#'} target="_blank" rel="noreferrer">
                배포 후 페이지 ↗
              </a>
            </div>
          </>
        ) : null}

        {publish.status === 'error' ? <p className="admin-err">에러: {publish.message}</p> : null}
      </section>
    </div>
  );
}
