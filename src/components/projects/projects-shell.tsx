import type { ReactNode } from 'react';

import { ProjectsSidebar } from '@/components/projects/projects-sidebar';
import type { ProjectMonthGroup } from '@/lib/projects/grouping';

export type ProjectsShellProps = {
  groups: ProjectMonthGroup[];
  activeSlug?: string;
  children: ReactNode;
};

export function ProjectsShell({ groups, activeSlug, children }: ProjectsShellProps) {
  return (
    <div className="articles-shell">
      <aside className="articles-shell__sidebar">
        <ProjectsSidebar groups={groups} activeSlug={activeSlug} />
      </aside>
      <section className="articles-shell__reader">
        <div className="articles-shell__reader-surface">{children}</div>
      </section>
    </div>
  );
}
