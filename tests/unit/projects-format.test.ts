import { describe, expect, it } from 'vitest';

import type { ProjectSummary } from '@/lib/supabase/projects';
import { buildProjectsSuccessLines } from '@/lib/terminal/commands/projects';

const baseProject: ProjectSummary = {
  id: 'p1',
  slug: 'demo-project',
  title: 'Demo Project',
  blurb: 'Demo blurb',
  tags: ['nextjs', 'supabase'],
  actions: [{ kind: 'external', href: 'https://example.com', label: 'Launch' }],
};

describe('buildProjectsSuccessLines', () => {
  it('includes case study link when hasCaseStudy and slug are present', () => {
    const lines = buildProjectsSuccessLines([{ ...baseProject, hasCaseStudy: true }]);
    const texts = lines.map((line) => line.text);
    expect(texts).toContain('Case Study:');
    expect(texts).toContain('/projects/demo-project');
  });

  it('omits case study link when flag is false', () => {
    const lines = buildProjectsSuccessLines([{ ...baseProject, hasCaseStudy: false }]);
    const texts = lines.map((line) => line.text);
    expect(texts).not.toContain('Case Study:');
  });
});
