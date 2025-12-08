import type { Metadata } from 'next';

import { AdminShell } from '../components/admin-shell';

export const metadata: Metadata = {
  title: 'Admin | EVA Terminal',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
