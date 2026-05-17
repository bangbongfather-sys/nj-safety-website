/**
 * Rich product-page schema (NJ Safety design handoff).
 * Separate from the editor's `Product` (in ./types.ts) — this powers the
 * public web pages at /products/[slug] and is loaded from JSON files in
 * `public/products/<slug>.json`.
 *
 * All sections are optional; missing sections are skipped at render time.
 * Strings starting with `<em>...</em>` are rendered with orange highlight
 * via dangerouslySetInnerHTML — only used for headlines.
 */

export type ProductCounter = {
  value: string;
  unit?: string;
  label: string;
};

/**
 * Discrete corner positions for hero badges. Four anchors keep the layout
 * predictable and the picker UI tiny — no free-form drag needed.
 */
export type BadgePosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

/**
 * Visual treatment for a hero image label.
 *   - 'stamp'  : the original heritage stamp (filled + drop shadow on
 *                flagship; ink chip on the others). Default.
 *   - 'tag'    : the bold orange figure label that used to be hero.tag —
 *                short FIG-NN style, high contrast.
 *   - 'corner' : the small paper chip that used to be hero.corner —
 *                quiet color/material identifier.
 */
export type HeroBadgeStyle = "stamp" | "tag" | "corner";

export type HeroBadge = {
  text?: string;
  /** Defaults to 'top-right' when missing. */
  position?: BadgePosition;
  /** Visual style. Defaults to 'stamp'. */
  style?: HeroBadgeStyle;
};

export type ProductHero = {
  image?: string;
  imageAlt?: string;
  tag?: string;
  corner?: string;
  /**
   * Legacy single-badge field — older docs only. Use `badges` for new
   * docs; the renderer falls back to constructing a 1-item array from
   * this when `badges` is missing so older drafts still render.
   * @deprecated prefer `badges`
   */
  badge?: string;
  /**
   * Heritage badges anchored to the four corners of the hero image.
   * Each badge is positioned independently; multiple badges at the same
   * corner stack vertically. Hidden when the array is empty.
   */
  badges?: HeroBadge[];
  counters?: ProductCounter[];
};

export type ProductGalleryItem = {
  image?: string;
  tag?: string;
  label?: string;
  caption?: string;
  /** Grid span hint: 'xl' | 'l' | 'm' | 'tall' */
  span?: "xl" | "l" | "m" | "tall";
  /** Recommended aspect/dimensions hint shown when image is missing */
  rec?: string;
};

export type ProductGallery = {
  eyebrow?: string;
  headline?: string;
  note?: string;
  items?: ProductGalleryItem[];
};

export type ProductStatement = {
  eyebrow?: string;
  headline?: string;
  body?: string;
  sign?: string;
};

export type ProductMaterialCallout = {
  tag?: string;
  title?: string;
  body?: string;
};

export type ProductMaterial = {
  eyebrow?: string;
  headline?: string;
  image?: string;
  callouts?: ProductMaterialCallout[];
};

export type ProductFeatureItem = {
  n?: string;
  title?: string;
  body?: string;
  /** When true, renders as a full-width dark accent card. Max one per product. */
  featured?: boolean;
};

export type ProductFeatures = {
  eyebrow?: string;
  headline?: string;
  items?: ProductFeatureItem[];
};

export type ProductSpecRow = { label: string; value: string };

export type ProductSizeTable = {
  unit?: string;
  headers?: string[];
  rows?: string[][];
};

export type ProductSpec = {
  eyebrow?: string;
  headline?: string;
  rows?: ProductSpecRow[];
  sizeTable?: ProductSizeTable;
};

export type ProductFieldItem = {
  n?: string;
  tag?: string;
  title?: string;
  body?: string;
};

export type ProductField = {
  eyebrow?: string;
  headline?: string;
  items?: ProductFieldItem[];
};

export type ProductCareItem = {
  icon?: string;
  title?: string;
  body?: string;
  /** Renders icon with orange "warning" background. */
  warn?: boolean;
};

export type ProductCare = {
  eyebrow?: string;
  items?: ProductCareItem[];
};

export type ProductCert = {
  mark?: string;
  title?: string;
  sub?: string;
  /** Renders mark with orange background. Only one cert should highlight. */
  highlight?: boolean;
};

export type ProductOrderCell = {
  label?: string;
  value?: string;
  body?: string;
};

export type ProductContactRow = {
  label?: string;
  value?: string;
};

export type ProductOrder = {
  headline?: string;
  cells?: ProductOrderCell[];
  contact?: ProductContactRow[];
};

/**
 * "기본 정보" tab — the regulator-style summary block that B2B buyers
 * expect to see (Naver Smart Store / K2 / Coupang all render this same
 * shape). Stored as label/value pairs so the admin can rename a row's
 * meaning without code changes and the missing-row case (e.g. 제조년월
 * left blank) just renders an empty cell.
 */
export type ProductBasicInfoRow = {
  label: string;
  value: string;
};

export type ProductBasicInfo = {
  /** 상품 기본 정보 — brand, model, manufacturer, origin */
  primary?: ProductBasicInfoRow[];
  /** 상품정보제공고시 — material, color, size, care, AS contact, etc. */
  disclosure?: ProductBasicInfoRow[];
};

/**
 * 시험성적서 tab — one or more PDF reports uploaded to R2.
 */
export type ProductTestReportFile = {
  /** Public R2 URL (includes a cache-bust query). */
  url: string;
  /** Display name. Defaults to the original filename minus the extension. */
  name?: string;
  /** Byte size as reported by R2 — used for the small "1.2 MB" hint. */
  size?: number;
  /** ISO timestamp of upload (server clock). */
  uploadedAt?: string;
};

export type ProductTestReports = {
  files?: ProductTestReportFile[];
};

/**
 * Per-field style override produced by the in-page Format toolbar.
 * Stored on ProductPageData under `styles`, keyed by the same lodash-style
 * path used by editText / EditableImage (e.g. `name`, `hero.tag`,
 * `gallery.items[2].caption`).
 *
 * Kept tiny on purpose: only the levers users actually reach for. Bold,
 * size, alignment can join later without breaking older docs.
 */
export type FieldStyle = {
  /**
   * One of the FONT_PRESETS keys ('display' | 'archivo' | 'sans' | 'mono').
   * Resolved to a CSS font-family stack at render time, not stored as a
   * raw stack so we can rename presets without touching saved docs.
   */
  font?: string;
  /** CSS color token (#RRGGBB). When unset, inherits from the page theme. */
  color?: string;
  /** CSS font-size value, e.g. '1.2em' or '18px'. Stored verbatim; applied as-is. */
  size?: string;
  /**
   * CSS font-weight string. Limited to a small palette in the toolbar
   * UI ('400' | '500' | '600' | '700') but stored as raw string so we can
   * widen the range later without touching saved docs.
   */
  weight?: string;
  /** Text alignment for block fields. Inline hosts ignore it. */
  align?: "left" | "center" | "right";
  /**
   * Box width. Stored as a CSS value (e.g. '75%' or '420px'). Applied
   * together with `display: inline-block` so it takes effect on inline
   * hosts too — at the cost of changing their block flow, which the
   * user can revert with '기본으로'.
   */
  width?: string;
  /** CSS background color — applied to the field box (or wrapped span on a selection). */
  background?: string;
};

/**
 * Visual treatment for the page. The default 'industrial' is the cool
 * catalog-stock blueprint look (grey paper + charcoal ink + refined orange).
 * 'flagship' switches to the AR301 kraft hangtag treatment (warm kraft tan
 * + deep brown bark + rust orange) — for heritage/steady-series products.
 * 'tactical' is a Boldest-inspired deep-black catalog look with a single
 * yellow-gold accent — for high-spec PPE / tactical workwear pages where
 * the dramatic contrast and minimal palette read as engineered safety.
 */
export type ProductFlavor = "industrial" | "flagship" | "tactical";

/** Top-level product-page document. Matches `public/products/<slug>.json`. */
export type ProductPageData = {
  slug: string;
  model?: string;
  category?: string;
  name?: string;
  subtitle?: string;
  tagline?: string;
  /** Visual treatment. Defaults to 'industrial' when missing. */
  flavor?: ProductFlavor;

  hero?: ProductHero;
  gallery?: ProductGallery;
  statement?: ProductStatement;
  material?: ProductMaterial;
  features?: ProductFeatures;
  spec?: ProductSpec;
  field?: ProductField;
  care?: ProductCare;
  certs?: ProductCert[];
  order?: ProductOrder;

  /** Regulator-style basic info shown under the 기본정보 tab. */
  basicInfo?: ProductBasicInfo;
  /** PDF test reports listed under the 시험성적서 tab. */
  testReports?: ProductTestReports;

  /** Optional per-field style overrides set via the in-page Format toolbar. */
  styles?: Record<string, FieldStyle>;
};

/**
 * Default row labels for the 기본정보 tab. The renderer always shows
 * these rows so the table layout is stable even before the admin fills
 * anything in; admin edits write the matching index back into
 * data.basicInfo.{primary,disclosure}[i].value.
 */
export const DEFAULT_BASIC_INFO_PRIMARY: ProductBasicInfoRow[] = [
  { label: '브랜드',   value: 'NJ SAFETY' },
  { label: '모델명',   value: '' },
  { label: '제조사',   value: '나정엔터프라이즈' },
  { label: '원산지',   value: '대한민국' },
];

export const DEFAULT_BASIC_INFO_DISCLOSURE: ProductBasicInfoRow[] = [
  { label: '제품소재',                                  value: '' },
  { label: '색상',                                      value: '' },
  { label: '치수',                                      value: '' },
  { label: '제조자, 수입품의 경우 수입자를 함께 표시',    value: '' },
  { label: '제조국',                                    value: '대한민국' },
  { label: '세탁방법 및 취급시 주의사항',                value: '' },
  { label: '제조년월',                                  value: '' },
  { label: '품질보증기준',                              value: '' },
  { label: 'AS책임자와 전화번호',                        value: '02-777-3079' },
];

/**
 * Backfill missing rows so the renderer always sees the full structure.
 * Pure — returns a new array, never mutates the input. Rows already
 * present (matched by label) win; defaults only fill the gaps.
 */
export function withBasicInfoDefaults(info?: ProductBasicInfo): ProductBasicInfo {
  function merge(
    existing: ProductBasicInfoRow[] | undefined,
    defaults: ProductBasicInfoRow[],
  ): ProductBasicInfoRow[] {
    const existingByLabel = new Map((existing ?? []).map((r) => [r.label, r]));
    return defaults.map((d) => existingByLabel.get(d.label) ?? { ...d });
  }
  return {
    primary:    merge(info?.primary,    DEFAULT_BASIC_INFO_PRIMARY),
    disclosure: merge(info?.disclosure, DEFAULT_BASIC_INFO_DISCLOSURE),
  };
}

/**
 * Font presets exposed in the format toolbar. The CSS stack on each entry
 * is what's actually written to the inline style; a stack rather than a
 * single name keeps the layout stable when the primary font is missing.
 */
export const FONT_PRESETS: { key: string; label: string; stack: string }[] = [
  {
    key: "archivo",
    label: "본문 (Archivo)",
    stack: "var(--font-archivo), Inter, system-ui, sans-serif",
  },
  {
    key: "display",
    label: "디스플레이 (Fraunces)",
    stack: "var(--font-display), Fraunces, Georgia, serif",
  },
  {
    key: "sans",
    label: "산세리프 (Inter)",
    stack: "var(--font-body), Inter, system-ui, sans-serif",
  },
  {
    key: "mono",
    label: "모노",
    stack: "var(--font-mono), ui-monospace, Menlo, monospace",
  },
];

export function fontStackFor(key?: string): string | undefined {
  if (!key) return undefined;
  return FONT_PRESETS.find((p) => p.key === key)?.stack;
}
