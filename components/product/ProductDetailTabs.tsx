'use client';

/**
 * Tabs under the shop-style header on the product detail page.
 *
 * Each tab receives its content as children at render time — the parent
 * (ProductPage) decides which sections live in which tab. We keep the
 * inactive panes mounted but hidden via CSS so the contentEditable
 * surfaces inside admin mode don't lose focus when the admin switches
 * tabs mid-edit (this also means no animation flicker on switch).
 *
 * Tab labels live on the client and don't go through the i18n dict —
 * they're structural UI chrome, not marketing copy. If we ever need
 * Korean/English split here, lift labels into the parent.
 */
import { useState, type ReactNode } from 'react';

export type ProductTab = {
  key: string;
  label: string;
  /** Hidden when null/false — lets a tab self-disable when its data is empty. */
  content: ReactNode;
};

type Props = {
  tabs: ProductTab[];
};

export default function ProductDetailTabs({ tabs }: Props) {
  const visible = tabs.filter((t) => !!t.content);
  const [active, setActive] = useState(visible[0]?.key ?? '');
  if (visible.length === 0) return null;

  return (
    <div className="pdt">
      {/* Sticky bar so the tabs stay reachable as the long detail content scrolls. */}
      <div className="pdt-bar">
        <div className="pdt-bar-inner">
          {visible.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`pdt-tab${t.key === active ? ' is-on' : ''}`}
              onClick={() => setActive(t.key)}
              aria-selected={t.key === active}
              role="tab"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pdt-panes">
        {visible.map((t) => (
          <div
            key={t.key}
            className={`pdt-pane${t.key === active ? ' is-on' : ''}`}
            role="tabpanel"
            hidden={t.key !== active}
          >
            {t.content}
          </div>
        ))}
      </div>
    </div>
  );
}
