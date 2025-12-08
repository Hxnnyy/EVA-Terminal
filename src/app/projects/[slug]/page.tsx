import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getMdxContent } from '@/lib/mdx/render';
import { RenderContent } from '@/lib/mdx/render-content';
import { fetchProjectCaseStudyBySlug, fetchProjects } from '@/lib/supabase/projects';
import { slugParamSchema } from '@/lib/validation/params';
import type { AppPageProps } from '@/types/routes';

export const revalidate = 300;

type ProjectPageParams = { slug: string };
type ProjectPageContext = AppPageProps<ProjectPageParams>;

export async function generateStaticParams() {
  const projects = await fetchProjects();
  return projects
    .filter((project) => project.slug && project.hasCaseStudy)
    .map((project) => ({ slug: project.slug as string }));
}

export async function generateMetadata({ params }: ProjectPageContext): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolveSlug(resolvedParams);
  if (!slug) {
    return {
      title: 'Projects',
      description: 'Project case studies.',
    };
  }

  const record = await fetchProjectCaseStudyBySlug(slug);

  if (!record) {
    return {
      title: 'Projects',
      description: 'Project case studies.',
    };
  }

  return {
    title: `${record.project.title} | Projects`,
    description: record.project.blurb || `View ${record.project.title} case study on EVA Terminal`,
  };
}

export default async function ProjectCaseStudyPage({ params }: ProjectPageContext) {
  const resolvedParams = await params;
  const slug = resolveSlug(resolvedParams);
  if (!slug) {
    notFound();
  }

  const record = await fetchProjectCaseStudyBySlug(slug);

  if (!record) {
    notFound();
  }

  const Content = await getMdxContent(record.bodyMdx);

  return (
    <article className="writing-article articles-reader">
      <header className="writing-article__hero">
        <p className="writing-article__eyebrow">Projects</p>
        <h1>{record.project.title}</h1>
        {record.project.blurb ? (
          <p className="writing-article__subtitle">{record.project.blurb}</p>
        ) : null}
        {record.project.tags.length ? (
          <p className="projects-reader__tags">
            {record.project.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </p>
        ) : null}
      </header>

      <div className="writing-article__content projects-reader__mdx">
        <RenderContent Content={Content} />
      </div>
    </article>
  );
}

function resolveSlug(params: ProjectPageParams) {
  const parsed = slugParamSchema.safeParse(params);
  return parsed.success ? parsed.data.slug : null;
}
