import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { ProjectsManager } from '@/features/admin/components/projects-manager';
import { ReelManager } from '@/features/admin/components/reel-manager';
import type { AdminReelItem } from '@/features/admin/types';
import * as fetchJson from '@/lib/admin/fetch-json';

const projects = [
  {
    id: 'p1',
    title: 'Existing',
    slug: 'existing',
    blurb: '',
    url: null,
    tags: ['next'],
    order: 1,
  },
];

const reelItems: AdminReelItem[] = [];

describe('Admin projects + reel managers', () => {
  it('shows an error when adding a project without a title', () => {
    const spy = vi.spyOn(fetchJson, 'adminFetchJson').mockResolvedValue({
      project: {
        id: 'p2',
        title: 'New',
        slug: 'new',
        blurb: '',
        url: null,
        tags: [],
        order: 2,
      },
    });

    render(<ProjectsManager initialProjects={projects} />);

    fireEvent.click(screen.getByRole('button', { name: /add project/i }));

    expect(screen.getByText(/fix the validation errors/i)).toBeInTheDocument();
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it('requires an image file before uploading reel item', () => {
    const spy = vi.spyOn(fetchJson, 'adminFetchJson').mockResolvedValue({});

    render(<ReelManager initialReel={reelItems} bucketStatus={{ ok: true }} />);

    fireEvent.click(screen.getByRole('button', { name: /add image/i }));

    expect(screen.getByText(/image file is required/i)).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });
});
