import type { ProjectSummary } from '@/lib/supabase/projects';

type ProjectListEntry = Pick<ProjectSummary, 'id' | 'slug' | 'title' | 'blurb' | 'updatedAt'>;

export type ProjectMonthGroup = {
  id: string;
  label: string;
  month: number;
  year: number;
  entries: ProjectListEntry[];
};

export function groupProjectsByMonth(projects: ProjectListEntry[]): ProjectMonthGroup[] {
  const sorted = [...projects].sort((a, b) => {
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bTime - aTime;
  });

  const groups = new Map<string, ProjectMonthGroup>();

  for (const project of sorted) {
    const date = project.updatedAt ? new Date(project.updatedAt) : new Date();
    const month = date.getMonth();
    const year = date.getFullYear();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;

    if (!groups.has(key)) {
      const formatter = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
      });
      groups.set(key, {
        id: key,
        label: formatter.format(date),
        month,
        year,
        entries: [],
      });
    }

    groups.get(key)?.entries.push(project);
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.year === b.year) {
      return b.month - a.month;
    }
    return b.year - a.year;
  });
}
