import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LinksManager } from '@/features/admin/components/links-manager';
import * as fetchJson from '@/lib/admin/fetch-json';

const initialLinks = [
  { id: '1', category: 'social' as const, label: 'GitHub', url: 'https://github.com', order: 1 },
];

describe('LinksManager', () => {
  it('requires label and url', async () => {
    vi.spyOn(fetchJson, 'adminFetchJson').mockResolvedValue({
      link: { id: '2', category: 'social', label: 'Site', url: 'https://example.dev', order: 2 },
    });
    render(<LinksManager initialLinks={initialLinks} />);
    const saveButton = screen.getByRole('button', { name: /add link/i });
    fireEvent.click(saveButton);
    await waitFor(() => expect(screen.getByText(/fix the validation errors/i)).toBeInTheDocument());
    expect(screen.getByText(/label is required/i)).toBeInTheDocument();
  });

  it('surfaces server validation details', async () => {
    vi.spyOn(fetchJson, 'adminFetchJson').mockRejectedValue(
      new fetchJson.AdminApiError('Invalid payload', 400, { details: ['URL must be https'] }),
    );
    render(<LinksManager initialLinks={initialLinks} />);
    fireEvent.change(screen.getByLabelText(/label/i), { target: { value: 'Site' } });
    fireEvent.change(screen.getByLabelText(/^url$/i), { target: { value: 'http://bad.test' } });
    fireEvent.click(screen.getByRole('button', { name: /add link/i }));

    await waitFor(() => expect(screen.getByText(/failed to create link/i)).toBeInTheDocument());
    expect(screen.getByText(/url must be https/i)).toBeInTheDocument();
  });
});
