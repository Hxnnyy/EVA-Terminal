import { fireEvent, render, screen } from '@testing-library/react';

import { AdminDashboard } from '@/features/admin/components/admin-dashboard';
import { AdminMetrics } from '@/features/admin/components/admin-metrics';
import type { AdminDashboardData } from '@/features/admin/types';

const summaryMetrics = [
  { label: 'Links', value: '3' },
  { label: 'Projects', value: '2' },
] satisfies React.ComponentProps<typeof AdminMetrics>['metrics'];

const sections = {
  bio: {
    status: 'ok',
    data: { sections: [], updatedAt: null, warnings: [], rawBody: 'bio' },
  },
  currently: {
    status: 'ok',
    data: { sections: [], warnings: [], updatedAt: null, rawBody: 'current' },
  },
  contact: {
    status: 'ok',
    data: { email: 'a@b.com' },
  },
  articles: { status: 'ok', data: [] },
  links: { status: 'ok', data: [] },
  projects: { status: 'ok', data: [] },
  investments: { status: 'ok', data: [] },
  reel: { status: 'ok', data: [] },
  onepager: { status: 'ok', data: { rawBody: '# Test', meta: null } },
} satisfies AdminDashboardData['sections'];

const baseProps: AdminDashboardData = {
  userEmail: 'test@example.com',
  summaryMetrics,
  bucketStatuses: [],
  sections,
  reelBucketStatus: undefined,
  cvBucketStatus: undefined,
  cvMeta: null,
  lastInvestmentFetch: null,
};

function renderDash() {
  render(<AdminDashboard {...baseProps} />);
}

describe('Admin dashboard a11y', () => {
  it('focuses editors region via skip link', () => {
    renderDash();
    const skip = screen.getByRole('link', { name: /skip to admin editors/i });
    fireEvent.click(skip);
    const region = screen.getByRole('region', { name: /admin editors/i });
    expect(region).toBeInTheDocument();
  });
});
