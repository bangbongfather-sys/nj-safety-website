'use client';

/**
 * Embedded Naver Map for /contact (replaces the editorial SVG
 * grid mock).
 *
 * Why Naver:
 *   • #1 map in Korea — matches our B2B target audience.
 *   • Best Korean address + POI accuracy (esp. modern buildings
 *     like SK V1 센터 신내 that Google sometimes mis-pins).
 *   • Generous free tier (200k requests/day) — no credit card
 *     billing required, unlike Google Maps.
 *
 * Setup:
 *   1. Sign up at Naver Cloud Platform (https://ncloud.com).
 *   2. Activate Maps → "Web Dynamic Map".
 *   3. Register an Application → whitelist the production domain
 *      (njfashion.co.kr) + the Workers preview URL + localhost.
 *   4. Put the Client ID into `.env.local` as
 *      `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=...` (NEXT_PUBLIC_ prefix
 *      is required so it's inlined at build time — Naver Client
 *      ID is public-by-design and protected by the domain
 *      whitelist).
 *
 * The component lazy-loads the SDK once per page (cached in a
 * module-level promise so multiple instances share one load),
 * mounts a map into a ref'd div, then renders a custom HTML
 * marker so the editorial NJ SAFETY HQ pin matches the
 * site's visual language.
 *
 * When the env var is missing, falls back to a non-fatal
 * placeholder block so the page still ships before the key
 * is provisioned.
 */

import { useEffect, useRef, useState } from 'react';

type Props = {
  lat: number;
  lng: number;
  zoom?: number;
  pinLabel?: string;
  className?: string;
};

const SDK_BASE = 'https://oapi.map.naver.com/openapi/v3/maps.js';

// Module-level promise so two <NaverMap>s on the same page share
// one script load. Subsequent mounts (HMR, route changes) reuse
// the already-resolved SDK.
let sdkPromise: Promise<void> | null = null;

function loadNaverSdk(clientId: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('ssr'));
  // Already loaded?
  const w = window as unknown as { naver?: { maps?: unknown } };
  if (w.naver?.maps) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${SDK_BASE}?ncpClientId=${encodeURIComponent(clientId)}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkPromise = null; // allow retry on next mount
      reject(new Error('failed to load naver maps sdk'));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export default function NaverMap({
  lat,
  lng,
  zoom = 16,
  pinLabel = 'NJ SAFETY HQ',
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'no-key' | 'error'>('idle');

  // Naver Cloud Platform "Web Dynamic Map" Client ID.
  //
  // Hardcoded here as a fallback because Cloudflare Workers auto-
  // builds from GitHub on every push, and that build environment
  // does NOT have access to `.env.local` (gitignored by design).
  // Result before this fallback: every `git push` would overwrite
  // the locally-built deploy with one that lacked the env var, so
  // /contact would silently fall back to "API 키 미설정" until a
  // human ran `wrangler deploy` from a machine with .env.local.
  //
  // The Client ID is PUBLIC by design — it's restricted via the
  // NCP console's domain whitelist (njfashion.co.kr, the Workers
  // preview URL, and localhost are the only origins allowed), so
  // exposing it in the bundle / source tree is safe. The companion
  // Client Secret stays on NCP and is never touched here.
  //
  // To override (e.g., for a separate staging Application), set
  // NEXT_PUBLIC_NAVER_MAP_CLIENT_ID in .env.local before building.
  const HARDCODED_CLIENT_ID = '0d46j2j238';
  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || HARDCODED_CLIENT_ID;

  useEffect(() => {
    if (!clientId) {
      setStatus('no-key');
      return;
    }
    if (!containerRef.current) return;

    setStatus('loading');
    let cancelled = false;

    loadNaverSdk(clientId)
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const naver = (window as unknown as { naver: NaverMapsNS }).naver;
        const center = new naver.maps.LatLng(lat, lng);

        const map = new naver.maps.Map(containerRef.current, {
          center,
          zoom,
          mapTypeControl: false,
          zoomControl: true,
          zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT, style: 1 },
          scaleControl: false,
          logoControl: true,
          mapDataControl: false,
          minZoom: 9,
        });

        // Custom HTML marker — reuses the same .ct-naver-pin styles
        // we ship in contact.css so the pin matches the existing
        // editorial pin design (orange dot + black label chip).
        const label = pinLabel.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        new naver.maps.Marker({
          position: center,
          map,
          icon: {
            content: `
              <div class="ct-naver-pin">
                <div class="lbl">${label}</div>
                <div class="marker"></div>
              </div>
            `,
            anchor: new naver.maps.Point(50, 54),
          },
        });

        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, lat, lng, zoom, pinLabel]);

  if (!clientId || status === 'no-key') {
    return (
      <div className={`ct-naver-fallback ${className ?? ''}`.trim()} aria-label="지도 — API 키 미설정">
        <div className="ct-naver-fallback-inner">
          <span className="lbl">MAP</span>
          <p>지도 API 키가 아직 설정되지 않았습니다.</p>
          <p className="hint">
            관리자: <code>NEXT_PUBLIC_NAVER_MAP_CLIENT_ID</code>를 빌드 환경에 추가하세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`ct-naver-map ${className ?? ''}`.trim()} role="img" aria-label="지도 — NJ SAFETY HQ" />
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Minimal SDK types — we only touch a handful of classes, so a
 * pinpoint declaration is lighter than pulling in a community
 * @types package that lags behind the live API.
 * ──────────────────────────────────────────────────────────────── */

type LatLng = unknown;
type MapsMap = unknown;

interface NaverMapsNS {
  maps: {
    LatLng: new (lat: number, lng: number) => LatLng;
    Map: new (
      el: HTMLElement,
      opts: {
        center: LatLng;
        zoom: number;
        mapTypeControl?: boolean;
        zoomControl?: boolean;
        zoomControlOptions?: { position: number; style?: number };
        scaleControl?: boolean;
        logoControl?: boolean;
        mapDataControl?: boolean;
        minZoom?: number;
      },
    ) => MapsMap;
    Marker: new (opts: {
      position: LatLng;
      map: MapsMap;
      icon?: { content: string; anchor?: unknown };
      title?: string;
    }) => unknown;
    Point: new (x: number, y: number) => unknown;
    Position: { TOP_RIGHT: number; TOP_LEFT: number; BOTTOM_RIGHT: number; BOTTOM_LEFT: number };
  };
}
