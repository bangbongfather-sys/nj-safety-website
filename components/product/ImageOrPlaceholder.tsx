'use client';

import { useState } from 'react';

// catalog-app deploys at this domain and serves /api/images/* publicly
// from its R2 bucket. Rewriting any /api/images/... path that comes in
// from an exported JSON to that absolute URL lets the static site
// reuse catalog-app's image storage without duplicating files.
const CATALOG_IMAGES_BASE = 'https://catalog-app.njsafety91.workers.dev';

function rewriteSrc(src: string | undefined): string | undefined {
  if (!src) return undefined;
  if (src.startsWith('/api/')) return `${CATALOG_IMAGES_BASE}${src}`;
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
};

export default function ImageOrPlaceholder({ src, alt, className }: Props) {
  const [errored, setErrored] = useState(false);
  const resolved = rewriteSrc(src);

  if (!isResolvable(resolved) || errored) {
    return (
      <div className={`pd-img-ph ${className ?? ''}`.trim()}>
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
      loading="lazy"
      onError={() => setErrored(true)}
    />
  );
}
