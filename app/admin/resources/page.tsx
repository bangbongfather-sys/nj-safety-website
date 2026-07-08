'use client';

/**
 * Admin: 자료실 (Resources) 통합 관리
 *
 * One screen to manage every downloadable on the site:
 *   - The brand-level **카탈로그 PDF** (stored in
 *     `data/site-resources.json`).
 *   - **시험성적서 PDF** per product (stored on each product's
 *     `data/products/<slug>.json` under `testReports.files`).
 *
 * Both upload through the same R2 path that powers product image
 * uploads (`/api/admin/upload-image`). After R2 returns, we PUT
 * the matching JSON file back through the GitHub Contents API so
 * the next Cloudflare build picks the link up site-wide.
 *
 * NOTE: this page does NOT delete the actual R2 object when an
 * entry is removed — it only drops the reference from JSON. That's
 * intentional (R2 is cheap; we keep the file in case the admin
 * un-removes it later). If you need real deletion, do it via the
 * Cloudflare R2 dashboard.
 */

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { ghGetFile, ghPutFile, ghListDir, REPO_OWNER, REPO_NAME } from '@/lib/admin/github';
import type { ProductPageData, ProductTestReportFile } from '@/lib/product-page-types';
import DropTarget from '@/components/admin/DropTarget';

const SITE_RESOURCES_PATH = 'data/site-resources.json';
const UPLOAD_ENDPOINT = '/api/admin/upload-image';
const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB — matches the Worker cap

type CatalogFile = {
  pdfUrl?: string;
  uploadedAt?: string;
  size?: number;
  label?: string;
};
type SiteResources = { catalog?: CatalogFile };

type ProductRow = {
  slug: string;
  name: string;
  model?: string;
  category?: string;
  testReports: ProductTestReportFile[];
  sha: string;
  raw: ProductPageData;
};

function stripTags(s: string | undefined): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim();
}

function fmtSize(n?: number): string {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function sanitizePdfName(name: string): string {
  // ASCII-only — the upload Worker's KEY_RE is /^[a-z0-9_\-./]+$/i
  // and rejects every other code point with a 400 (Invalid key).
  // We tried keeping Korean here originally but the Worker doesn't
  // accept it, so any 한글 파일명 strip down to hyphens here. The
  // display name (file.name) is still stored separately on the
  // testReport entry, so the user-visible label keeps the Korean.
  return name
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

async function uploadPdfToR2(
  pat: string,
  key: string,
  file: File,
): Promise<{ publicUrl: string; size: number }> {
  if (file.size > MAX_PDF_BYTES) {
    throw new Error(`파일이 너무 큽니다 (최대 ${MAX_PDF_BYTES / 1024 / 1024}MB)`);
  }
  const r = await fetch(`${UPLOAD_ENDPOINT}?key=${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${pat}`,
      'Content-Type': 'application/pdf',
    },
    body: file,
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => `${r.status}`);
    throw new Error(`R2 업로드 실패: ${r.status} — ${txt.slice(0, 200)}`);
  }
  const data = (await r.json()) as { publicUrl?: string; size?: number };
  if (!data.publicUrl) throw new Error('R2 응답이 잘못되었습니다');
  return { publicUrl: data.publicUrl, size: data.size ?? file.size };
}

export default function ResourcesAdminPage() {
  const { state } = useAdmin();
  const pat = state.status === 'authenticated' ? state.pat : '';

  const [catalog, setCatalog] = useState<CatalogFile | null>(null);
  const [catalogSha, setCatalogSha] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  /** Pull both site-resources.json and every product JSON. */
  const reload = useCallback(async () => {
    if (!pat) return;
    setErr(null);
    setCatalog(null);
    setProducts(null);
    try {
      // ── catalog ──
      const catFile = await ghGetFile(pat, SITE_RESOURCES_PATH);
      if (catFile) {
        const parsed = JSON.parse(catFile.content) as SiteResources;
        setCatalog(parsed.catalog ?? {});
        setCatalogSha(catFile.sha);
      } else {
        // File missing — seed with empty catalog block. We won't PUT
        // until the admin actually uploads something.
        setCatalog({});
        setCatalogSha(null);
      }

      // ── products + their testReports ──
      const productPaths = await ghListDir(pat, 'data/products');
      const rows: ProductRow[] = [];
      for (const path of productPaths.filter((p) => p.endsWith('.json'))) {
        const f = await ghGetFile(pat, path);
        if (!f) continue;
        let obj: ProductPageData;
        try {
          obj = JSON.parse(f.content) as ProductPageData;
        } catch {
          continue;
        }
        const slug = obj.slug ?? path.split('/').pop()!.replace(/\.json$/, '');
        rows.push({
          slug,
          name: stripTags(obj.name ?? slug),
          model: obj.model,
          category: obj.category,
          testReports: obj.testReports?.files ?? [],
          sha: f.sha,
          raw: obj,
        });
      }
      rows.sort((a, b) => a.slug.localeCompare(b.slug));
      setProducts(rows);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [pat]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /* ──────────────── Catalog handlers ──────────────── */

  const handleCatalogUpload = useCallback(
    async (file: File) => {
      if (!pat) return;
      setBusyKey('catalog');
      setErr(null);
      try {
        // Stable key so re-uploads overwrite; cache-bust via ?v=.
        const safe = sanitizePdfName(file.name) || 'catalog';
        const key = `resources/catalog-${Date.now()}-${safe}.pdf`;
        const up = await uploadPdfToR2(pat, key, file);
        const newCatalog: CatalogFile = {
          pdfUrl: `${up.publicUrl}?v=${Date.now()}`,
          uploadedAt: new Date().toISOString(),
          size: up.size,
          label: catalog?.label || 'NJ SAFETY 카탈로그',
        };

        // Read-modify-write data/site-resources.json
        const fresh = await ghGetFile(pat, SITE_RESOURCES_PATH);
        const parsed = fresh ? (JSON.parse(fresh.content) as SiteResources) : {};
        const merged: SiteResources = { ...parsed, catalog: newCatalog };
        const text = JSON.stringify(merged, null, 2) + '\n';
        const r = await ghPutFile(
          pat,
          SITE_RESOURCES_PATH,
          text,
          `chore(resources): update catalog PDF`,
          fresh?.sha ?? catalogSha,
        );
        setCatalogSha(r.contentSha || fresh?.sha || null);
        setCatalog(newCatalog);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setBusyKey(null);
      }
    },
    [pat, catalog, catalogSha],
  );

  const handleCatalogDelete = useCallback(async () => {
    if (!pat) return;
    if (!window.confirm('카탈로그 PDF 링크를 제거할까요?\n(R2 의 실제 파일은 그대로 남고, 사이트에서만 안 보이게 됩니다.)')) return;
    setBusyKey('catalog');
    setErr(null);
    try {
      const fresh = await ghGetFile(pat, SITE_RESOURCES_PATH);
      const parsed = fresh ? (JSON.parse(fresh.content) as SiteResources) : {};
      const merged: SiteResources = {
        ...parsed,
        catalog: { ...(parsed.catalog ?? {}), pdfUrl: '', uploadedAt: '', size: 0 },
      };
      const text = JSON.stringify(merged, null, 2) + '\n';
      const r = await ghPutFile(
        pat,
        SITE_RESOURCES_PATH,
        text,
        `chore(resources): remove catalog PDF link`,
        fresh?.sha ?? catalogSha,
      );
      setCatalogSha(r.contentSha || fresh?.sha || null);
      setCatalog(merged.catalog ?? {});
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyKey(null);
    }
  }, [pat, catalogSha]);

  /* ──────────────── Per-product test-reports handlers ──────────────── */

  // Per-slug serial queue so two rapid clicks don't race the same JSON file.
  const queueBySlug = useRef<Map<string, Promise<void>>>(new Map());

  const updateProductReports = useCallback(
    async (
      slug: string,
      mutator: (current: ProductTestReportFile[]) => ProductTestReportFile[],
      commitMessage: string,
    ) => {
      if (!pat) return;
      const prev = queueBySlug.current.get(slug) ?? Promise.resolve();
      const next = prev.then(async () => {
        // Always re-fetch fresh — the in-memory row may be stale if the
        // per-product editor saved in another tab between mount and now.
        const fresh = await ghGetFile(pat, `data/products/${slug}.json`);
        if (!fresh) throw new Error(`data/products/${slug}.json 가 사라졌습니다`);
        const obj = JSON.parse(fresh.content) as ProductPageData;
        const currentFiles = obj.testReports?.files ?? [];
        const nextFiles = mutator(currentFiles);
        const merged: ProductPageData = {
          ...obj,
          testReports: { ...(obj.testReports ?? {}), files: nextFiles },
        };
        const text = JSON.stringify(merged, null, 2) + '\n';
        const r = await ghPutFile(
          pat,
          `data/products/${slug}.json`,
          text,
          commitMessage,
          fresh.sha,
        );
        // Patch local row
        setProducts((cur) => {
          if (!cur) return cur;
          return cur.map((row) =>
            row.slug !== slug
              ? row
              : { ...row, testReports: nextFiles, sha: r.contentSha || fresh.sha, raw: merged },
          );
        });
      });
      queueBySlug.current.set(slug, next);
      await next;
    },
    [pat],
  );

  const handleReportUpload = useCallback(
    async (row: ProductRow, file: File) => {
      const key = `report:${row.slug}`;
      setBusyKey(key);
      setErr(null);
      try {
        const safe = sanitizePdfName(file.name) || 'report';
        const r2Key = `products/${row.slug}/reports/${Date.now()}-${safe}.pdf`;
        const up = await uploadPdfToR2(pat, r2Key, file);
        const newFile: ProductTestReportFile = {
          url: `${up.publicUrl}?v=${Date.now()}`,
          name: file.name.replace(/\.pdf$/i, ''),
          size: up.size,
          uploadedAt: new Date().toISOString(),
        };
        await updateProductReports(
          row.slug,
          (current) => [...current, newFile],
          `chore(products): add test report to ${row.slug}`,
        );
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setBusyKey(null);
      }
    },
    [pat, updateProductReports],
  );

  const handleReportDelete = useCallback(
    async (row: ProductRow, idx: number) => {
      const file = row.testReports[idx];
      if (!file) return;
      if (
        !window.confirm(
          `"${file.name || '시험성적서'}" 를 목록에서 제거할까요?\n(R2 의 실제 PDF 는 그대로 남습니다.)`,
        )
      )
        return;
      const key = `report:${row.slug}:${idx}`;
      setBusyKey(key);
      setErr(null);
      try {
        await updateProductReports(
          row.slug,
          (current) => current.filter((_, i) => i !== idx),
          `chore(products): remove test report ${idx} from ${row.slug}`,
        );
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setBusyKey(null);
      }
    },
    [updateProductReports],
  );

  /* ──────────────── Render ──────────────── */

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <span className="eyebrow">— Resources</span>
        <h1>자료실 <em>관리</em></h1>
        <p>
          공개 <code>/resources</code> 페이지에 노출되는 모든 다운로드 자료를 한 곳에서 관리합니다.
          각 카드에 <strong>파일을 끌어다 놓거나</strong> 버튼으로 선택하면 업로드됩니다.
          업로드하면 GitHub 에 커밋되고, 1~2분 뒤 라이브 사이트에 반영됩니다.
        </p>
        <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a
            href="/ko/resources/"
            target="_blank"
            rel="noreferrer"
            className="btn ghost"
          >
            공개 자료실 페이지 ↗
          </a>
          <button type="button" className="btn ghost" onClick={() => void reload()}>
            새로고침
          </button>
        </div>
      </header>

      {err ? <p className="admin-err">에러: {err}</p> : null}

      {/* ─── Section 1: Catalog PDF ─────────────────────────────────── */}
      <section style={{ marginTop: 24 }}>
        <h2
          style={{
            fontFamily: 'var(--display)',
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: '-.012em',
            marginBottom: 12,
          }}
        >
          📘 카탈로그 PDF
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px' }}>
          전 제품 라인업이 담긴 단일 PDF. 자료실 메인 카드에 노출됩니다.
        </p>

        {catalog === null ? (
          <p className="admin-meta">로딩 중...</p>
        ) : (
          <CatalogCard
            catalog={catalog}
            busy={busyKey === 'catalog'}
            onUpload={(f) => void handleCatalogUpload(f)}
            onDelete={() => void handleCatalogDelete()}
          />
        )}
      </section>

      {/* ─── Section 2: Test reports per product ────────────────────── */}
      <section style={{ marginTop: 48 }}>
        <h2
          style={{
            fontFamily: 'var(--display)',
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: '-.012em',
            marginBottom: 12,
          }}
        >
          📄 시험성적서 (제품별)
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px' }}>
          각 제품의 KC · NFPA · EN ISO 시험성적서 PDF. 제품 상세 페이지의 <strong>시험성적서</strong> 탭과 자료실 통합 리스트에 동시에 노출됩니다.
        </p>

        {products === null ? (
          <p className="admin-meta">로딩 중...</p>
        ) : products.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>등록된 제품이 없습니다.</p>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {products.map((row) => (
              <ProductReportsCard
                key={row.slug}
                row={row}
                busyKey={busyKey}
                onUpload={(f) => void handleReportUpload(row, f)}
                onDelete={(i) => void handleReportDelete(row, i)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function CatalogCard({
  catalog,
  busy,
  onUpload,
  onDelete,
}: {
  catalog: CatalogFile;
  busy: boolean;
  onUpload: (file: File) => void;
  onDelete: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasFile = !!catalog.pdfUrl;
  return (
    <DropTarget
      onFile={onUpload}
      accept={['application/pdf', '.pdf']}
      disabled={busy}
      hint="PDF 끌어놓기"
      className="admin-card admin-card-flat"
      style={{ padding: 24, display: 'grid', gap: 14, borderRadius: 14 }}
    >
      {hasFile ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 32 }}>📕</span>
            <div style={{ flex: 1, minWidth: 200 }}>
              <strong style={{ fontSize: 16 }}>{catalog.label || '카탈로그'}</strong>
              <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
                {fmtSize(catalog.size)} · 업로드 {fmtDate(catalog.uploadedAt)}
              </div>
            </div>
            <a
              href={catalog.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="btn ghost small"
            >
              현재 PDF 열기 ↗
            </a>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) onUpload(f);
              }}
            />
            <button
              type="button"
              className="btn primary small"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? '⏳ 업로드 중...' : '🖼️ 새 PDF 로 교체'}
            </button>
            <button
              type="button"
              className="btn danger small"
              disabled={busy}
              onClick={onDelete}
            >
              삭제 (링크만)
            </button>
          </div>
        </>
      ) : (
        <>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            아직 등록된 카탈로그 PDF 가 없습니다. 자료실 메인 카드는 비활성 상태로 노출됩니다.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) onUpload(f);
            }}
          />
          <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            style={{ justifySelf: 'flex-start' }}
          >
            {busy ? '⏳ 업로드 중...' : '＋ 카탈로그 PDF 업로드'}
          </button>
        </>
      )}
    </DropTarget>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function ProductReportsCard({
  row,
  busyKey,
  onUpload,
  onDelete,
}: {
  row: ProductRow;
  busyKey: string | null;
  onUpload: (file: File) => void;
  onDelete: (idx: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadBusy = busyKey === `report:${row.slug}`;
  return (
    <DropTarget
      onFile={onUpload}
      accept={['application/pdf', '.pdf']}
      disabled={uploadBusy}
      hint="PDF 끌어놓기"
      className="admin-card admin-card-flat"
      style={{ padding: 20, borderRadius: 12 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <strong style={{ fontSize: 15 }}>{row.name}</strong>
        {row.model ? (
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>{row.model}</span>
        ) : null}
        <code style={{ color: 'var(--muted)', fontSize: 12 }}>{row.slug}</code>
        <Link
          href={`/admin/products/${row.slug}/edit`}
          style={{
            marginLeft: 'auto',
            fontSize: 12,
            color: 'var(--muted)',
            textDecoration: 'underline',
          }}
        >
          제품 편집 →
        </Link>
      </div>

      {row.testReports.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 12px' }}>
          이 제품에는 아직 등록된 시험성적서가 없습니다.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px', display: 'grid', gap: 6 }}>
          {row.testReports.map((file, i) => {
            const delBusy = busyKey === `report:${row.slug}:${i}`;
            return (
              <li
                key={file.url + i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,.03)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                <span style={{ fontSize: 18 }}>📄</span>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex: 1,
                    color: 'inherit',
                    textDecoration: 'none',
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {file.name || `시험성적서 ${i + 1}`}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>
                    {fmtSize(file.size)}
                    {file.uploadedAt ? ` · ${fmtDate(file.uploadedAt)}` : ''}
                  </div>
                </a>
                <button
                  type="button"
                  className="btn danger small"
                  disabled={delBusy}
                  onClick={() => onDelete(i)}
                  title="목록에서 제거 (R2 파일은 남음)"
                >
                  {delBusy ? '…' : '삭제'}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onUpload(f);
        }}
      />
      <button
        type="button"
        className="btn ghost small"
        disabled={uploadBusy}
        onClick={() => inputRef.current?.click()}
      >
        {uploadBusy ? '⏳ 업로드 중...' : '＋ 시험성적서 PDF 추가'}
      </button>
    </DropTarget>
  );
}
