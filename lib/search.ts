/**
 * Matching rules for the site-wide search.
 *
 * Kept out of the component so the behaviour is testable on its own and
 * so the index shape has one definition both the builder script and the
 * UI agree on.
 */

export type SearchKind = 'product' | 'notice' | 'resource' | 'dealer' | 'page';

export type SearchRecord = {
  kind: SearchKind;
  title: string;
  sub?: string;
  /** Pre-joined haystack built at build time. */
  text: string;
  url: string;
};

export type SearchIndex = Record<'ko' | 'en', SearchRecord[]>;

export type SearchHit = SearchRecord & { score: number };

/** Lowercase and drop whitespace so "방염 자켓" matches "방염자켓". */
export function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '');
}

const CHO = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

/**
 * Initial-consonant form of Korean text: 아라미드 → ㅇㄹㅁㄷ.
 *
 * Korean users routinely search by 초성, and without this "ㅇㄹㅁㄷ"
 * finds nothing. Non-Hangul characters pass through unchanged so mixed
 * strings still line up with the query.
 */
export function toChosung(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      out += CHO[Math.floor((code - 0xac00) / 588)];
    } else {
      out += ch;
    }
  }
  return out;
}

/** True when every whitespace-separated term is present somewhere. */
function matchesAllTerms(haystack: string, terms: string[]): boolean {
  return terms.every((t) => haystack.includes(t));
}

/**
 * Rank rules, highest first:
 *   4 — title starts with the query
 *   3 — title contains it
 *   2 — the sub-line (model, category, date) contains it
 *   1 — body text only
 * Chosung matches score one below their literal equivalent so a real
 * text match always outranks an initials coincidence.
 */
export function search(records: SearchRecord[], rawQuery: string, limit = 24): SearchHit[] {
  const q = normalize(rawQuery);
  if (q.length === 0) return [];

  const terms = normalize(rawQuery).length === rawQuery.trim().length
    ? [q]
    : rawQuery.trim().split(/\s+/).map(normalize).filter(Boolean);
  const qCho = toChosung(q);
  // Only treat the query as 초성 when it is *entirely* initial consonants;
  // otherwise "ㅇ라미드" style partials would match far too much.
  const isChosungQuery = /^[ㄱ-ㅎ]+$/.test(q);

  const hits: SearchHit[] = [];

  for (const r of records) {
    const title = normalize(r.title);
    const sub = normalize(r.sub ?? '');
    const text = normalize(r.text);

    let score = 0;
    if (title.startsWith(q)) score = 4;
    else if (title.includes(q)) score = 3;
    else if (sub.includes(q)) score = 2;
    else if (matchesAllTerms(text, terms)) score = 1;

    if (score === 0 && isChosungQuery) {
      if (toChosung(title).includes(qCho)) score = 2;
      else if (toChosung(text).includes(qCho)) score = 1;
    }

    if (score > 0) hits.push({ ...r, score });
  }

  const KIND_ORDER: Record<SearchKind, number> = {
    product: 0, notice: 1, resource: 2, dealer: 3, page: 4,
  };
  hits.sort((a, b) => b.score - a.score || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
  return hits.slice(0, limit);
}
