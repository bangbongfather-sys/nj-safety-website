'use client';

/**
 * 기본정보 tab — the regulator-style summary table B2B buyers expect
 * to see on Naver Smart Store / K2 / Coupang. Two sections:
 *
 *   상품 기본 정보   — brand / 모델명 / 제조사 / 원산지
 *   상품정보제공고시  — 제품소재 / 색상 / 치수 / ... / AS책임자와 전화번호
 *
 * Row labels come from DEFAULT_BASIC_INFO_PRIMARY / DEFAULT_BASIC_INFO_DISCLOSURE
 * so the table layout is stable even before the admin fills anything in.
 * Editing writes to `basicInfo.primary[i].value` /
 * `basicInfo.disclosure[i].value` via the same EditableText surface
 * we use everywhere else.
 */

import type {
  ProductPageData,
  ProductBasicInfoRow,
} from '@/lib/product-page-types';
import { withBasicInfoDefaults } from '@/lib/product-page-types';
import EditableText, { type EditorApi } from '@/components/admin/EditableText';

type Props = {
  data: ProductPageData;
  editor?: EditorApi;
};

function Row({
  row,
  path,
  editor,
}: {
  row: ProductBasicInfoRow;
  path: string;
  editor?: EditorApi;
}) {
  return (
    <div className="pbi-row">
      <div className="pbi-label">{row.label}</div>
      <div className="pbi-value">
        {editor ? (
          <EditableText
            as="span"
            path={path}
            value={row.value}
            editor={editor}
            multiline
          />
        ) : (
          <span>{row.value || ' '}</span>
        )}
      </div>
    </div>
  );
}

export default function ProductBasicInfoTab({ data, editor }: Props) {
  // Always render the full structure — `withBasicInfoDefaults` backfills
  // missing rows so the table doesn't shift around as the admin types.
  const info = withBasicInfoDefaults(data.basicInfo);
  return (
    <div className="pbi">
      <section className="pbi-section">
        <h3 className="pbi-h">상품 기본 정보</h3>
        <div className="pbi-table">
          {info.primary!.map((row, i) => (
            <Row
              key={row.label}
              row={row}
              path={`basicInfo.primary[${i}].value`}
              editor={editor}
            />
          ))}
        </div>
      </section>

      <section className="pbi-section">
        <h3 className="pbi-h">상품정보제공고시</h3>
        <div className="pbi-table">
          {info.disclosure!.map((row, i) => (
            <Row
              key={row.label}
              row={row}
              path={`basicInfo.disclosure[${i}].value`}
              editor={editor}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
