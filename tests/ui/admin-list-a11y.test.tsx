import { render, screen } from '@testing-library/react';

import {
  AdminList,
  type AdminListColumn,
  type AdminListRow,
} from '@/features/admin/components/admin-list';

type Row = { id: string; name: string; role: string };

const columns: AdminListColumn<Row>[] = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role' },
];

const rows: AdminListRow<Row>[] = [
  {
    id: '1',
    data: { id: '1', name: 'Rei', role: 'Pilot' },
    actions: [{ label: 'Delete', onClick: () => {} }],
  },
];

describe('AdminList accessibility', () => {
  it('renders caption and headers', () => {
    render(
      <AdminList columns={columns} rows={rows} ariaLabel="Test list" caption="Pilot assignments" />,
    );

    expect(screen.getByRole('table', { name: /test list/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByText('Pilot assignments')).toHaveAttribute('role', 'caption');
  });
});
