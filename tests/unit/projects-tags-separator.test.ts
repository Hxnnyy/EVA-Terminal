import { describe, expect, it } from 'vitest';

import { buildProjectsSuccessLines } from '@/features/terminal/lib/commands/projects';
import type { ProjectSummary } from '@/lib/supabase/projects';

describe('projects tags separator', () => {
  it('uses a middle-dot separator between tags', () => {
    const projects: ProjectSummary[] = [
      {
        id: 'p1',
        title: 'Test Project',
        blurb: 'Demo',
        tags: ['nextjs', 'supabase', 'webrtc'],
        actions: [],
        slug: null,
        hasCaseStudy: false,
      },
    ];

    const lines = buildProjectsSuccessLines(projects);
    const tagsLine = lines.find((line) => line.text.includes('nextjs'));

    expect(tagsLine?.text).toBe('nextjs · supabase · webrtc');
  });
});
