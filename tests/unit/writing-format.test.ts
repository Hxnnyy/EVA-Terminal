import { describe, expect, it } from 'vitest';

import { buildWritingListLines, type WritingSummary } from '@/lib/terminal/commands/writing';

const sampleSummaries: WritingSummary[] = [
  {
    slug: 'prompt-1-mapping-master-v4-5',
    title: 'Prompt Mapping Master v4.5',
    subtitle: 'Placeholder article stored in Supabase',
    publishedAt: '2025-03-12T12:00:00Z',
  },
];

describe('buildWritingListLines', () => {
  it('renders header and link lines', () => {
    const lines = buildWritingListLines(sampleSummaries);
    expect(lines[0]?.text).toBe('RETRIEVING ARTICLE DOSSIER...');
    const entryLine = lines.find((line) => line.text.includes(sampleSummaries[0]!.title));
    expect(entryLine?.segments?.[1]?.href).toContain(`/articles/${sampleSummaries[0]!.slug}`);
    expect(entryLine?.segments?.[1]?.text).toBe(sampleSummaries[0]!.title);
  });

  it('renders empty state when no entries exist', () => {
    const lines = buildWritingListLines([]);
    expect(lines[1]?.text).toContain('No published articles yet');
  });
});
