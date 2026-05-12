'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const REPO_OWNER = 'bangbongfather-sys';
const REPO_NAME = 'nj-safety-website';
const REPO_BRANCH = 'main';
const PAT_STORAGE_KEY = 'nj_admin_github_pat';

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

// UTF-8 safe base64 encode (browser btoa only handles Latin-1).
function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/.test(slug);
}

function parseProductJson(text: string): ParsedProduct {
  const obj = JSON.parse(text);
  if (!obj || typeof obj !== 'object') throw new Error('JSON 최상위가 객체가 아닙니다');
  if (!obj.slug || typeof obj.slug !== 'string') throw new Error('`slug` 필드가 없거나 문자열이 아닙니다');
  if (!isValidSlug(obj.slug)) throw new Error(`\`slug\` 형식이 올바르지 않습니다 (영소문자/숫자/하이픈): "${obj.slug}"`);
  if (!obj.name || typeof obj.name !== 'string') throw new Error('`name` 필드가 없거나 문자열이 아닙니다');

  const sections = ['hero', 'gallery', 'statement', 'material', 'features', 'spec', 'field', 'care', 'order'];
  const sectionCount = sections.reduce((n, k) => (obj[k] ? n + 1 : n), 0) + (Array.isArray(obj.certs) && obj.certs.length > 0 ? 1 : 0);

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

async function githubGetFileSha(pat: string, path: string): Promise<string | null> {
  const r = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(path)}?ref=${REPO_BRANCH}`,
    { headers: { Authorization: `token ${pat}`, Accept: 'application/vnd.github+json' } },
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub GET ${path} failed: ${r.status} ${r.statusText}`);
  const data = await r.json();
  return data.sha ?? null;
}

async function githubPutFile(
  pat: string,
  filePath: string,
  text: string,
  commitMessage: string,
  sha: string | null,
): Promise<{ commitSha: string }> {
  const body: Record<string, string> = {
    message: commitMessage,
    content: utf8ToBase64(text),
    branch: REPO_BRANCH,
  };
  if (sha) body.sha = sha;
  const r = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(filePath)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${pat}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );
  if (!r.ok) {
    const errText = await r.text();
    throw new Error(`GitHub PUT failed: ${r.status} — ${errText.slice(0, 300)}`);
  }
  const data = await r.json();
  return { commitSha: data.commit?.sha ?? '' };
}

async function checkPat(pat: string): Promise<{ ok: boolean; login?: string; error?: string }> {
  try {
    const r = await fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${pat}`, Accept: 'application/vnd.github+json' },
    });
    if (!r.ok) return { ok: false, error: `${r.status} ${r.statusText}` };
    const data = await r.json();
    return { ok: true, login: data.login };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export default function AdminPage() {
  const [pat, setPat] = useState<string>('');
  const [patInput, setPatInput] = useState<string>('');
  const [patLogin, setPatLogin] = useState<string | null>(null);
  const [patError, setPatError] = useState<string | null>(null);
  const [patChecking, setPatChecking] = useState(false);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedProduct | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [publish, setPublish] = useState<PublishState>({ status: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load PAT from localStorage on first render
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(PAT_STORAGE_KEY);
    if (saved) {
      setPat(saved);
      void checkPat(saved).then((r) => {
        if (r.ok) setPatLogin(r.login ?? null);
        else {
          setPatError(`저장된 토큰이 무효합니다: ${r.error}`);
          setPat('');
          window.localStorage.removeItem(PAT_STORAGE_KEY);
        }
      });
    }
  }, []);

  const handlePatSave = useCallback(async () => {
    setPatError(null);
    setPatChecking(true);
    const v = patInput.trim();
    if (!v) {
      setPatError('토큰을 입력해주세요');
      setPatChecking(false);
      return;
    }
    const r = await checkPat(v);
    setPatChecking(false);
    if (r.ok) {
      setPat(v);
      setPatLogin(r.login ?? null);
      setPatInput('');
      window.localStorage.setItem(PAT_STORAGE_KEY, v);
    } else {
      setPatError(`토큰 인증 실패: ${r.error}`);
    }
  }, [patInput]);

  const handlePatLogout = useCallback(() => {
    setPat('');
    setPatLogin(null);
    window.localStorage.removeItem(PAT_STORAGE_KEY);
  }, []);

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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDropActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handlePublish = useCallback(async () => {
    if (!pat || !parsed) return;
    const filePath = `data/products/${parsed.slug}.json`;
    setPublish({ status: 'checking' });
    try {
      const sha = await githubGetFileSha(pat, filePath);
      const updated = sha !== null;
      const content = JSON.stringify(parsed.raw, null, 2) + '\n';
      const msg = updated
        ? `chore(products): update ${parsed.slug}`
        : `feat(products): add ${parsed.slug}`;
      setPublish({ status: 'publishing' });
      const { commitSha } = await githubPutFile(pat, filePath, content, msg, sha);
      setPublish({ status: 'done', slug: parsed.slug, commitSha, updated });
    } catch (e: unknown) {
      setPublish({ status: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }, [pat, parsed]);

  const previewUrl = useMemo(
    () => (parsed ? `/ko/products/${parsed.slug}/` : null),
    [parsed],
  );

  const githubFileUrl = useMemo(
    () => (parsed ? `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/${REPO_BRANCH}/data/products/${parsed.slug}.json` : null),
    [parsed],
  );

  return (
    <div className="admin-wrap">
      <div className="admin-shell">
        <header>
          <span className="eyebrow">— Admin · Phase 1 / Product upload</span>
          <h1>
            제품 <em>JSON 업로드</em>
          </h1>
          <p>
            catalog-app에서 export한 제품 JSON 파일을 드래그&드롭하면 GitHub에 자동 커밋되고,
            ~1~2분 뒤 Cloudflare가 사이트를 재배포합니다. 그러면 <code>/ko/products/&lt;slug&gt;/</code> 페이지가 자동 생성돼요.
          </p>
        </header>

        {/* ===== Auth ===== */}
        <section className="admin-card">
          <h2>1. GitHub 인증</h2>
          {pat && patLogin ? (
            <>
              <p className="meta">
                ✓ <span className="ok">{patLogin}</span>로 인증됨. 본 기기 브라우저에만 저장되어 있어요.
              </p>
              <div className="row">
                <button className="btn ghost" type="button" onClick={handlePatLogout}>
                  로그아웃
                </button>
              </div>
            </>
          ) : (
            <>
              <label htmlFor="pat-input">PERSONAL ACCESS TOKEN (PAT)</label>
              <input
                id="pat-input"
                type="password"
                placeholder="ghp_xxxxxxxxxxxx 또는 github_pat_xxxx"
                value={patInput}
                onChange={(e) => setPatInput(e.target.value)}
                disabled={patChecking}
              />
              <p className="help">
                <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
                  github.com/settings/personal-access-tokens/new
                </a>{' '}
                에서 발급. <strong>Repository access</strong> → <em>nj-safety-website 만</em> 선택, <strong>Repository permissions</strong> → <em>Contents: Read &amp; write</em>.
                토큰은 본 기기 브라우저(localStorage)에만 저장됩니다.
              </p>
              <div className="row">
                <button className="btn" type="button" onClick={handlePatSave} disabled={patChecking || !patInput}>
                  {patChecking ? '확인 중...' : '저장 및 인증'}
                </button>
              </div>
              {patError ? <p className="err">{patError}</p> : null}
            </>
          )}
        </section>

        {/* ===== Upload ===== */}
        <section className="admin-card">
          <h2>2. 제품 JSON 업로드</h2>
          <div
            className={`admin-drop${dropActive ? ' active' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDropActive(true);
            }}
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
          {parseError ? <p className="err">{parseError}</p> : null}

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

        {/* ===== Publish ===== */}
        <section className="admin-card">
          <h2>3. 게시</h2>
          <div className="row">
            <button
              className="btn"
              type="button"
              disabled={!pat || !parsed || publish.status === 'checking' || publish.status === 'publishing'}
              onClick={handlePublish}
            >
              {publish.status === 'checking' ? '기존 파일 확인 중...'
                : publish.status === 'publishing' ? '게시 중...'
                : 'GitHub에 게시'}
            </button>
            {parsed && previewUrl ? (
              <Link className="btn ghost" href={previewUrl} target="_blank">
                미리보기 (현재 배포)
              </Link>
            ) : null}
          </div>

          {publish.status === 'done' ? (
            <div>
              <p className="meta ok">
                ✓ {publish.updated ? '업데이트' : '신규 등록'} 완료 — commit{' '}
                <code>{publish.commitSha?.slice(0, 7)}</code>. Cloudflare가 ~1~2분 후 자동 재배포합니다.
              </p>
              <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                <Link className="btn ghost" href={previewUrl ?? '#'} target="_blank">
                  배포 후 페이지: {previewUrl}
                </Link>
                {githubFileUrl ? (
                  <a className="btn ghost" href={githubFileUrl} target="_blank" rel="noreferrer">
                    GitHub에서 보기
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          {publish.status === 'error' ? <p className="err">에러: {publish.message}</p> : null}
        </section>

        <footer style={{ paddingTop: 16, borderTop: '1px solid var(--border-soft)' }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted-2)', letterSpacing: '.12em' }}>
            ↩ <Link href="/ko/">사이트로 돌아가기</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
