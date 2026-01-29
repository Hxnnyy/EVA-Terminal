import matter from 'gray-matter';

import { type WritingMeta, WritingMetaSchema } from '@/content/types';
import { compileMdx } from '@/lib/mdx/compile';

export type ParsedWritingMdx = {
  meta: WritingMeta;
  body: string;
};

export type WritingMdxValidation =
  | { ok: true }
  | {
      ok: false;
      errors: string[];
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

export async function validateWritingMdx(
  source: string,
  fallbackMeta: Pick<WritingMeta, 'title'> & Partial<Omit<WritingMeta, 'title'>>,
): Promise<WritingMdxValidation> {
  try {
    parseWritingMdx(source, fallbackMeta);
  } catch (error) {
    return { ok: false, errors: [normalizeMdxError(error)] };
  }

  try {
    await compileMdx(source);
  } catch (error) {
    return { ok: false, errors: [`MDX syntax error: ${normalizeMdxError(error)}`] };
  }

  return { ok: true };
}

function normalizeMdxError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message.replace(/\s+/g, ' ').trim();
  }
  return 'Invalid MDX content.';
}
