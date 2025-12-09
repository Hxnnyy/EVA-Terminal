import { redirect } from 'next/navigation';

import { shouldTriggerError } from '@/lib/errors/should-trigger-error';
import { fetchProjects } from '@/lib/supabase/projects';
import type { SearchParams } from '@/types/routes';

export const revalidate = 300;

type ProjectsIndexPageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

export default async function ProjectsIndexPage({ searchParams }: ProjectsIndexPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (shouldTriggerError(resolvedSearchParams)) {
    throw new Error('Projects boundary drill triggered');
  }

  const projects = await fetchProjects();
  const published = projects.filter((project) => project.slug && project.hasCaseStudy);

  if (published.length) {
    const sorted = [...published].sort((a, b) => {
      const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
      const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      return bTime - aTime;
    });
    const latest = sorted[0];
    if (latest?.slug) {
      redirect(`/projects/${latest.slug}`);
    }
  }

  return (
    <div className="articles-empty">
      <p className="articles-placeholder__eyebrow">Projects</p>
      <h1>Archive not yet initialized.</h1>
      <p>Publish a project case study via the admin dashboard to activate this space.</p>
    </div>
  );
}
