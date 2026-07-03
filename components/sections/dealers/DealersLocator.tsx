'use client';

/**
 * 대리점 찾기 — store locator.
 *
 * Left: a Kakao map with a clustered orange pin per dealer. Right: a
 * region dropdown + free-text search + reset, then a scrollable list
 * of dealer cards sorted by distance from the visitor (when they
 * allow geolocation). Clicking a card pans the map to that dealer;
 * clicking a pin highlights + scrolls to its card.
 *
 * Coordinates: a dealer may carry stored `lat`/`lng`; otherwise we
 * geocode its `addr` client-side with the Kakao Geocoder, so the
 * operator usually only needs to type an address in /admin/dealers.
 *
 * The Kakao JS SDK needs an appkey (NEXT_PUBLIC_KAKAO_MAP_APPKEY,
 * domain-restricted in the Kakao Developers console). Without it the
 * map area shows a setup notice but the list / search / region filter
 * still work — so the page is useful before the key lands.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dealer, DealerRegion } from '@/lib/dealers';
import './dealers-locator.css';

// Fallback map centre when the visitor blocks geolocation: NJ HQ.
const HQ: Coord = { lat: 37.6135, lng: 127.1015 };
// Whole-country view centre + zoom level for the initial paint.
const KOREA_CENTER: Coord = { lat: 36.3, lng: 127.8 };

type Coord = { lat: number; lng: number };

type Props = {
  locale: 'ko' | 'en';
  regions: DealerRegion[];
  dealers: Dealer[];
  appkey: string;
};

// Labels live here (not passed from the server page) — a Server →
// Client boundary can't carry the `count(n)` function, and keeping
// them local avoids a dict schema change for a brand-new page.
function labelsFor(locale: 'ko' | 'en') {
  const ko = locale === 'ko';
  return {
    allRegions: ko ? '전체지역' : 'All regions',
    searchPlaceholder: ko ? '매장명, 주소 등으로 검색하세요' : 'Search by name or address',
    reset: ko ? '검색 초기화' : 'Reset',
    shopLink: ko ? '쇼핑몰 바로가기' : 'Visit shop',
    siteLink: ko ? '사이트 바로가기' : 'Visit website',
    km: 'km',
    count: (n: number) => (ko ? `${n}개 매장` : `${n} store${n === 1 ? '' : 's'}`),
    empty: ko ? '조건에 맞는 대리점이 없습니다.' : 'No dealers match your search.',
    noKey: ko ? '지도 API 키가 아직 설정되지 않았습니다. (목록·검색은 정상 작동)' : 'Map API key not set yet. (List & search still work.)',
    mapRoad: ko ? '지도' : 'Map',
    mapSky: ko ? '스카이뷰' : 'Sky',
  };
}

/* ── Kakao SDK loader (shared module-level promise) ───────────────── */
let sdkPromise: Promise<void> | null = null;
function loadKakao(appkey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('ssr'));
  const w = window as unknown as { kakao?: { maps?: { load?: (cb: () => void) => void } } };
  if (w.kakao?.maps?.load) {
    return new Promise((res) => w.kakao!.maps!.load!(() => res()));
  }
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    // autoload=false → we call kakao.maps.load() ourselves. services =
    // Geocoder (address→coord), clusterer = MarkerClusterer.
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appkey)}&autoload=false&libraries=services,clusterer`;
    s.async = true;
    s.onload = () => {
      const kw = window as unknown as { kakao: { maps: { load: (cb: () => void) => void } } };
      kw.kakao.maps.load(() => resolve());
    };
    s.onerror = () => {
      sdkPromise = null;
      reject(new Error('kakao sdk load failed'));
    };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

function haversineKm(a: Coord, b: Coord): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// Orange teardrop pin as an inline SVG data URL — matches the brand
// accent instead of Kakao's default red marker.
const PIN = (active: boolean) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${active ? 40 : 30}" height="${active ? 52 : 40}" viewBox="0 0 30 40">
      <path d="M15 0C6.7 0 0 6.6 0 14.8 0 25.9 15 40 15 40s15-14.1 15-25.2C30 6.6 23.3 0 15 0z" fill="${active ? '#ff6b1a' : '#2f6bff'}"/>
      <circle cx="15" cy="14.5" r="5.4" fill="#fff"/>
    </svg>`,
  );

/* ── Minimal Kakao typings (only what we touch) ───────────────────── */
type KMap = { setMapTypeId: (id: unknown) => void; panTo: (ll: unknown) => void; setLevel: (n: number, opt?: unknown) => void; setBounds: (b: unknown) => void };
type KMarker = { setMap: (m: unknown) => void; setImage: (img: unknown) => void; getPosition: () => unknown };
interface KakaoNS {
  maps: {
    Map: new (el: HTMLElement, opts: { center: unknown; level: number }) => KMap;
    LatLng: new (lat: number, lng: number) => unknown;
    LatLngBounds: new () => { extend: (ll: unknown) => void };
    Marker: new (opts: { position: unknown; image?: unknown; title?: string }) => KMarker;
    MarkerImage: new (src: string, size: unknown, opts?: unknown) => unknown;
    Size: new (w: number, h: number) => unknown;
    Point: new (x: number, y: number) => unknown;
    MapTypeId: { ROADMAP: unknown; SKYVIEW: unknown };
    event: { addListener: (t: unknown, ev: string, cb: () => void) => void };
    services: {
      Geocoder: new () => {
        addressSearch: (addr: string, cb: (result: Array<{ x: string; y: string }>, status: string) => void) => void;
      };
      Status: { OK: string };
    };
    MarkerClusterer: new (opts: { map: KMap; averageCenter?: boolean; minLevel?: number; disableClickZoom?: boolean }) => {
      addMarkers: (m: KMarker[]) => void;
      clear: () => void;
    };
  };
}
function getKakao(): KakaoNS {
  return (window as unknown as { kakao: KakaoNS }).kakao;
}

export default function DealersLocator({ locale, regions, dealers, appkey }: Props) {
  const labels = labelsFor(locale);
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KMap | null>(null);
  const markersRef = useRef<Map<string, KMarker>>(new Map());
  const clustererRef = useRef<{ addMarkers: (m: KMarker[]) => void; clear: () => void } | null>(null);

  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'no-key' | 'error'>('idle');
  const [coords, setCoords] = useState<Record<string, Coord>>(() => {
    const seed: Record<string, Coord> = {};
    for (const d of dealers) {
      if (typeof d.lat === 'number' && typeof d.lng === 'number') seed[d.id] = { lat: d.lat, lng: d.lng };
    }
    return seed;
  });
  const [userLoc, setUserLoc] = useState<Coord | null>(null);
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'ROADMAP' | 'SKYVIEW'>('ROADMAP');

  const cardRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  // ── Init map + geocode + markers ────────────────────────────────
  useEffect(() => {
    if (!appkey) { setStatus('no-key'); return; }
    if (!mapEl.current) return;
    setStatus('loading');
    let cancelled = false;

    loadKakao(appkey)
      .then(async () => {
        if (cancelled || !mapEl.current) return;
        const kakao = getKakao();
        const map = new kakao.maps.Map(mapEl.current, {
          center: new kakao.maps.LatLng(KOREA_CENTER.lat, KOREA_CENTER.lng),
          level: 13,
        });
        mapRef.current = map;

        // Geocode any dealer that lacks stored coords.
        const geocoder = new kakao.maps.services.Geocoder();
        const resolved: Record<string, Coord> = {};
        await Promise.all(
          dealers
            .filter((d) => !coords[d.id] && d.addr)
            .map(
              (d) =>
                new Promise<void>((res) => {
                  geocoder.addressSearch(d.addr as string, (result, statusStr) => {
                    if (statusStr === kakao.maps.services.Status.OK && result[0]) {
                      resolved[d.id] = { lat: Number(result[0].y), lng: Number(result[0].x) };
                    }
                    res();
                  });
                }),
            ),
        );
        if (cancelled) return;
        const all = { ...coords, ...resolved };
        setCoords(all);

        // Build markers + cluster.
        const clusterer = new kakao.maps.MarkerClusterer({ map, averageCenter: true, minLevel: 8, disableClickZoom: false });
        clustererRef.current = clusterer;
        const bounds = new kakao.maps.LatLngBounds();
        const markerList: KMarker[] = [];
        let any = false;
        for (const d of dealers) {
          const c = all[d.id];
          if (!c) continue;
          const pos = new kakao.maps.LatLng(c.lat, c.lng);
          const marker = new kakao.maps.Marker({
            position: pos,
            title: d.name,
            image: new kakao.maps.MarkerImage(PIN(false), new kakao.maps.Size(30, 40), { offset: new kakao.maps.Point(15, 40) }),
          });
          kakao.maps.event.addListener(marker, 'click', () => {
            setActiveId(d.id);
            const el = cardRefs.current.get(d.id);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
          markersRef.current.set(d.id, marker);
          markerList.push(marker);
          bounds.extend(pos);
          any = true;
        }
        clusterer.addMarkers(markerList);
        if (any) map.setBounds(bounds);
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('error'); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appkey]);

  // ── Geolocation (for distance sort) ─────────────────────────────
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {/* denied — no distance sort */},
      { timeout: 8000, maximumAge: 300000 },
    );
  }, []);

  // ── Map type toggle ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready') return;
    const kakao = getKakao();
    map.setMapTypeId(mapType === 'ROADMAP' ? kakao.maps.MapTypeId.ROADMAP : kakao.maps.MapTypeId.SKYVIEW);
  }, [mapType, status]);

  // ── Highlight active marker (swap to the bigger/orange pin) ──────
  useEffect(() => {
    if (status !== 'ready') return;
    const kakao = getKakao();
    for (const [id, marker] of markersRef.current) {
      const on = id === activeId;
      marker.setImage(new kakao.maps.MarkerImage(PIN(on), new kakao.maps.Size(on ? 40 : 30, on ? 52 : 40), { offset: new kakao.maps.Point(on ? 20 : 15, on ? 52 : 40) }));
    }
  }, [activeId, status]);

  // ── Filter + sort the list ──────────────────────────────────────
  const center = userLoc ?? HQ;
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = dealers
      .filter((d) => regionFilter === 'all' || d.regionId === regionFilter)
      .filter((d) => {
        if (!q) return true;
        return [d.name, d.addr, d.tel, d.manager].some((v) => (v ?? '').toLowerCase().includes(q));
      })
      .map((d) => {
        const c = coords[d.id];
        const dist = userLoc && c ? haversineKm(userLoc, c) : c ? haversineKm(center, c) : null;
        return { dealer: d, dist };
      });
    // Sort by distance when we have any coords; unknown-distance rows sink.
    rows.sort((a, b) => {
      if (a.dist == null && b.dist == null) return 0;
      if (a.dist == null) return 1;
      if (b.dist == null) return -1;
      return a.dist - b.dist;
    });
    return rows;
  }, [dealers, regionFilter, query, coords, userLoc, center]);

  const onSelectCard = useCallback((d: Dealer) => {
    setActiveId(d.id);
    const c = coords[d.id];
    const map = mapRef.current;
    if (map && c && status === 'ready') {
      const kakao = getKakao();
      map.panTo(new kakao.maps.LatLng(c.lat, c.lng));
      map.setLevel(5);
    }
  }, [coords, status]);

  const showDistance = !!userLoc;

  return (
    <div className="dl-locator">
      {/* ── Map ─────────────────────────────────────────────────── */}
      <div className="dl-map-wrap">
        {status === 'no-key' ? (
          <div className="dl-map-fallback">
            <span className="dl-map-fallback-badge">MAP</span>
            <p>{labels.noKey}</p>
            <p className="dl-map-fallback-hint"><code>NEXT_PUBLIC_KAKAO_MAP_APPKEY</code></p>
          </div>
        ) : (
          <>
            <div ref={mapEl} className="dl-map" role="img" aria-label="대리점 지도" />
            <div className="dl-map-types">
              <button type="button" className={mapType === 'ROADMAP' ? 'on' : ''} onClick={() => setMapType('ROADMAP')}>{labels.mapRoad}</button>
              <button type="button" className={mapType === 'SKYVIEW' ? 'on' : ''} onClick={() => setMapType('SKYVIEW')}>{labels.mapSky}</button>
            </div>
            {status === 'loading' ? <div className="dl-map-loading">지도 불러오는 중…</div> : null}
          </>
        )}
      </div>

      {/* ── Panel ───────────────────────────────────────────────── */}
      <div className="dl-panel">
        <div className="dl-controls">
          <div className="dl-row">
            <div className="dl-select">
              <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} aria-label={labels.allRegions}>
                <option value="all">{labels.allRegions}</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>{locale === 'en' ? r.en || r.ko : r.ko || r.en}</option>
                ))}
              </select>
              <span className="dl-select-caret" aria-hidden>▾</span>
            </div>
            <div className="dl-search">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={labels.searchPlaceholder}
                aria-label={labels.searchPlaceholder}
              />
              <span className="dl-search-icon" aria-hidden>⌕</span>
            </div>
          </div>
          <button type="button" className="dl-reset" onClick={() => { setQuery(''); setRegionFilter('all'); setActiveId(null); }}>
            ↻ {labels.reset}
          </button>
        </div>

        <div className="dl-count">{labels.count(list.length)}</div>

        {list.length === 0 ? (
          <div className="dl-empty">{labels.empty}</div>
        ) : (
          <ul className="dl-list">
            {list.map(({ dealer: d, dist }) => (
              <li
                key={d.id}
                ref={(el) => { if (el) cardRefs.current.set(d.id, el); else cardRefs.current.delete(d.id); }}
                className={`dl-card${activeId === d.id ? ' is-active' : ''}`}
                onClick={() => onSelectCard(d)}
              >
                <div className="dl-card-head">
                  <h3 className="dl-card-name">{d.name}</h3>
                  {dist != null && showDistance ? (
                    <span className="dl-card-dist">📍 {dist < 100 ? dist.toFixed(1) : Math.round(dist)}{labels.km}</span>
                  ) : null}
                </div>
                {d.addr ? <p className="dl-card-addr">{d.addr}</p> : null}
                <div className="dl-card-foot">
                  {d.tel ? (
                    <a href={`tel:${d.tel.replace(/[^0-9+]/g, '')}`} className="dl-card-tel" onClick={(e) => e.stopPropagation()}>
                      <span aria-hidden>📞</span> {d.tel}
                    </a>
                  ) : <span />}
                  {d.shopUrl || d.siteUrl ? (
                    <span className="dl-card-links">
                      {d.siteUrl ? (
                        <a href={d.siteUrl} target="_blank" rel="noreferrer" className="dl-card-shop" onClick={(e) => e.stopPropagation()}>
                          🌐 {labels.siteLink}
                        </a>
                      ) : null}
                      {d.shopUrl ? (
                        <a href={d.shopUrl} target="_blank" rel="noreferrer" className="dl-card-shop" onClick={(e) => e.stopPropagation()}>
                          🛒 {labels.shopLink}
                        </a>
                      ) : null}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
