export type ProjectActionLink = {
  kind: 'internal' | 'external';
  href: string;
  label: string;
};

export type Project = {
  id: string;
  slug: string | null;
  title: string;
  blurb: string | null;
  tags: string[];
  actions: ProjectActionLink[];
  hasCaseStudy?: boolean;
  updatedAt?: string | null;
};

export type Article = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  publishedAt: string | null;
  bodyMdx?: string;
};
