'use client';

/**
 * BrandIntro — full-screen animated splash shown on the FIRST entry to the
 * homepage each browser session (브랜드 인트로).
 *
 * Choreography (~2.5s total, pure CSS keyframes):
 *   0.0s  dark curtain + orange hairline grows
 *   0.3s  eyebrow line fades up (SINCE 1992 · INDUSTRIAL SAFETY WEAR)
 *   0.5s  NJ SAFETY logo wipes in (clip-path reveal) + subtle scale settle
 *   1.0s  tagline fades up
 *   1.85s curtain wipes upward, revealing the hero — at this moment we
 *         dispatch `nj:intro-done` so the Hero re-fires its staggered
 *         text entrance right as the curtain lifts.
 *   2.5s  overlay unmounts.
 *
 * Rules:
 *   · Once per session — sessionStorage flag, set the moment it starts.
 *   · Click / key / touch skips straight to the exit wipe.
 *   · prefers-reduced-motion → never shown.
 *   · Repeat visits: an inline <script> (rendered by this component,
 *     executed during HTML parse — before first paint) stamps
 *     `nj-intro-skip` on <html> so the SSR'd overlay is display:none'd
 *     with zero flash. When the intro SHOULD play it stamps
 *     `nj-intro-play`, which is what arms the CSS animations.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import './brand-intro.css';

const FLAG = 'njIntroV1';

// Runs during HTML parse — decides play/skip synchronously so neither the
// homepage (repeat visit) nor the overlay (first visit) ever flashes.
const BOOT = `(function(){try{var m=window.matchMedia('(prefers-reduced-motion: reduce)').matches;var s=sessionStorage.getItem('${FLAG}');if(m||s){document.documentElement.classList.add('nj-intro-skip');}else{sessionStorage.setItem('${FLAG}','1');document.documentElement.classList.add('nj-intro-play');}}catch(e){document.documentElement.classList.add('nj-intro-skip');}})();`;

// Keep in sync with brand-intro.css timings.
const REVEAL_MS = 1850; // curtain starts lifting → fire hero entrance
const DONE_MS = 2500;   // curtain fully gone → unmount
const SKIP_EXIT_MS = 550;

function announceDone() {
  window.dispatchEvent(new CustomEvent('nj:intro-done'));
}

export default function BrandIntro({ locale }: { locale: 'ko' | 'en' }) {
  const [gone, setGone] = useState(false);
  const [exiting, setExiting] = useState(false);
  const announcedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const finish = useCallback(() => {
    if (!announcedRef.current) {
      announcedRef.current = true;
      announceDone();
    }
  }, []);

  // Natural timeline — only armed when the boot script chose "play".
  useEffect(() => {
    if (!document.documentElement.classList.contains('nj-intro-play')) {
      setGone(true);
      return;
    }
    const t1 = window.setTimeout(finish, REVEAL_MS);
    const t2 = window.setTimeout(() => {
      setGone(true);
      document.documentElement.classList.remove('nj-intro-play');
    }, DONE_MS);
    timersRef.current = [t1, t2];
    return () => timersRef.current.forEach((t) => window.clearTimeout(t));
  }, [finish]);

  // Skip: any click / key / touch jumps to the exit wipe.
  const skip = useCallback(() => {
    if (exiting || gone) return;
    timersRef.current.forEach((t) => window.clearTimeout(t));
    setExiting(true);
    finish();
    window.setTimeout(() => {
      setGone(true);
      document.documentElement.classList.remove('nj-intro-play');
    }, SKIP_EXIT_MS);
  }, [exiting, gone, finish]);

  useEffect(() => {
    if (gone) return;
    const onKey = () => skip();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gone, skip]);

  return (
    <>
      {/* Must run before first paint — decides skip/play with no flash. */}
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      {gone ? null : (
        <div
          className={`nj-intro${exiting ? ' is-exiting' : ''}`}
          onClick={skip}
          onTouchStart={skip}
          role="presentation"
          aria-hidden="true"
        >
          <div className="nj-intro-stage">
            <span className="nj-intro-hairline" />
            <span className="nj-intro-eyebrow">
              SINCE 1992 · INDUSTRIAL SAFETY WEAR
            </span>
            <div className="nj-intro-logo-wrap">
              <img src="/nj-logo.png" alt="" className="nj-intro-logo" />
            </div>
            <span className="nj-intro-tagline">
              {locale === 'ko'
                ? 'Your Flame Shield for Safer Work.'
                : 'Your Flame Shield for Safer Work.'}
            </span>
          </div>
          <span className="nj-intro-skip-hint">
            {locale === 'ko' ? '클릭하여 건너뛰기' : 'Click to skip'}
          </span>
        </div>
      )}
    </>
  );
}
