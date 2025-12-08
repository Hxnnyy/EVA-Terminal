export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="admin-shell__sidebar">
        <h1>MAGI Admin</h1>
        <p className="admin-shell__subtitle">Manage content, assets, and terminal modules.</p>
      </aside>
      <main className="admin-shell__main">{children}</main>
    </div>
  );
}
