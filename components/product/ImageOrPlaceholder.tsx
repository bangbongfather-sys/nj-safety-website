'use client';

import { useState } from 'react';

// catalog-app deploys at this domain and serves these path families publicly:
//   /api/images/<file>   — user-uploaded photos in R2
//   /products/<slug>/*   — static photos shipped in catalog-app's public/
//   /brand/*             — brand marks
// Any relative path in an exported product JSON pointing at these is rewritten
// to absolute URLs so the static site can reuse catalog-app's image hosting
// without duplicating files.
const CATALOG_BASE = 'https://catalog-app.njsafety91.workers.dev';

const REWRITE_PREFIXES = ['/api/images/', '/products/', '/brand/'];

function rewriteSrc(src: string | undefined): string | undefined {
  if (!src) return undefined;
  for (const prefix of REWRITE_PREFIXES) {
    if (src.startsWith(prefix)) return `${CATALOG_BASE}${src}`;
  }
  return src;
}

function isResolvable(src: string | undefined): boolean {
  if (!src) return false;
  if (/^https?:\/\//i.test(src)) return true;
  if (src.startsWith('/')) return true;
  return false;
}

type Props = {
  src?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Responsive sizes hint. Forwarded straight to the underlying <img>'s
   * `sizes` attribute when set, which lets the browser pick the right
   * srcset candidate. We don't generate srcset here (the catalog-app
   * serves a single source URL per photo) so `sizes` is informational
   * only, but it's still the right contract to expose for callers that
   * later add multi-resolution sources.
   */
  sizes?: string;
  /**
   * Loading hint. Defaults to lazy. Set to "eager" (or pass `priority`)
   * for above-the-fold imagery — the product detail page's main photo
   * is the LCP candidate, so we let the caller opt in to eager loading
   * for that single slot.
   */
  loading?: 'lazy' | 'eager';
  /** Mirrors next/image's priority flag: when true, eager-load + high fetch priority. */
  priority?: boolean;
};

export default function ImageOrPlaceholder({
  src,
  alt,
  className,
  style,
  sizes,
  loading,
  priority,
}: Props) {
  const [errored, setErrored] = useState(false);
  const resolved = rewriteSrc(src);

  if (!isResolvable(resolved) || errored) {
    return (
      <div className={`pd-img-ph ${className ?? ''}`.trim()} style={style}>
        <span className="pd-img-ph-mark">IMG</span>
        {alt ? <span className="pd-img-ph-alt">{alt}</span> : null}
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt ?? ''}
      className={className}
      style={style}
      sizes={sizes}
      loading={priority ? 'eager' : (loading ?? 'lazy')}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      onError={() => setErrored(true)}
    />
  );
}
