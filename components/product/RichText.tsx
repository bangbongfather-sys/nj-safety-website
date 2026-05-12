import type { ElementType } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';

type Props = {
  html?: string | null;
  as?: ElementType;
  className?: string;
};

export default function RichText({ html, as: Tag = 'span', className }: Props) {
  if (!html) return null;
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}
