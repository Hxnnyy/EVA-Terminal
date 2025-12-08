import matter from 'gray-matter';

import { type WritingMeta, WritingMetaSchema } from '@/content/types';

export type ParsedWritingMdx = {
  meta: WritingMeta;
  body: string;
};

export function parseWritingMdx(
  source: string,
  fallbackMeta: Pick<WritingMeta, 'title'> & Partial<Omit<WritingMeta, 'title'>>,
): ParsedWritingMdx {
  const { content, data } = matter(source ?? '');
  const normalizedData = { ...data };

  if (normalizedData.publishedAt instanceof Date) {
    normalizedData.publishedAt = normalizedData.publishedAt.toISOString();
  }

  const baseMeta: WritingMeta = {
    title: fallbackMeta.title,
    subtitle: fallbackMeta.subtitle,
    publishedAt: fallbackMeta.publishedAt ?? null,
    description: fallbackMeta.description,
    tags: fallbackMeta.tags,
  };

  const mergedMeta = { ...baseMeta, ...normalizedData };
  const parsed = WritingMetaSchema.safeParse(mergedMeta);

  if (!parsed.success) {
    const issues = parsed.error?.issues ?? [];
    const details =
      issues.length > 0
        ? issues.map((issue) => `${issue.path.join('.') || 'meta'}: ${issue.message}`).join('; ')
        : 'Unknown validation failure.';
    throw new Error(`Invalid writing frontmatter: ${details}`);
  }

  return {
    meta: parsed.data,
    body: content,
  };
}
