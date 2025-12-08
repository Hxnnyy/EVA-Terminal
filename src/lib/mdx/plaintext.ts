const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;
const STRONG_PATTERN = /\*\*([^*]+)\*\*/g;
const EMPHASIS_PATTERN = /\*([^*]+)\*/g;
const INLINE_CODE_PATTERN = /`([^`]+)`/g;
const HTML_TAG_PATTERN = /<\/?[^>]+>/g;
const MULTISPACE_PATTERN = /\s+/g;

const CODE_FENCE_PATTERN = /```([\s\S]*?)```/g;
const HEADING_PATTERN = /^#{1,6}\s*/gm;
const ORDERED_LIST_PATTERN = /^\s*\d+\.\s*/gm;
const UNORDERED_LIST_PATTERN = /^\s*[-*+]\s*/gm;

/**
 * Converts an MDX string into plain text paragraphs that fit terminal output.
 */
export function mdxToPlainParagraphs(source: string): string[] {
  if (!source.trim()) {
    return [];
  }

  let normalized = source;

  normalized = normalized.replace(CODE_FENCE_PATTERN, (_, code: string) => {
    return code
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n');
  });

  normalized = normalized.replace(HEADING_PATTERN, '');
  normalized = normalized.replace(ORDERED_LIST_PATTERN, '');
  normalized = normalized.replace(UNORDERED_LIST_PATTERN, '');
  normalized = normalized.replace(LINK_PATTERN, (_, text: string, url: string) => {
    const label = text.trim();
    const href = url.trim();
    if (!href) {
      return label;
    }
    return `${label} -> ${href}`;
  });
  normalized = normalized.replace(STRONG_PATTERN, '$1');
  normalized = normalized.replace(EMPHASIS_PATTERN, '$1');
  normalized = normalized.replace(INLINE_CODE_PATTERN, '$1');
  normalized = normalized.replace(HTML_TAG_PATTERN, '');
  normalized = normalized.replace(MULTISPACE_PATTERN, ' ');

  return normalized
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}
