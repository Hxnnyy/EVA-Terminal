import type { CommandResponseLineSegment } from '@/features/terminal/lib/command-registry';
import type { ProjectSummary } from '@/lib/supabase/projects';
import type { TerminalLineKind } from '@/lib/terminal/use-typewriter';

type Line = {
  text: string;
  kind?: TerminalLineKind;
  segments?: CommandResponseLineSegment[];
};

export const buildProjectsInitializingLines = (): Line[] => [
  { text: 'RETRIEVING SELECTED PROJECTS...', kind: 'system' },
];

export const buildProjectsErrorLines = (message: string): Line[] => [
  { text: 'Project archive responded with an error signal.', kind: 'error' },
  { text: message, kind: 'muted' },
];

const buildProjectsEmptyLines = (): Line[] => [
  {
    text: 'No projects are available yet. Populate them via /admin.',
    kind: 'muted',
  },
];

export const buildProjectsSuccessLines = (projects: ProjectSummary[]): Line[] => {
  if (!projects.length) {
    return buildProjectsEmptyLines();
  }

  const lines: Line[] = [];

  projects.forEach((project, index) => {
    lines.push({
      text: `${(index + 1).toString().padStart(2, '0')}. ${project.title}`,
      kind: 'output',
    });

    const blurb = project.blurb?.trim();
    lines.push({
      text: blurb || 'Status: Narrative upload pending.',
      kind: 'muted',
    });

    lines.push({ text: 'Tags:', kind: 'accent' as TerminalLineKind });
    lines.push({
      text: project.tags.length ? project.tags.join(' · ') : 'Not provided.',
      kind: project.tags.length ? 'output' : 'muted',
    });

    const actions = project.actions ?? [];
    lines.push({ text: 'Link:', kind: 'accent' as TerminalLineKind });
    const externalLinks = actions.filter((action) => action.kind === 'external');
    if (externalLinks.length) {
      externalLinks.forEach((action) => {
        lines.push({
          text: action.href,
          segments: [{ text: action.href, href: action.href }],
          kind: 'output',
        });
      });
    } else {
      lines.push({
        text: 'Not provided.',
        kind: 'muted',
      });
    }

    // Case-study link only when slug + case-study flag are present
    const hasCaseStudy = (project as ProjectSummary & { hasCaseStudy?: boolean }).hasCaseStudy;
    if (hasCaseStudy && project.slug) {
      const caseStudyHref = `/projects/${project.slug}`;
      lines.push({ text: 'Case Study:', kind: 'accent' as TerminalLineKind });
      lines.push({
        text: caseStudyHref,
        segments: [{ text: caseStudyHref, href: caseStudyHref }],
        kind: 'output',
      });
    }

    if (index < projects.length - 1) {
      lines.push({ text: '-----', kind: 'system' });
    }
  });

  return lines;
};
