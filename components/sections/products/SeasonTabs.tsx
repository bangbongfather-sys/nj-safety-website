'use client';

/**
 * Sticky season-tabs bar with IntersectionObserver scroll-spy.
 *
 * Sits below the main nav (top: 112px) and stays pinned as the
 * visitor scrolls through the season blocks. Tabs:
 *   - Click → smooth-scroll to #<seasonId>, offset for the sticky bar
 *   - Active state auto-syncs based on which season is most visible
 *
 * Server passes in the season list pre-localised so we don't re-derive
 * labels client-side (the dict is heavier than this whole component).
 */

import { useEffect, useState } from 'react';

export type SeasonTab = {
  id: string;        // 'all' | 'summer' | 'sf' | 'winter' …
  labelKo: string;
  labelEn: string;
  href: string;      // '#summer' style
};

type Props = {
  tabs: SeasonTab[];
  totalCount: number;
  countSuffix: string;
  locale: 'ko' | 'en';
};

export default function SeasonTabs({ tabs, totalCount, countSuffix, locale }: Props) {
  const [activeId, setActiveId] = useState<string>(tabs[0]?.id ?? '');

  useEffect(() => {
    // Observe each season section. The "all" pseudo-tab matches the
    // first real season for highlight purposes (so when the hero is on
    // screen we still show All as the active selection).
    const sectionIds = tabs.filter((t) => t.id !== 'all').map((t) => t.id);
    const sections: HTMLElement[] = [];
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) sections.push(el);
    }
    if (sections.length === 0) return;

    // rootMargin tuned so the active tab flips when the section is
    // roughly centred — feels natural while scrolling and avoids the
    // active tab jumping around at section boundaries.
    const io = new IntersectionObserver(
      (entries) => {
        // Pick the entry with the largest intersectionRatio that's
        // also intersecting — handles the case where two sections
        // overlap the viewport (e.g. between two tightly packed
        // seasons).
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [tabs]);

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#')) return;
    e.preventDefault();
    const id = href.slice(1);
    if (id === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveId('all');
      return;
    }
    const el = document.getElementById(id);
    if (!el) return;
    // Offset = 112 (nav) + 56 (sticky bar). scroll-margin-top on the
    // section already absorbs the offset, so we just call scrollIntoView.
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
  };

  return (
    <div className="pl-tabs">
      <div className="wrap pl-tabs-inner">
        <ul className="pl-tabs-list" role="tablist" aria-label={locale === 'en' ? 'Seasons' : '시즌'}>
          {tabs.map((t) => {
            const isActive = activeId === t.id;
            const label = locale === 'en' ? t.labelEn : t.labelKo;
            return (
              <li key={t.id} role="presentation">
                <a
                  role="tab"
                  href={t.href}
                  aria-selected={isActive}
                  onClick={(e) => onClick(e, t.href)}
                  className={`pl-tabs-btn${isActive ? ' is-active' : ''}`}
                >
                  <span className="en">{t.labelEn}</span>
                  <span>{label}</span>
                </a>
              </li>
            );
          })}
        </ul>
        <div className="pl-tabs-count">
          {String(totalCount).padStart(2, '0')} {countSuffix}
        </div>
      </div>
    </div>
  );
}
