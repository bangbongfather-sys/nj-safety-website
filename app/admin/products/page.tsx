'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { ghDeleteFile, ghGetFile, ghListDir, ghPutFile, REPO_OWNER, REPO_NAME } from '@/lib/admin/github';
import type { ProductPageData } from '@/lib/product-page-types';
import DropTarget from '@/components/admin/DropTarget';

const SITE_PREVIEW_BASE = 'https://nj-safety-website.njsafety91.workers.dev';
const IMG_BASE = 'https://catalog-app.njsafety91.workers.dev';
const UPLOAD_ENDPOINT = '/api/admin/upload-image';

type ProductRow = {
  slug: string;
  name: string;
  model?: string;
  category?: string;
  /** From shopHeader.images[0] (preferred) or hero.image fallback. */
  cardMain?: string;
  /** From shopHeader.images[1] (preferred) or gallery.items[0].image fallback. */
  cardHover?: string;
  sha: string;
  /** Full JSON content for in-place edits from this page. */
  raw: ProductPageData;
};

function stripTags(s: string | undefined): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim();
}

// Fields the website owns that a fresh catalog export never carries —
// admin-uploaded shop photos, the 기본정보 table, test-report PDFs, and
// per-field style overrides. A "replace JSON" must keep these or the
// operator loses real work. Mirrors the catalog-sync preservation set
// (+ flavor, which the operator standardises per-site, not per-export).
const PRESERVE_ON_REPLACE = ['shopHeader', 'basicInfo', 'testReports', 'styles', 'flavor'] as const;
const VALID_FLAVORS = new Set(['industrial', 'flagship', 'tactical']);

/** Light validation for an incoming replacement JSON. Slug is NOT
 *  required to match — the caller forces the existing slug — but the
 *  file must at least look like a product page. */
function validateIncomingProduct(text: string): ProductPageData {
  const obj = JSON.parse(text);
  if (!obj || typeof obj !== 'object') throw new Error('JSON 최상위가 객체가 아닙니다');
  if (!obj.name || typeof obj.name !== 'string') throw new Error('`name` 필드가 없거나 문자열이 아닙니다');
  const hasContent = obj.hero || obj.spec || obj.gallery || obj.material || obj.features || obj.order;
  if (!hasContent) throw new Error('제품 콘텐츠(hero/spec/gallery 등)가 없습니다 — 잘못된 파일일 수 있어요');
  return obj as ProductPageData;
}

function rewriteImage(src: string | undefined): string | undefined {
  if (!src) return undefined;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith('/api/') || src.startsWith('/products/') || src.startsWith('/brand/')) {
    return `${IMG_BASE}${src}`;
  }
  return src;
}

// Pick the card main + hover images from the JSON. Mirrors the public
// product-list logic so what the admin sees here matches what visitors
// see — shopHeader-curated images win, catalog fallback covers older
// products that haven't been touched yet.
function pickCardImages(obj: ProductPageData): { main?: string; hover?: string } {
  const shop = (obj.shopHeader?.images ?? []).filter((s): s is string => !!s);
  if (shop.length > 0) return { main: shop[0], hover: shop[1] };
  const fallback: string[] = [];
  if (obj.hero?.image) fallback.push(obj.hero.image);
  for (const it of obj.gallery?.items ?? []) {
    if (it.image && !fallback.includes(it.image)) fallback.push(it.image);
  }
  return { main: fallback[0], hover: fallback[1] };
}

// Read a File, resize via canvas to a reasonable card-thumbnail size, and
// return a Blob ready to PUT to R2. Big originals (3000+px) waste R2 bytes
// and slow first paint; 1400px is plenty for the list card + the public
// shop header.
async function shrinkForCard(file: File): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('이미지 디코드 실패'));
    i.src = URL.createObjectURL(file);
  });
  const MAX = 1400;
  const scale = img.width > MAX ? MAX / img.width : 1;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context 사용 불가');
  ctx.drawImage(img, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('blob 생성 실패'))),
      'image/jpeg',
      0.9,
    );
  });
}

async function uploadCardImage(
  pat: string,
  slug: string,
  slot: 'main' | 'hover',
  file: File,
): Promise<string> {
  const blob = await shrinkForCard(file);
  // Stable key per slot so re-uploads overwrite cleanly; cache-bust
  // is appended to the URL we store in the dict.
  const key = `products/${slug}/card-${slot}.jpg`;
  const r = await fetch(`${UPLOAD_ENDPOINT}?key=${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${pat}`,
      'Content-Type': 'image/jpeg',
    },
    body: blob,
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => `${r.status}`);
    throw new Error(`R2 업로드 실패: ${r.status} — ${txt.slice(0, 200)}`);
  }
  const data = (await r.json()) as { publicUrl?: string };
  if (!data.publicUrl) throw new Error('R2 응답이 잘못되었습니다');
  return `${data.publicUrl}?v=${Date.now()}`;
}

export default function ProductsListPage() {
  const { state } = useAdmin();
  const pat = state.status === 'authenticated' ? state.pat : '';

  const [rows, setRows] = useState<ProductRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  /** Per-row upload status: `${slug}:${slot}` */
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  /** Slugs whose JSON is mid-replace. */
  const [replacing, setReplacing] = useState<Set<string>>(new Set());
  /** Transient "교체 완료" note per slug. */
  const [replaced, setReplaced] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!pat) return;
    setErr(null);
    setRows(null);
    try {
      const files = await ghListDir(pat, 'data/products');
      const jsonFiles = files.filter((p) => p.endsWith('.json'));
      const results = await Promise.all(
        jsonFiles.map(async (path) => {
          const f = await ghGetFile(pat, path);
          if (!f) return null;
          let obj: ProductPageData;
          try { obj = JSON.parse(f.content) as ProductPageData; } catch { return null; }
          const slug = obj.slug ?? path.split('/').pop()!.replace(/\.json$/, '');
          const cards = pickCardImages(obj);
          return {
            slug,
            name: stripTags(obj.name ?? slug),
            model: obj.model,
            category: obj.category,
            cardMain: cards.main,
            cardHover: cards.hover,
            sha: f.sha,
            raw: obj,
          } as ProductRow;
        }),
      );
      setRows(
        results
          .filter((r): r is ProductRow => r !== null)
          .sort((a, b) => a.slug.localeCompare(b.slug)),
      );
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [pat]);

  useEffect(() => { void reload(); }, [reload]);

  const handleDelete = useCallback(async (row: ProductRow) => {
    if (!pat) return;
    const ok = window.confirm(
      `정말 "${row.name}" 제품을 삭제할까요?\n\n파일: data/products/${row.slug}.json\n\n` +
      `이 작업은 GitHub에 삭제 커밋을 만들고, ~1~2분 뒤 라이브 사이트에서 사라집니다.`,
    );
    if (!ok) return;
    setBusy(row.slug);
    try {
      await ghDeleteFile(
        pat,
        `data/products/${row.slug}.json`,
        `chore(products): remove ${row.slug}`,
        row.sha,
      );
      await reload();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [pat, reload]);

  // Replace an existing product's JSON file with a freshly-exported
  // catalog JSON, while PRESERVING the website-only fields the admin
  // added (shop photos / 기본정보 / test reports / styles / flavor) and
  // keeping the existing slug + URL stable. This is the "re-import the
  // updated catalog page without losing my admin work" path — the same
  // merge the catalog-sync agent does, but one product at a time from
  // the UI.
  const handleReplaceJson = useCallback(async (row: ProductRow, file: File) => {
    if (!pat) return;
    setErr(null);
    if (!file.name.toLowerCase().endsWith('.json')) {
      setErr(`"${file.name}" 은 JSON 파일이 아닙니다 (.json 필요)`);
      return;
    }
    let incoming: ProductPageData;
    try {
      incoming = validateIncomingProduct(await file.text());
    } catch (e: unknown) {
      setErr(`JSON 파싱 실패: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    const incomingSlug = typeof incoming.slug === 'string' ? incoming.slug : '(없음)';
    const slugMismatch = incomingSlug !== row.slug;
    const ok = window.confirm(
      `"${row.name}" (${row.slug}) 의 JSON을 교체합니다.\n\n` +
      `· 업로드 파일 slug: ${incomingSlug}` +
      (slugMismatch ? `  ⚠️ 현재 슬러그와 다름 → 현재 슬러그(${row.slug}) 유지` : ' ✓') + `\n` +
      `· 보존(유지): 카드/상세 사진 · 시험성적서 · 스타일 · flavor\n` +
      `· 갱신(덮어씀): 이름 · 스펙 · 소재 · 갤러리 등 나머지 콘텐츠 전체\n\n` +
      `진행할까요?`,
    );
    if (!ok) return;

    setReplacing((s) => new Set(s).add(row.slug));
    try {
      // Fetch the CURRENT file fresh (admin may have edited since mount)
      // so we preserve the latest web-only fields and PUT with a live SHA.
      const fresh = await ghGetFile(pat, `data/products/${row.slug}.json`);
      if (!fresh) throw new Error(`data/products/${row.slug}.json 가 사라졌습니다`);
      const existing = JSON.parse(fresh.content) as Record<string, unknown>;

      // Start from the incoming catalog content, force the stable slug,
      // strip the catalog-only docBar, then graft the preserved fields
      // back from the existing file.
      const merged: Record<string, unknown> = { ...(incoming as Record<string, unknown>), slug: row.slug };
      delete merged.docBar;
      for (const k of PRESERVE_ON_REPLACE) {
        if (k in existing) merged[k] = existing[k];
        else delete merged[k];
      }
      // Map any unsupported flavor (e.g. fieldmanual) onto a supported one.
      if (typeof merged.flavor === 'string' && !VALID_FLAVORS.has(merged.flavor)) {
        merged.flavor = 'tactical';
      }

      const content = JSON.stringify(merged, null, 2) + '\n';
      await ghPutFile(
        pat,
        `data/products/${row.slug}.json`,
        content,
        `chore(products): replace ${row.slug} json (web-only fields preserved)`,
        fresh.sha,
      );
      setReplaced(row.slug);
      setTimeout(() => setReplaced((cur) => (cur === row.slug ? null : cur)), 6000);
      await reload();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setReplacing((s) => {
        const n = new Set(s);
        n.delete(row.slug);
        return n;
      });
    }
  }, [pat, reload]);

  // Per-slug serial queue: two rapid clicks on main + hover used to
  // race the same JSON file (both started from the same stale SHA, the
  // loser hit 409 even after one retry). Chaining the PUTs through a
  // promise keyed by slug guarantees they apply in order — by the
  // time the hover upload runs, the main upload's commit (and updated
  // SHA) is already visible to our re-fetch below.
  const queueBySlug = useRef<Map<string, Promise<void>>>(new Map());

  // Upload a card image (main or hover) and persist the URL into the
  // product JSON's shopHeader.images array. Skips the per-product
  // editor entirely so the admin can curate the list-card photos
  // straight from this page.
  const handleCardUpload = useCallback(async (
    row: ProductRow,
    slot: 'main' | 'hover',
    file: File,
  ) => {
    if (!pat) return;
    const key = `${row.slug}:${slot}`;
    setUploading((s) => new Set(s).add(key));
    setErr(null);

    // Chain onto whatever's currently running for this slug.
    const prev = queueBySlug.current.get(row.slug) ?? Promise.resolve();
    const next = prev.then(async () => {
      try {
        // 1. Upload bytes to R2 (no GitHub interaction yet — R2 is fast
        //    and independent so this part can race freely with other
        //    products' uploads).
        const publicUrl = await uploadCardImage(pat, row.slug, slot, file);

        // 2. Re-fetch the JSON's CURRENT state right before we modify
        //    it. If another tab (or the per-product editor) saved
        //    between this page's mount and now, row.raw / row.sha are
        //    stale. Always fetch fresh.
        const fresh = await ghGetFile(pat, `data/products/${row.slug}.json`);
        if (!fresh) throw new Error(`data/products/${row.slug}.json 가 사라졌습니다`);
        const latest = JSON.parse(fresh.content) as ProductPageData;

        // 3. Patch shopHeader.images at the right index.
        const merged: ProductPageData = JSON.parse(JSON.stringify(latest));
        const sh = merged.shopHeader ?? {};
        const images = [...(sh.images ?? [])];
        while (images.length < 2) images.push('');
        images[slot === 'main' ? 0 : 1] = publicUrl;
        merged.shopHeader = { ...sh, images };

        // 4. PUT with the FRESH SHA. ghPutFile still auto-retries
        //    once on 409 as a final safety net.
        const text = JSON.stringify(merged, null, 2) + '\n';
        const r = await ghPutFile(
          pat,
          `data/products/${row.slug}.json`,
          text,
          `chore(products): set ${slot} card image for ${row.slug}`,
          fresh.sha,
        );

        // 5. Update the row in place so the thumbnail swaps without a
        //    full list reload.
        setRows((cur) => {
          if (!cur) return cur;
          return cur.map((r2) =>
            r2.slug !== row.slug ? r2 : {
              ...r2,
              cardMain:  slot === 'main'  ? publicUrl : r2.cardMain,
              cardHover: slot === 'hover' ? publicUrl : r2.cardHover,
              sha: r.contentSha || fresh.sha,
              raw: merged,
            },
          );
        });
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setUploading((s) => {
          const n = new Set(s);
          n.delete(key);
          return n;
        });
      }
    });
    queueBySlug.current.set(row.slug, next);
    await next;
  }, [pat]);

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <span className="eyebrow">— Products</span>
        <h1>제품 <em>관리</em></h1>
        <p>
          <code>data/products/*.json</code>에 등록된 제품들입니다. 각 카드에서
          <strong> 메인 / 호버 사진</strong>을 바로 업로드하거나,
          <strong> 🔁 JSON 교체</strong>로 catalog에서 다시 export한 JSON으로 콘텐츠를
          갈아끼울 수 있어요 (사진·시험성적서·스타일·flavor는 보존). 사이트에 ~1~2분 후 반영됩니다.
        </p>
        <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/admin/products/upload" className="btn primary">
            + 새 제품 추가
          </Link>
          <Link href="/admin/products/categories" className="btn ghost">
            ↳ 카테고리 (하위탭) 관리
          </Link>
          <button type="button" className="btn ghost" onClick={() => void reload()}>
            새로고침
          </button>
        </div>
      </header>

      {err ? <p className="admin-err">에러: {err}</p> : null}

      {rows === null ? (
        <p className="admin-meta">로딩 중...</p>
      ) : rows.length === 0 ? (
        <div className="admin-card admin-card-flat" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--muted)' }}>등록된 제품이 없습니다.</p>
          <Link href="/admin/products/upload" className="btn primary" style={{ marginTop: 16 }}>
            첫 제품 추가하기
          </Link>
        </div>
      ) : (
        <div className="admin-product-grid">
          {rows.map((row) => (
            <div className="admin-product-card" key={row.slug}>
              {/* Side-by-side upload slots: main + hover */}
              <div className="admin-card-slots">
                <CardSlot
                  label="메인 사진"
                  hint="리스트 카드 평상시"
                  current={row.cardMain}
                  uploading={uploading.has(`${row.slug}:main`)}
                  onPick={(file) => void handleCardUpload(row, 'main', file)}
                />
                <CardSlot
                  label="호버 사진"
                  hint="마우스 올리면 표시"
                  current={row.cardHover}
                  uploading={uploading.has(`${row.slug}:hover`)}
                  onPick={(file) => void handleCardUpload(row, 'hover', file)}
                />
              </div>

              <div className="admin-product-body">
                <div className="admin-product-row">
                  <span className="admin-product-slug">
                    <code>{row.slug}</code>
                  </span>
                  {row.model ? <span className="admin-product-model">{row.model}</span> : null}
                </div>
                <h3 className="admin-product-name">{row.name}</h3>
                {row.category ? <p className="admin-product-cat">{row.category}</p> : null}

                <div className="admin-product-actions">
                  <Link
                    href={`/admin/products/${row.slug}/edit`}
                    className="btn primary small"
                  >
                    ✎ 상세 편집
                  </Link>
                  <a
                    href={`${SITE_PREVIEW_BASE}/ko/products/${row.slug}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn ghost small"
                  >
                    페이지 보기 ↗
                  </a>
                  <a
                    href={`https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/main/data/products/${row.slug}.json`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn ghost small"
                  >
                    JSON
                  </a>
                  <ReplaceJsonButton
                    busy={replacing.has(row.slug)}
                    onPick={(file) => void handleReplaceJson(row, file)}
                  />
                  <button
                    type="button"
                    className="btn danger small"
                    disabled={busy === row.slug}
                    onClick={() => void handleDelete(row)}
                  >
                    {busy === row.slug ? '삭제 중...' : '삭제'}
                  </button>
                </div>
                {replaced === row.slug ? (
                  <p className="admin-meta admin-ok" style={{ marginTop: 10 }}>
                    ✓ JSON 교체 완료 — 웹 전용 데이터(사진·시험성적서·스타일) 보존됨. ~1~2분 후 반영.
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────── */

/**
 * "🔁 JSON 교체" button with its own hidden file input + drag target,
 * so the operator can either click to pick or drop a .json straight
 * onto the button. Self-contained so each product card gets an
 * independent picker.
 */
function ReplaceJsonButton({
  busy,
  onPick,
}: {
  busy: boolean;
  onPick: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <DropTarget onFile={onPick} accept={['.json', 'application/json']} disabled={busy} style={{ borderRadius: 6 }}>
      <button
        type="button"
        className="btn ghost small"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        title="새 catalog JSON으로 이 제품 콘텐츠 교체 (사진·시험성적서·스타일은 보존)"
      >
        {busy ? '교체 중...' : '🔁 JSON 교체'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onPick(f);
        }}
      />
    </DropTarget>
  );
}

function CardSlot({
  label,
  hint,
  current,
  uploading,
  onPick,
}: {
  label: string;
  hint: string;
  current?: string;
  uploading: boolean;
  onPick: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="admin-card-slot">
      <div className="admin-card-slot-head">
        <strong>{label}</strong>
        <small>{hint}</small>
      </div>
      <DropTarget
        onFile={onPick}
        accept={['image/']}
        disabled={uploading}
        style={{ display: 'block', borderRadius: 8 }}
      >
      <button
        type="button"
        className={`admin-card-slot-zone${current ? ' has-image' : ''}${uploading ? ' is-busy' : ''}`}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title={current ? '클릭하거나 사진 끌어놓기' : '클릭하거나 사진 끌어놓기'}
      >
        {current ? (
          <>
            <img src={rewriteImage(current)} alt={label} loading="lazy" />
            <span className="admin-card-slot-overlay">
              {uploading ? '⏳ 업로드 중...' : '🖼️ 교체'}
            </span>
          </>
        ) : (
          <span className="admin-card-slot-empty">
            {uploading ? '⏳ 업로드 중...' : <>+<small>{label}</small></>}
          </span>
        )}
      </button>
      </DropTarget>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onPick(f);
        }}
      />
    </div>
  );
}
