'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { ghDeleteFile, ghGetFile, ghListDir, REPO_OWNER, REPO_NAME } from '@/lib/admin/github';

const SITE_PREVIEW_BASE = 'https://nj-safety-website.njsafety91.workers.dev';
const IMG_BASE = 'https://catalog-app.njsafety91.workers.dev';

type ProductRow = {
  slug: string;
  name: string;
  model?: string;
  category?: string;
  heroImage?: string;
  sha: string;
};

function stripTags(s: string | undefined): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim();
}

function rewriteImage(src: string | undefined): string | undefined {
  if (!src) return undefined;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith('/api/') || src.startsWith('/products/') || src.startsWith('/brand/')) {
    return `${IMG_BASE}${src}`;
  }
  return src;
}

export default function ProductsListPage() {
  const { state } = useAdmin();
  const pat = state.status === 'authenticated' ? state.pat : '';

  const [rows, setRows] = useState<ProductRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // slug being deleted

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
          let obj: Record<string, unknown> = {};
          try { obj = JSON.parse(f.content); } catch { /* ignore */ }
          const slug = (obj.slug as string) ?? path.split('/').pop()!.replace(/\.json$/, '');
          const hero = (obj.hero as { image?: string } | undefined);
          return {
            slug,
            name: stripTags((obj.name as string) ?? slug),
            model: obj.model as string | undefined,
            category: obj.category as string | undefined,
            heroImage: hero?.image,
            sha: f.sha,
          } as ProductRow;
        }),
      );
      setRows(results.filter((r): r is ProductRow => r !== null).sort((a, b) => a.slug.localeCompare(b.slug)));
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

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <span className="eyebrow">— Products</span>
        <h1>제품 <em>관리</em></h1>
        <p>
          <code>data/products/*.json</code>에 등록된 제품들입니다. 삭제하면 GitHub에서 즉시 제거되고,
          ~1~2분 뒤 사이트에서 사라집니다.
        </p>
        <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/admin/products/upload" className="btn primary">
            + 새 제품 추가
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
              <div className="admin-product-thumb">
                {row.heroImage ? (
                  <img src={rewriteImage(row.heroImage)} alt={row.name} loading="lazy" />
                ) : (
                  <span className="admin-product-thumb-ph">IMG</span>
                )}
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
                    ✎ 편집
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
                  <button
                    type="button"
                    className="btn danger small"
                    disabled={busy === row.slug}
                    onClick={() => void handleDelete(row)}
                  >
                    {busy === row.slug ? '삭제 중...' : '삭제'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
