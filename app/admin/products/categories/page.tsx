'use client';

/**
 * Admin: 제품 카테고리 (하위탭) 관리
 *
 * Lets the admin author the nav-dropdown's subcategories. Each row is
 * one category with:
 *   - id        : URL slug used at /<locale>/products/category/<id>
 *   - nameKo/En : labels shown in the dropdown + on the category page
 *   - products  : which product slugs live under this category
 *
 * Source of truth: `data/product-categories.json`, committed via the
 * GitHub Contents API like every other admin edit. After save the
 * Cloudflare build picks up the new categories on the next deploy
 * (~1–2 min) and the nav dropdown updates site-wide.
 *
 * NOTE: this page only edits the categories file. Product JSONs
 * themselves are left untouched — the relationship lives entirely on
 * the category side, so reassigning a product is a one-file commit.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import { ghGetFile, ghPutFile } from '@/lib/admin/github';
import type { ProductPageData } from '@/lib/product-page-types';

type Category = {
  id: string;
  nameKo: string;
  nameEn: string;
  productSlugs: string[];
};

type CategoriesFile = {
  categories: Category[];
  /** Editor's Pick — the slug featured on /products in the big card.
   *  Added 2026-05 alongside the products-page redesign. */
  featuredSlug?: string;
};

type ProductLite = {
  slug: string;
  name: string;
  model?: string;
  category?: string;
};

const CATEGORIES_PATH = 'data/product-categories.json';

function stripTags(s: string | undefined): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim();
}

// Slugify Korean / English text into a URL-safe id. Falls back to a
// timestamp tail when the result is empty (pure-Korean names lose all
// chars under /[a-z0-9-]/).
function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (/^[a-z0-9][a-z0-9-]*$/.test(base)) return base;
  return `cat-${Date.now().toString(36)}`;
}

function isValidId(id: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,40}$/.test(id);
}

export default function CategoriesAdminPage() {
  const { state } = useAdmin();
  const pat = state.status === 'authenticated' ? state.pat : '';

  const [categories, setCategories] = useState<Category[] | null>(null);
  const [featuredSlug, setFeaturedSlug] = useState<string>('');
  const [sha, setSha] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductLite[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  /** Pull categories file + the live product list (for the picker). */
  const reload = useCallback(async () => {
    if (!pat) return;
    setErr(null);
    setCategories(null);
    setProducts(null);
    try {
      // Categories — may not exist yet on a fresh install; treat 404 as empty.
      const f = await ghGetFile(pat, CATEGORIES_PATH);
      if (f) {
        const parsed = JSON.parse(f.content) as CategoriesFile;
        setCategories(parsed.categories ?? []);
        setFeaturedSlug(parsed.featuredSlug ?? '');
        setSha(f.sha);
      } else {
        setCategories([]);
        setFeaturedSlug('');
        setSha(null);
      }

      // Product list — name + slug only, for the assignment picker.
      const dirRes = await fetch(
        `https://api.github.com/repos/bangbongfather-sys/nj-safety-website/contents/data/products?ref=main`,
        { headers: { Authorization: `token ${pat}`, Accept: 'application/vnd.github+json' } },
      );
      const dirJson = (await dirRes.json()) as Array<{ path: string; type: string }>;
      const jsonFiles = (Array.isArray(dirJson) ? dirJson : [])
        .filter((e) => e.type === 'file' && e.path.endsWith('.json'))
        .map((e) => e.path);

      const productRows: ProductLite[] = [];
      for (const path of jsonFiles) {
        const pf = await ghGetFile(pat, path);
        if (!pf) continue;
        try {
          const obj = JSON.parse(pf.content) as ProductPageData;
          const slug = obj.slug ?? path.split('/').pop()!.replace(/\.json$/, '');
          productRows.push({
            slug,
            name: stripTags(obj.name ?? slug),
            model: obj.model,
            category: obj.category,
          });
        } catch {
          // Skip unparseable JSONs — they'll get flagged on the products page.
        }
      }
      productRows.sort((a, b) => a.slug.localeCompare(b.slug));
      setProducts(productRows);
      setDirty(false);
      setSavedAt(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [pat]);

  useEffect(() => { void reload(); }, [reload]);

  /** Mutator helpers — every one of these flips `dirty` so the save bar shows. */
  const mutate = useCallback((fn: (list: Category[]) => Category[]) => {
    setCategories((cur) => (cur ? fn(cur) : cur));
    setDirty(true);
    setSavedAt(null);
  }, []);

  const handleAdd = () => {
    mutate((list) => [
      ...list,
      {
        id: `cat-${Date.now().toString(36)}`,
        nameKo: '새 카테고리',
        nameEn: 'New Category',
        productSlugs: [],
      },
    ]);
  };

  const handleDelete = (idx: number) => {
    const cur = categories?.[idx];
    if (!cur) return;
    const ok = window.confirm(
      `"${cur.nameKo}" 카테고리를 삭제할까요?\n\n` +
      `이 카테고리에 속한 제품들은 그대로 남고, 다른 카테고리에 다시 배정할 수 있어요.`,
    );
    if (!ok) return;
    mutate((list) => list.filter((_, i) => i !== idx));
  };

  const handleMove = (idx: number, dir: -1 | 1) => {
    mutate((list) => {
      const next = [...list];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return list;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handlePatch = (idx: number, patch: Partial<Category>) => {
    mutate((list) => list.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const handleToggleProduct = (idx: number, slug: string) => {
    mutate((list) =>
      list.map((c, i) => {
        if (i !== idx) return c;
        const has = c.productSlugs.includes(slug);
        return {
          ...c,
          productSlugs: has
            ? c.productSlugs.filter((s) => s !== slug)
            : [...c.productSlugs, slug],
        };
      }),
    );
  };

  /** Reorder a single product within a category's productSlugs list. */
  const handleMoveProduct = (idx: number, slug: string, dir: -1 | 1) => {
    mutate((list) =>
      list.map((c, i) => {
        if (i !== idx) return c;
        const arr = [...c.productSlugs];
        const pos = arr.indexOf(slug);
        if (pos < 0) return c;
        const target = pos + dir;
        if (target < 0 || target >= arr.length) return c;
        [arr[pos], arr[target]] = [arr[target], arr[pos]];
        return { ...c, productSlugs: arr };
      }),
    );
  };

  /** Validate + serialise + commit. */
  const handleSave = useCallback(async () => {
    if (!pat || !categories) return;

    // Pre-flight: ids must be unique + valid.
    const ids = new Set<string>();
    for (const c of categories) {
      if (!isValidId(c.id)) {
        setErr(`잘못된 카테고리 ID: "${c.id}". 영소문자/숫자/하이픈만 사용해주세요.`);
        return;
      }
      if (ids.has(c.id)) {
        setErr(`중복된 카테고리 ID: "${c.id}". 각 카테고리는 고유 ID가 필요합니다.`);
        return;
      }
      ids.add(c.id);
      if (!c.nameKo.trim() && !c.nameEn.trim()) {
        setErr(`이름이 비어 있는 카테고리가 있습니다 (id: "${c.id}").`);
        return;
      }
    }

    setSaving(true);
    setErr(null);
    try {
      // Include featuredSlug in the write — empty string drops the
      // Editor's Pick; the public page falls back to the first
      // available product when featuredSlug is unset.
      const out: CategoriesFile = { categories };
      if (featuredSlug) out.featuredSlug = featuredSlug;
      const text = JSON.stringify(out, null, 2) + '\n';
      const r = await ghPutFile(
        pat,
        CATEGORIES_PATH,
        text,
        `chore(products): update categories (${categories.length} total)`,
        sha,
      );
      setSha(r.contentSha || null);
      setDirty(false);
      setSavedAt(Date.now());
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [pat, categories, sha, featuredSlug]);

  // Lookup helper for the product picker — turns a slug into a label.
  const productMap = useMemo(() => {
    const m = new Map<string, ProductLite>();
    for (const p of products ?? []) m.set(p.slug, p);
    return m;
  }, [products]);

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <span className="eyebrow">— Products / Categories</span>
        <h1>카테고리 <em>(하위탭)</em></h1>
        <p>
          상단 메뉴 <strong>제품</strong>에 마우스를 올리면 펼쳐지는 하위탭입니다.
          각 카테고리에 속할 제품을 선택해서 정리할 수 있어요. 저장하면 GitHub에
          커밋되고, 1~2분 뒤 라이브 사이트에 반영됩니다.
        </p>
        <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn primary" onClick={handleAdd}>
            + 새 카테고리
          </button>
          <button type="button" className="btn ghost" onClick={() => void reload()}>
            새로고침
          </button>
          <Link href="/admin/products" className="btn ghost">
            ← 제품 관리로
          </Link>
        </div>
      </header>

      {err ? <p className="admin-err">에러: {err}</p> : null}

      {/* ── Featured product (Editor's Pick) ────────────────────────
        * Renders the big card at the top of /products. One slug only —
        * empty = no featured picked, public page falls back to the
        * first available product. */}
      {products !== null ? (
        <div
          className="admin-card admin-card-flat"
          style={{ padding: 20, marginBottom: 24, display: 'grid', gap: 14 }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 15 }}>
              ⭐ 이번 시즌 대표작 (Editor's Pick)
            </strong>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              /products 페이지 상단 큰 카드에 노출됩니다
            </span>
          </div>
          <label style={{ display: 'block' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
              제품 선택
            </div>
            <select
              value={featuredSlug}
              onChange={(e) => {
                setFeaturedSlug(e.target.value);
                setDirty(true);
                setSavedAt(null);
              }}
              style={{
                width: '100%',
                maxWidth: 480,
                padding: '10px 12px',
                background: 'rgba(255,255,255,.04)',
                border: '1px solid var(--border-soft)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 14,
              }}
            >
              <option value="">— 선택 안 함 (첫 번째 제품 자동 사용) —</option>
              {(products ?? []).map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} {p.model ? `· ${p.model}` : ''} ({p.slug})
                </option>
              ))}
            </select>
          </label>
          {featuredSlug ? (
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
              현재 선택: <code>{featuredSlug}</code> — 저장하면 /products 페이지 상단에 큰 Featured 카드로 노출
            </p>
          ) : null}
        </div>
      ) : null}

      {categories === null || products === null ? (
        <p className="admin-meta">로딩 중...</p>
      ) : categories.length === 0 ? (
        <div className="admin-card admin-card-flat" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--muted)' }}>
            아직 등록된 카테고리가 없습니다. 위 <strong>+ 새 카테고리</strong> 버튼으로 시작하세요.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {categories.map((c, idx) => (
            <CategoryRow
              key={`${c.id}-${idx}`}
              category={c}
              index={idx}
              total={categories.length}
              products={products}
              productMap={productMap}
              onPatch={(patch) => handlePatch(idx, patch)}
              onDelete={() => handleDelete(idx)}
              onMove={(dir) => handleMove(idx, dir)}
              onToggleProduct={(slug) => handleToggleProduct(idx, slug)}
              onMoveProduct={(slug, dir) => handleMoveProduct(idx, slug, dir)}
            />
          ))}
        </div>
      )}

      {/* Sticky save bar — slides up whenever there are unsaved edits. */}
      {dirty || saving || savedAt ? (
        <div className="cat-save-bar">
          <div className="cat-save-bar-inner">
            {dirty ? (
              <span className="cat-save-state cat-save-state-dirty">● 저장하지 않은 변경사항</span>
            ) : saving ? (
              <span className="cat-save-state">⏳ 저장 중...</span>
            ) : savedAt ? (
              <span className="cat-save-state cat-save-state-saved">✓ 저장됨</span>
            ) : null}
            <button
              type="button"
              className="btn primary"
              disabled={!dirty || saving}
              onClick={() => void handleSave()}
            >
              {saving ? '저장 중...' : '저장 (GitHub에 커밋)'}
            </button>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .cat-save-bar {
          position: sticky;
          bottom: 16px;
          margin-top: 32px;
          z-index: 20;
        }
        .cat-save-bar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          background: rgba(20, 20, 22, .98);
          border: 1px solid var(--border-soft);
          border-radius: 12px;
          padding: 14px 18px;
          box-shadow: 0 16px 40px rgba(0,0,0,.45);
          backdrop-filter: saturate(150%) blur(14px);
        }
        .cat-save-state { font-size: 13px; color: var(--muted); }
        .cat-save-state-dirty { color: #ffb066; }
        .cat-save-state-saved { color: #4ade80; }
      `}</style>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────── */

function CategoryRow({
  category,
  index,
  total,
  products,
  productMap,
  onPatch,
  onDelete,
  onMove,
  onToggleProduct,
  onMoveProduct,
}: {
  category: Category;
  index: number;
  total: number;
  products: ProductLite[];
  productMap: Map<string, ProductLite>;
  onPatch: (patch: Partial<Category>) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  onToggleProduct: (slug: string) => void;
  onMoveProduct: (slug: string, dir: -1 | 1) => void;
}) {
  // Build the "선택 안 됨" list — products NOT currently in this category.
  const selectedSet = useMemo(() => new Set(category.productSlugs), [category.productSlugs]);
  const unselected = products.filter((p) => !selectedSet.has(p.slug));

  return (
    <div className="admin-card admin-card-flat" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="btn ghost small"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            title="위로"
          >
            ↑
          </button>
          <button
            type="button"
            className="btn ghost small"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            title="아래로"
          >
            ↓
          </button>
          <span style={{ marginLeft: 8, color: 'var(--muted)', fontSize: 13 }}>
            #{index + 1}
          </span>
        </div>
        <button type="button" className="btn danger small" onClick={onDelete}>
          삭제
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Field
          label="이름 (한국어)"
          hint="드롭다운에 보일 텍스트"
          value={category.nameKo}
          onChange={(v) => onPatch({ nameKo: v })}
        />
        <Field
          label="Name (English)"
          hint="Shown when locale = en"
          value={category.nameEn}
          onChange={(v) => onPatch({ nameEn: v })}
        />
        <Field
          label="URL ID"
          hint="/products/category/[ID]"
          value={category.id}
          onChange={(v) => onPatch({ id: v.trim() })}
          mono
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <strong style={{ fontSize: 13 }}>
          이 카테고리에 속한 제품 ({category.productSlugs.length})
        </strong>
        <button
          type="button"
          className="btn ghost small"
          onClick={() => {
            const auto = slugify(category.nameKo || category.nameEn);
            if (auto && auto !== category.id) onPatch({ id: auto });
          }}
          title="이름에서 ID 자동 생성"
        >
          ID 자동
        </button>
      </div>

      {category.productSlugs.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 12px' }}>
          아직 선택된 제품이 없습니다. 아래 목록에서 추가하세요.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'grid', gap: 6 }}>
          {category.productSlugs.map((slug, i) => {
            const p = productMap.get(slug);
            return (
              <li
                key={slug}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  background: 'rgba(255,255,255,.03)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 8,
                }}
              >
                <span style={{ flex: 1 }}>
                  <strong style={{ fontSize: 14 }}>
                    {p?.name ?? slug}
                  </strong>
                  <span style={{ color: 'var(--muted)', marginLeft: 8, fontSize: 12 }}>
                    <code>{slug}</code>
                    {p?.model ? ` · ${p.model}` : ''}
                    {!p ? ' · (존재하지 않는 제품)' : ''}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn ghost small"
                  disabled={i === 0}
                  onClick={() => onMoveProduct(slug, -1)}
                  title="앞으로"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn ghost small"
                  disabled={i === category.productSlugs.length - 1}
                  onClick={() => onMoveProduct(slug, 1)}
                  title="뒤로"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn danger small"
                  onClick={() => onToggleProduct(slug)}
                  title="이 카테고리에서 제거"
                >
                  제거
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {unselected.length > 0 ? (
        <details style={{ marginTop: 4 }}>
          <summary
            style={{
              cursor: 'pointer',
              color: 'var(--muted)',
              fontSize: 13,
              padding: '6px 0',
            }}
          >
            + 추가 가능한 제품 ({unselected.length})
          </summary>
          <div
            style={{
              marginTop: 8,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 6,
            }}
          >
            {unselected.map((p) => (
              <button
                key={p.slug}
                type="button"
                className="btn ghost small"
                style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                onClick={() => onToggleProduct(p.slug)}
                title={`${p.slug} 추가`}
              >
                + {p.name}
              </button>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  mono,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  mono?: boolean;
}) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
        {label}
        {hint ? <span style={{ marginLeft: 6, opacity: .7 }}>· {hint}</span> : null}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 10px',
          background: 'rgba(255,255,255,.04)',
          border: '1px solid var(--border-soft)',
          borderRadius: 8,
          color: 'var(--text)',
          fontFamily: mono ? 'var(--mono)' : 'inherit',
          fontSize: 14,
        }}
      />
    </label>
  );
}
