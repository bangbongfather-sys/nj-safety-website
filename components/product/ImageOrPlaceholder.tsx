type Props = {
  src?: string;
  alt?: string;
  className?: string;
};

function isResolvable(src: string | undefined): boolean {
  if (!src) return false;
  // Absolute URL (http/https) — assume it resolves.
  if (/^https?:\/\//i.test(src)) return true;
  // Catalog-app internal API path — won't resolve in static site.
  if (src.startsWith('/api/')) return false;
  // Local /public path — assume present (will 404 if not).
  if (src.startsWith('/')) return true;
  return false;
}

export default function ImageOrPlaceholder({ src, alt, className }: Props) {
  if (isResolvable(src)) {
    return <img src={src} alt={alt ?? ''} className={className} loading="lazy" />;
  }
  return (
    <div className={`pd-img-ph ${className ?? ''}`.trim()}>
      <span className="pd-img-ph-mark">IMG</span>
      {alt ? <span className="pd-img-ph-alt">{alt}</span> : null}
    </div>
  );
}
