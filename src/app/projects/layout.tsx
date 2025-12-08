import type { ReactNode } from 'react';

import { ProjectsShell } from '@/components/projects/projects-shell';
import { groupProjectsByMonth } from '@/lib/projects/grouping';
import { fetchProjects } from '@/lib/supabase/projects';

export const metadata = {
  title: 'Projects',
};

export type ProjectsLayoutProps = {
  children: ReactNode;
  params?: { slug?: string };
};

export default async function ProjectsLayout({ children, params }: ProjectsLayoutProps) {
  const projects = await fetchProjects();
  const published = projects.filter((project) => project.slug && project.hasCaseStudy);
  const groups = groupProjectsByMonth(published);
  const activeSlug = params?.slug;

  return (
    <div className="articles-layout">
      <ProjectsShell groups={groups} activeSlug={activeSlug}>
        {children}
      </ProjectsShell>
    </div>
  );
}
