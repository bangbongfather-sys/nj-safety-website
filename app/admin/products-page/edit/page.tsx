'use client';

/**
 * /admin/products-page/edit — WYSIWYG editor for the /products listing.
 *
 * Mirrors /admin/about/edit's structure: load ko/en JSON from GitHub,
 * render the same public ProductsListing component with an editor
 * prop, ship dict patches back to GitHub on save (manual + 60s
 * autosave). Live preview, lang toggle, FloatingToolbar — all the
 * same primitives as the other inline editors.
 *
 * NOTE: products + categories + site-resources are also fetched from
 * GitHub at mount time so the preview shows the real catalog. The
 * featuredSlug + per-category list aren't edited here — that's the
 * job of /admin/products/categories.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminContext';
import type { EditorApi } from '@/components/admin/EditableText';
import FloatingToolbar, { type FocusInfo } from '@/components/admin/FloatingToolbar';
import ResizeHandle from '@/components/admin/ResizeHandle';
import ImageSlotPanel from '@/components/admin/ImageSlotPanel';
import StyleInjector from '@/components/admin/StyleInjector';
import { ghGetFile, ghPutFile, ghListDir } from '@/lib/admin/github';
import type { Dictionary, FieldStyle, Locale } from '@/lib/i18n';
import type { ProductPageData } from '@/lib/product-page-types';
import type { Product } from '@/lib/products';
import type { ProductCategory } from '@/lib/product-categories';

import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import ProductsListing from '@/components/sections/products/ProductsListing';
import '@/components/sections/products/products-listing.css';

const KO_PATH = 'locales/ko.json';
const EN_PATH = 'locales/en.json';
const CATEGORIES_PATH = 'data/product-categories.json';
const SITE_RESOURCES_PATH = 'data/site-resources.json';

function parsePath(p: string): (string | number)[] {
  const out: (string | number)[] = [];
  for (const part of p.split('.')) {
    const m = part.match(/^([^[]+)(\[(\d+)\])*$/);
    if (!m) { out.push(part); continue; }
    out.push(m[1]);
    const idxs = part.matchAll(/\[(\d+)\]/g);
    for (const im of idxs) out.push(Number(im[1]));
  }
  return out;
}

function setIn(obj: unknown, path: (string | number)[], value: unknown): unknown {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  // Numeric path segments mean we're stepping INTO an array. If the
  // current obj isn't already an array, create one — otherwise editing
  // a fresh `basicInfo.primary[0].value` on a product with no basicInfo
  // block at all would leave behind { primary: { "0": {...} } } (a plain
  // object keyed by "0") instead of [{...}], and any later .map() over
  // that path would throw "X.map is not a function".
  if (typeof head === 'number') {
    const arr: unknown[] = Array.isArray(obj) ? [...(obj as unknown[])] : [];
    arr[head] = setIn(arr[head], rest, value);
    return arr;
  }
  const src = (obj as Record<string, unknown>) ?? {};
  return { ...src, [String(head)]: setIn(src[String(head)], rest, value) };
}

function getIn(obj: unknown, path: (string | number)[]): unknown {
  let cur: unknown = obj;
  for (const k of path) {
    if (cur == null) return undefined;
    cur = (cur as Record<string | number, unknown>)[k];
  }
  return cur;
}

/** Per-product file metadata so we can PUT the right path + SHA back. */
type ProductFile = { slug: string; path: string; sha: string };

type Load =
  | { status: 'loading' }
  | {
      status: 'ready';
      ko: Dictionary;
      en: Dictionary;
      koSha: string;
      enSha: string;
      products: Product[];
      productFiles: ProductFile[];
      categories: ProductCategory[];
      featuredSlug?: string;
      catalogUrl?: string;
    }
  | { status: 'error'; message: string };

type Save = { status: 'idle' } | { status: 'saving' } | { status: 'done'; sha: string } | { status: 'error'; message: string };

export default function EditProductsListPage() {
  const { state } = useAdmin();
  const pat = state.status === 'authenticated' ? state.pat : '';

  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [koDraft, setKoDraft] = useState<Dictionary | null>(null);
  const [enDraft, setEnDraft] = useState<Dictionary | null>(null);
  // Inline-editable product cards write to these drafts (one per
  // product JSON). Saved back to data/products/<slug>.json on save.
  const [productDrafts, setProductDrafts] = useState<Product[] | null>(null);
  const [active, setActive] = useState<Locale>('ko');
  const [save, setSave] = useState<Save>({ status: 'idle' });
  const [focused, setFocused] = useState<FocusInfo | null>(null);
  const [imageSlot, setImageSlot] = useState<{ path: string } | null>(null);
  // Synchronous guard against overlapping saves (autosave vs manual).
  const savingRef = useRef(false);

  // Focus tracking for FloatingToolbar
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      const path = el?.dataset?.editPath;
      if (path) setFocused({ path });
    };
    const onFocusOut = (e: FocusEvent) => {
      const next = (e as FocusEvent & { relatedTarget?: EventTarget | null }).relatedTarget as HTMLElement | null;
      if (next && next.closest('.ed-toolbar')) return;
      if (next && (next as HTMLElement).dataset?.editPath) return;
      setTimeout(() => setFocused(null), 150);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // Load locales + product catalog state on mount.
  useEffect(() => {
    if (!pat) return;
    let cancelled = false;
    (async () => {
      try {
        const [ko, en, catsFile, siteFile, productPaths] = await Promise.all([
          ghGetFile(pat, KO_PATH),
          ghGetFile(pat, EN_PATH),
          ghGetFile(pat, CATEGORIES_PATH),
          ghGetFile(pat, SITE_RESOURCES_PATH),
          ghListDir(pat, 'data/products'),
        ]);
        if (cancelled) return;
        if (!ko || !en) throw new Error('로케일 파일을 찾을 수 없습니다');

        // Parse products. Each product is its own JSON — load in parallel.
        // Track each file's path + sha alongside the parsed product so
        // inline edits here can PUT the right file back on save.
        const jsonPaths = productPaths.filter((p) => p.endsWith('.json'));
        const productFileResults = await Promise.all(jsonPaths.map((p) => ghGetFile(pat, p)));
        const products: Product[] = [];
        const productFiles: ProductFile[] = [];
        jsonPaths.forEach((path, i) => {
          const f = productFileResults[i];
          if (!f) return;
          try {
            const obj = JSON.parse(f.content) as ProductPageData;
            const prod = obj as Product;
            products.push(prod);
            productFiles.push({ slug: prod.slug, path, sha: f.sha });
          } catch {
            // skip malformed file
          }
        });
        products.sort((a, b) => a.slug.localeCompare(b.slug));

        const cats = catsFile ? (JSON.parse(catsFile.content) as { categories: ProductCategory[]; featuredSlug?: string }) : { categories: [] };
        const site = siteFile ? (JSON.parse(siteFile.content) as { catalog?: { pdfUrl?: string } }) : {};

        const koObj = JSON.parse(ko.content) as Dictionary;
        const enObj = JSON.parse(en.content) as Dictionary;

        setLoad({
          status: 'ready',
          ko: koObj,
          en: enObj,
          koSha: ko.sha,
          enSha: en.sha,
          products,
          productFiles,
          categories: cats.categories ?? [],
          featuredSlug: cats.featuredSlug,
          catalogUrl: site.catalog?.pdfUrl,
        });
        setKoDraft(koObj);
        setEnDraft(enObj);
        setProductDrafts(products);
      } catch (e: unknown) {
        if (!cancelled) setLoad({ status: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => { cancelled = true; };
  }, [pat]);

  const dirty = useMemo(() => {
    if (load.status !== 'ready' || !koDraft || !enDraft) return false;
    const dictDirty =
      JSON.stringify(koDraft) !== JSON.stringify(load.ko) ||
      JSON.stringify(enDraft) !== JSON.stringify(load.en);
    const productsDirty =
      !!productDrafts && JSON.stringify(productDrafts) !== JSON.stringify(load.products);
    return dictDirty || productsDirty;
  }, [load, koDraft, enDraft, productDrafts]);

  const applyImagePatch = useCallback((pathStr: string, value: string | null) => {
    const path = parsePath(pathStr);
    const v = value ?? '';
    setKoDraft((d) => (d ? (setIn(d, path, v) as Dictionary) : d));
    setEnDraft((d) => (d ? (setIn(d, path, v) as Dictionary) : d));
  }, []);

  // Inline product-field edits arrive through EditableText.onPatch as
  // a special path: `product@<slug>@<field>`. We intercept those
  // before the normal dotted-path locale routing and apply them to
  // the matching product draft instead. Supported fields: name,
  // subtitle, weight (the weight spec row's value).
  const applyProductPatch = useCallback((slug: string, field: string, value: string) => {
    setProductDrafts((drafts) => {
      if (!drafts) return drafts;
      return drafts.map((p) => {
        if (p.slug !== slug) return p;
        if (field === 'name') return { ...p, name: value };
        if (field === 'subtitle') return { ...p, subtitle: value };
        if (field === 'weight') {
          // Update the existing weight row in place; if none exists,
          // append one so the edit isn't silently dropped.
          const rows = p.spec?.rows ? [...p.spec.rows] : [];
          const idx = rows.findIndex((r) => /평량|중량|weight/i.test(r.label));
          if (idx >= 0) rows[idx] = { ...rows[idx], value };
          else rows.push({ label: '평량', value });
          return { ...p, spec: { ...(p.spec ?? {}), rows } };
        }
        return p;
      });
    });
  }, []);

  const editor: EditorApi = useMemo(() => ({
    locale: active,
    onPatch: (pathStr, value) => {
      // Product-field interception — see applyProductPatch.
      if (pathStr.startsWith('product@')) {
        const [, slug, field] = pathStr.split('@');
        if (slug && field) applyProductPatch(slug, field, value);
        return;
      }
      const path = parsePath(pathStr);
      if (active === 'ko') setKoDraft((d) => (d ? (setIn(d, path, value) as Dictionary) : d));
      else setEnDraft((d) => (d ? (setIn(d, path, value) as Dictionary) : d));
    },
    onImagePatch: applyImagePatch,
    onImageClick: (pathStr) => setImageSlot({ path: pathStr }),
  }), [active, applyImagePatch, applyProductPatch]);

  const imageSlotCurrentSrc = useMemo(() => {
    if (!imageSlot || !koDraft) return null;
    const cur = getIn(koDraft, parsePath(imageSlot.path));
    return typeof cur === 'string' && cur ? cur : null;
  }, [imageSlot, koDraft]);

  const activeDict = active === 'ko' ? koDraft : enDraft;
  const currentStyle: FieldStyle = focused ? (activeDict?.styles?.[focused.path] ?? {}) : {};
  const onPatchStyle = useCallback((key: keyof FieldStyle, value: string | null) => {
    if (!focused) return;
    const fp = focused.path;
    const apply = (d: Dictionary): Dictionary => {
      const all = { ...(d.styles ?? {}) } as Record<string, FieldStyle>;
      const cur: FieldStyle = { ...(all[fp] ?? {}) };
      if (value == null || value === '') delete cur[key];
      else (cur as Record<string, string>)[key] = value;
      if (Object.keys(cur).length === 0) delete all[fp];
      else all[fp] = cur;
      const out = { ...d };
      if (Object.keys(all).length === 0) delete out.styles;
      else out.styles = all;
      return out;
    };
    setKoDraft((d) => (d ? apply(d) : d));
    setEnDraft((d) => (d ? apply(d) : d));
  }, [focused]);

  const handleSave = useCallback(async () => {
    if (load.status !== 'ready' || !koDraft || !enDraft || !pat) return;
    // Synchronous re-entrancy guard. setSave('saving') is async, so a
    // queued autosave timer that fires in the narrow window before the
    // state flips could otherwise start a second concurrent save and
    // race on the file SHAs (GitHub 409). This ref blocks that.
    if (savingRef.current) return;
    savingRef.current = true;
    setSave({ status: 'saving' });
    try {
      const koChanged = JSON.stringify(koDraft) !== JSON.stringify(load.ko);
      const enChanged = JSON.stringify(enDraft) !== JSON.stringify(load.en);
      let lastSha = '';
      let nextKoSha = load.koSha;
      let nextEnSha = load.enSha;
      const koSnapshot = koDraft;
      const enSnapshot = enDraft;
      if (koChanged) {
        const koText = JSON.stringify(koDraft, null, 2) + '\n';
        const r = await ghPutFile(pat, KO_PATH, koText, 'chore(products-page): inline edit ko', load.koSha);
        lastSha = r.commitSha;
        if (r.contentSha) nextKoSha = r.contentSha;
      }
      if (enChanged) {
        const enText = JSON.stringify(enDraft, null, 2) + '\n';
        const r = await ghPutFile(pat, EN_PATH, enText, 'chore(products-page): inline edit en', load.enSha);
        lastSha = r.commitSha;
        if (r.contentSha) nextEnSha = r.contentSha;
      }

      // Save any product JSON files whose inline-edited fields changed.
      // Each file is PUT whole (full object preserved — we only patched
      // name / subtitle / spec.rows), so no key is dropped. SHAs are
      // refreshed in the productFiles meta for the next save.
      // Deep-copy each meta object (not just the array) so the in-place
      // `meta.sha = ...` below can't mutate load.productFiles' shared
      // references — important if a save races with another.
      const nextProductFiles = load.productFiles.map((m) => ({ ...m }));
      const savedProducts = productDrafts ? [...productDrafts] : [...load.products];
      if (productDrafts) {
        for (let i = 0; i < productDrafts.length; i++) {
          const draft = productDrafts[i];
          const original = load.products.find((p) => p.slug === draft.slug);
          if (original && JSON.stringify(draft) === JSON.stringify(original)) continue;
          const meta = nextProductFiles.find((m) => m.slug === draft.slug);
          if (!meta) continue; // safety: only save files we loaded
          const text = JSON.stringify(draft, null, 2) + '\n';
          const r = await ghPutFile(pat, meta.path, text, `chore(product): inline edit ${draft.slug}`, meta.sha);
          lastSha = r.commitSha;
          if (r.contentSha) meta.sha = r.contentSha;
        }
      }

      setLoad({
        ...load,
        ko: koSnapshot,
        en: enSnapshot,
        koSha: nextKoSha,
        enSha: nextEnSha,
        products: savedProducts,
        productFiles: nextProductFiles,
      });
      setSave({ status: 'done', sha: lastSha });
    } catch (e: unknown) {
      setSave({ status: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      savingRef.current = false;
    }
  }, [load, koDraft, enDraft, productDrafts, pat]);

  const handleDiscard = useCallback(() => {
    if (load.status !== 'ready') return;
    if (!window.confirm('편집 중인 변경사항을 모두 버릴까요?')) return;
    setKoDraft(load.ko);
    setEnDraft(load.en);
    setProductDrafts(load.products);
    setSave({ status: 'idle' });
  }, [load]);

  // Autosave (60s debounce, 2min min-gap)
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
  const handleSaveRef = useRef(handleSave);
  useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);
  useEffect(() => {
    if (!dirty) return;
    if (save.status === 'saving') return;
    const sinceLast = autoSavedAt ? Date.now() - autoSavedAt.getTime() : Infinity;
    const wait = Math.max(60_000, 120_000 - sinceLast);
    const t = setTimeout(() => {
      void (async () => {
        await handleSaveRef.current();
        setAutoSavedAt(new Date());
      })();
    }, wait);
    return () => clearTimeout(t);
  }, [koDraft, enDraft, productDrafts, dirty, save.status, autoSavedAt]);

  let statusLabel = '변경사항 없음';
  let statusClass = 'ed-status-clean';
  if (save.status === 'saving') { statusLabel = '💾 게시 중...'; statusClass = 'ed-status-saving'; }
  else if (save.status === 'error') { statusLabel = '⚠ 에러'; statusClass = 'ed-status-error'; }
  else if (dirty) { statusLabel = '● 변경사항 있음'; statusClass = 'ed-status-dirty'; }
  else if (save.status === 'done') { statusLabel = '✓ 게시됨'; statusClass = 'ed-status-done'; }

  if (!pat) return <div className="admin-page"><p>인증이 필요합니다.</p></div>;
  if (load.status === 'loading') return <div className="admin-page"><p>로딩 중... (제품 데이터까지 함께 가져오는 중)</p></div>;
  if (load.status === 'error') {
    return (
      <div className="admin-page">
        <p className="admin-err">로드 실패: {load.message}</p>
        <Link href="/admin" className="btn ghost small">← Admin</Link>
      </div>
    );
  }
  if (!koDraft || !enDraft) return null;

  return (
    <div className="ed-root">
      <div className="ed-bar">
        <div className="ed-bar-l">
          <Link href="/admin" className="ed-bar-back">← Admin</Link>
          <span className="ed-bar-mode">PRODUCTS · 제품 라인업 페이지</span>
          <span className={`ed-status ${statusClass}`}>{statusLabel}</span>
        </div>
        <div className="ed-bar-r">
          <div className="ed-lang">
            <button type="button" className={active === 'ko' ? 'on' : ''} onClick={() => setActive('ko')} disabled={save.status === 'saving'}>KO</button>
            <span className="sep">/</span>
            <button type="button" className={active === 'en' ? 'on' : ''} onClick={() => setActive('en')} disabled={save.status === 'saving'}>EN</button>
          </div>
          <a href={`/ko/products/`} target="_blank" rel="noreferrer" className="btn ghost small">
            라이브 보기 ↗
          </a>
          <button type="button" className="btn ghost small" onClick={handleDiscard} disabled={!dirty || save.status === 'saving'}>
            되돌리기
          </button>
          <button
            type="button"
            className={`btn ${dirty ? 'primary' : 'ghost'} small`}
            onClick={() => void handleSave()}
            disabled={!dirty || save.status === 'saving'}
          >
            {save.status === 'saving' ? '💾 게시 중...' : dirty ? '● 즉시 게시' : '변경사항 없음'}
          </button>
        </div>
      </div>

      {save.status === 'error' ? <div className="ed-toast ed-toast-err">에러: {save.message}</div> : null}

      <div className="ed-page">
        <StyleInjector styles={activeDict?.styles} />
        <Navigation locale={active} dict={activeDict!} editor={editor} />
        <main>
          <ProductsListing
            locale={active}
            dict={activeDict!}
            products={productDrafts ?? load.products}
            categories={load.categories}
            featuredSlug={load.featuredSlug}
            catalogReady={!!load.catalogUrl}
            catalogUrl={load.catalogUrl}
            editor={editor}
          />
        </main>
        <Footer locale={active} dict={activeDict!} editor={editor} />
      </div>

      <FloatingToolbar
        focused={focused}
        currentStyle={currentStyle}
        onPatchStyle={onPatchStyle}
        onClose={() => setFocused(null)}
      />
      <ResizeHandle
        focused={focused}
        onPatchStyle={(_k, v) => onPatchStyle('width', v)}
      />
      <ImageSlotPanel
        slot={imageSlot}
        pat={pat}
        currentSrc={imageSlotCurrentSrc}
        onPatch={applyImagePatch}
        onUploadComplete={() => {
          setTimeout(() => void handleSaveRef.current(), 0);
        }}
        onClose={() => setImageSlot(null)}
      />
    </div>
  );
}
