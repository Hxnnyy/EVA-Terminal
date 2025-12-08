import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { ArticlesSidebar } from '@/components/articles/articles-sidebar';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('ArticlesSidebar', () => {
  it('shows an inline empty state when no groups exist', () => {
    render(<ArticlesSidebar groups={[]} activeSlug={undefined} />);

    expect(
      screen.getByText(/No articles are published yet. Publish your first entry/i),
    ).toBeInTheDocument();
    const adminLink = screen.getByRole('link', { name: /open admin/i });
    expect(adminLink).toHaveAttribute('href', '/admin');
  });
});
