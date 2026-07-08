'use client';

/**
 * 시험성적서 tab — list of PDF reports uploaded to R2.
 *
 * Public mode (no editor): renders a clean list of links. Each link has
 * a small label + file size + opens the PDF in a new tab.
 *
 * Editor mode: same list with a delete button per file + a "+ PDF 추가"
 * button that opens a file picker, uploads to R2 via the same Worker
 * endpoint as image uploads (PDFs are just bytes — the Worker doesn't
 * care about content type), and appends the new file to
 * data.testReports.files. The editor parent flushes the dict after the
 * upload returns (via onUploadComplete-style behaviour) so the rebuild
 * starts immediately.
 */

import { useRef, useState } from 'react';
import type {
  ProductPageData,
  ProductTestReportFile,
} from '@/lib/product-page-types';
import type { EditorApi } from '@/components/admin/EditableText';
import DropTarget from '@/components/admin/DropTarget';

const UPLOAD_ENDPOINT = '/api/admin/upload-image';

type Props = {
  data: ProductPageData;
  editor?: EditorApi;
  /** Required for upload — the admin's GitHub PAT (we re-use the same
   *  auth check the image-upload Worker does). */
  pat?: string;
  /** Identifies the product so we can bucket uploads under
   *  products/<slug>/reports/. */
  slug: string;
  /** Mirror the image-upload behaviour: flush dict to GitHub immediately
   *  after a successful PDF upload so the public link goes live ~90s
   *  later instead of waiting for the autosave debounce. */
  onAfterUpload?: () => void;
};

function fmtSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function ProductTestReportsTab({
  data,
  editor,
  pat,
  slug,
  onAfterUpload,
}: Props) {
  const files: ProductTestReportFile[] = data.testReports?.files ?? [];
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Shared upload flow — wired to both the file-picker change event and
  // the DropTarget drop callback so click + drag behave identically.
  const uploadFile = async (file: File) => {
    if (!editor?.onImagePatch || !pat) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErr('PDF 파일만 업로드 가능합니다');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setErr('파일이 너무 큽니다 (최대 30MB)');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      // R2 key: products/<slug>/reports/<timestamp>-<safe-name>.pdf
      // Timestamp prevents collisions when the admin re-uploads a file
      // with the same name; safe-name keeps the URL human-readable.
      // ASCII-only — Worker's KEY_RE rejects every code point outside
      // [a-z0-9_\-./], so 한글 파일명 ("pk방염-니트.pdf" etc.) collapse
      // to hyphens here. The display name in newFile.name preserves
      // the original characters for the visible label.
      const safeName = file.name
        .toLowerCase()
        .replace(/\.pdf$/i, '')
        .replace(/[^a-z0-9\-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50);
      const key = `products/${slug}/reports/${Date.now()}-${safeName || 'report'}.pdf`;
      const r = await fetch(
        `${UPLOAD_ENDPOINT}?key=${encodeURIComponent(key)}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `token ${pat}`,
            'Content-Type': 'application/pdf',
          },
          body: file,
        },
      );
      if (!r.ok) {
        const text = await r.text().catch(() => `${r.status}`);
        throw new Error(`업로드 실패: ${r.status} — ${text.slice(0, 200)}`);
      }
      const payload = (await r.json()) as { publicUrl?: string; size?: number };
      if (!payload.publicUrl) throw new Error('업로드 응답이 잘못되었습니다');

      const newFile: ProductTestReportFile = {
        url: `${payload.publicUrl}?v=${Date.now()}`,
        name: file.name.replace(/\.pdf$/i, ''),
        size: payload.size ?? file.size,
        uploadedAt: new Date().toISOString(),
      };
      const next = [...files, newFile];
      // Persist by setting the whole files array in one go (the editor's
      // onImagePatch just writes a string at a path, but we cheat by
      // serializing — see notes below). Cleaner long-term would be to
      // expose a generic onJsonPatch on EditorApi; for now we work with
      // what's there.
      // Workaround: write a sentinel value that the parent recognises.
      // Actually the simplest path is: call onPatch for each field of
      // the new file. But the array index is `files.length` (new last).
      const i = files.length;
      editor.onPatch?.(`testReports.files[${i}].url`,        newFile.url);
      editor.onPatch?.(`testReports.files[${i}].name`,       newFile.name ?? '');
      editor.onPatch?.(`testReports.files[${i}].size`,       String(newFile.size ?? ''));
      editor.onPatch?.(`testReports.files[${i}].uploadedAt`, newFile.uploadedAt ?? '');
      // Avoid the unused-var lint
      void next;
      onAfterUpload?.();
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (i: number) => {
    if (!editor) return;
    if (!window.confirm('이 PDF를 목록에서 제거할까요?\n(R2의 실제 파일은 그대로 남습니다.)')) return;
    // Remove by writing the remaining files back. We zero out the last
    // index by setting url to '' and rely on the renderer to filter.
    // Simpler: rewrite each entry shifted left. Since EditorApi doesn't
    // expose array splice, the cleanest move is to write empty strings
    // for the removed slot's fields and have the renderer skip rows
    // without a url.
    editor.onPatch?.(`testReports.files[${i}].url`,        '');
    editor.onPatch?.(`testReports.files[${i}].name`,       '');
    editor.onPatch?.(`testReports.files[${i}].size`,       '');
    editor.onPatch?.(`testReports.files[${i}].uploadedAt`, '');
    onAfterUpload?.();
  };

  // Filter to "non-empty" entries — admin deletions write empty url
  const visible = files
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => !!f.url);

  return (
    <div className="ptr">
      <div className="ptr-head">
        <h3 className="ptr-h">시험성적서 / 인증 문서</h3>
        <p className="ptr-lead">
          PDF 형식의 시험 성적서·인증서를 다운로드할 수 있습니다.
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="ptr-empty">
          {editor
            ? '아직 첨부된 PDF가 없습니다. 아래 버튼으로 추가하세요.'
            : '등록된 시험 성적서가 없습니다.'}
        </div>
      ) : (
        <ul className="ptr-list">
          {visible.map(({ f, i }) => (
            <li key={f.url + i} className="ptr-item">
              <a
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="ptr-link"
              >
                <span className="ptr-pdf-icon" aria-hidden>PDF</span>
                <span className="ptr-meta">
                  <span className="ptr-name">{f.name || `시험성적서 ${i + 1}`}</span>
                  <span className="ptr-sub">
                    {fmtSize(f.size)}
                    {f.uploadedAt ? ` · ${fmtDate(f.uploadedAt)}` : ''}
                  </span>
                </span>
                <span className="ptr-action">다운로드 ↓</span>
              </a>
              {editor ? (
                <button
                  type="button"
                  className="ptr-del"
                  onClick={() => handleDelete(i)}
                  aria-label="이 PDF 제거"
                >
                  삭제
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {editor ? (
        <DropTarget
          onFile={(f) => void uploadFile(f)}
          accept={['application/pdf', '.pdf']}
          disabled={busy}
          hint="PDF 끌어놓기"
          className="ptr-foot"
          style={{ borderRadius: 10 }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void uploadFile(f);
            }}
          />
          <button
            type="button"
            className="ptr-add"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            {busy ? '⏳ 업로드 중...' : '＋ PDF 추가 (또는 파일 끌어놓기)'}
          </button>
          {err ? <p className="ptr-err">{err}</p> : null}
        </DropTarget>
      ) : null}
    </div>
  );
}
