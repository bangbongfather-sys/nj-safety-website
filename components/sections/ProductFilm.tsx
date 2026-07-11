'use client';

/**
 * ProductFilm — cinematic full-bleed video band for the 아라미드 PK 티셔츠
 * promo film. Sits right after the 제품 라인업 carousel on the homepage.
 *
 * The film autoplays muted + looped (the only way browsers allow autoplay),
 * with a sound toggle so visitors can unmute. Text overlays at the bottom
 * with a CTA to the PK 티셔츠 detail page (njs-ar204).
 */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import './product-film.css';

const PK_SLUG = 'njs-ar204';
// redeploy: ensure PK product-film band is live (cache-bust)

export default function ProductFilm({ locale }: { locale: Locale }) {
  const ko = locale === 'ko';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  // React can be flaky about reflecting the `muted` prop onto the element,
  // and Safari needs it set before play() for autoplay to be allowed —
  // force it imperatively on mount.
  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.muted = true;
      v.play().catch(() => {/* autoplay blocked — poster/first frame stays */});
    }
  }, []);

  const toggleSound = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted) void v.play().catch(() => {});
  };

  return (
    <section className="pf" data-screen-label="Product Film" aria-label={ko ? 'PK 티셔츠 제품 필름' : 'PK T-shirt product film'}>
      <video
        ref={videoRef}
        className="pf-video"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      >
        <source src="/media/pk-tshirt-film.mp4" type="video/mp4" />
      </video>
      <div className="pf-overlay" />

      <div className="pf-content">
        <div className="wrap">
          <span className="pf-eyebrow">— ARAMID PK T-SHIRT · PRODUCT FILM</span>
          <h2 className="pf-title">
            {ko ? (
              <>현장의 일상,<br /><em>아라미드 PK 티셔츠.</em></>
            ) : (
              <>Everyday on site,<br /><em>the Aramid PK tee.</em></>
            )}
          </h2>
          <p className="pf-sub">
            {ko
              ? '4-way 스트레치 방염 니트 — 여름 현장을 위한 가장 가벼운 보호.'
              : '4-way stretch FR knit — the lightest protection for summer sites.'}
          </p>
          <Link href={`/${locale}/products/${PK_SLUG}/`} className="pf-cta">
            {ko ? '제품 보기' : 'View product'} <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      <button
        type="button"
        className="pf-sound"
        onClick={toggleSound}
        aria-label={muted ? (ko ? '소리 켜기' : 'Unmute') : (ko ? '소리 끄기' : 'Mute')}
        title={muted ? (ko ? '소리 켜기' : 'Unmute') : (ko ? '소리 끄기' : 'Mute')}
      >
        {muted ? '🔇' : '🔊'}
      </button>
    </section>
  );
}
