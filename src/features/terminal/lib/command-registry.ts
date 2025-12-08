import { CURRENTLY_FALLBACK_BODY, CURRENTLY_FALLBACK_SECTIONS } from '@/lib/fallbacks/currently';
import { REEL_FALLBACK } from '@/lib/fallbacks/reel';
import {
  ContactSchema,
  InvestmentResponseSchema,
  LinksResponseSchema,
  ProjectsResponseSchema,
  ReelResponseSchema,
  WritingListResponseSchema,
} from '@/lib/schemas';
import type { LinkRecord } from '@/lib/supabase/links';
import type { ProjectSummary } from '@/lib/supabase/projects';
import { buildBioLines } from '@/lib/terminal/commands/bio';
import type { BioSnapshot } from '@/lib/terminal/commands/bio.types';
import { buildContactErrorLines, buildContactLines } from '@/lib/terminal/commands/contact';
import {
  buildCurrentlyErrorLines,
  buildCurrentlyInitializingLines,
  buildCurrentlyLines,
} from '@/lib/terminal/commands/currently';
import type { CurrentlySnapshot } from '@/lib/terminal/commands/currently.server';
import {
  buildCvErrorLines,
  buildCvInitializingLines,
  buildCvSuccessLines,
  type CvMetadata,
} from '@/lib/terminal/commands/cv';
import { buildInvestmentsLines, type InvestmentEntry } from '@/lib/terminal/commands/investments';
import {
  buildLinksErrorLines,
  buildLinksInitializingLines,
  buildLinksSuccessLines,
} from '@/lib/terminal/commands/links';
import {
  buildProjectsErrorLines,
  buildProjectsInitializingLines,
  buildProjectsSuccessLines,
} from '@/lib/terminal/commands/projects';
import { buildReelErrorLines, type ReelItem } from '@/lib/terminal/commands/reel';
import { buildWritingListLines, type WritingSummary } from '@/lib/terminal/commands/writing';
import type { TerminalLineKind } from '@/lib/terminal/use-typewriter';

export type CommandResponseLineSegment = {
  text: string;
  kind?: TerminalLineKind;
  href?: string;
};

export type CommandResponse = {
  lines: {
    text: string;
    kind?: TerminalLineKind;
    instant?: boolean;
    segments?: CommandResponseLineSegment[];
  }[];
  sideEffect?: () => void;
};

export type TerminalCommandRegistry = Record<number, () => Promise<void> | void>;

type ReelViewerHandle = {
  open: (items: ReelItem[]) => void;
};

type CommandDependencies = {
  appendResponse: (response: CommandResponse) => void;
  setLastInteraction: (value: string) => void;
  reelViewer: ReelViewerHandle;
  fetchImpl?: typeof fetch;
  flushTyping?: () => void;
};

export const createTerminalCommandRegistry = (
  deps: CommandDependencies,
): TerminalCommandRegistry => {
  const fetcher = deps.fetchImpl ?? fetch;
  return {
    1: createBioHandler(deps, fetcher),
    2: createCvHandler(deps, fetcher),
    3: createLinksHandler(deps, fetcher),
    4: createProjectsHandler(deps, fetcher),
    5: createWritingHandler(deps, fetcher),
    6: createInvestmentsHandler(deps, fetcher),
    7: createCurrentlyHandler(deps, fetcher),
    8: createContactHandler(deps, fetcher),
    9: createReelHandler(deps, fetcher),
    10: createRepoHandler(deps),
  };
};

const createBioHandler = (deps: CommandDependencies, fetcher: typeof fetch) => async () => {
  deps.setLastInteraction('Bio dossier loading');
  try {
    const response = await fetcher('/api/bio');
    if (!response.ok) {
      const errorMessage = await extractApiError(response, 'Bio service');
      deps.appendResponse({
        lines: buildBioLines(null, { errorMessage }),
      });
      deps.setLastInteraction('Bio dossier failed');
      return;
    }

    const payload = (await response.json()) as BioSnapshot;
    deps.appendResponse({
      lines: buildBioLines(payload),
    });
    deps.setLastInteraction('Bio dossier rendered');
  } catch (error) {
    deps.appendResponse({
      lines: buildBioLines(null, {
        errorMessage:
          error instanceof Error ? error.message : 'Unexpected client error reaching bio endpoint.',
      }),
    });
    deps.setLastInteraction('Bio dossier failed');
  }
};

const createLinksHandler = (deps: CommandDependencies, fetcher: typeof fetch) => async () => {
  deps.appendResponse({
    lines: buildLinksInitializingLines(),
  });
  deps.setLastInteraction('Links retrieval in progress');

  try {
    const response = await fetcher('/api/links');
    if (!response.ok) {
      const errorMessage = await extractApiError(response, 'Links service');
      deps.appendResponse({
        lines: buildLinksErrorLines(errorMessage),
      });
      deps.setLastInteraction('Links retrieval failed');
      return;
    }

    const payload = await response.json();
    const parsed = LinksResponseSchema.safeParse(payload);
    if (!parsed.success) {
      deps.appendResponse({
        lines: buildLinksErrorLines(
          'Links payload was invalid. Verify the API response shape and retry.',
        ),
      });
      deps.setLastInteraction('Links retrieval failed');
      return;
    }

    const links: LinkRecord[] = parsed.data.links.map((link) => ({
      ...link,
      order: link.order ?? 0,
    }));

    const isFallback = parsed.data.meta?.source === 'fallback';
    const lines = buildLinksSuccessLines(links);
    if (isFallback) {
      lines.push({
        text: 'Links are using fallback data while Supabase is offline.',
        kind: 'muted',
      });
    }

    deps.appendResponse({
      lines,
    });
    deps.setLastInteraction(
      links.length
        ? `Rendered ${links.length.toString()} link${links.length === 1 ? '' : 's'}${
            isFallback ? ' (fallback)' : ''
          }`
        : 'Link matrix empty',
    );
  } catch (error) {
    deps.appendResponse({
      lines: buildLinksErrorLines(
        error instanceof Error ? error.message : 'Unexpected client error reaching links endpoint.',
      ),
    });
    deps.setLastInteraction('Links retrieval failed');
  }
};

const createCurrentlyHandler = (deps: CommandDependencies, fetcher: typeof fetch) => async () => {
  deps.appendResponse({
    lines: buildCurrentlyInitializingLines(),
  });
  deps.setLastInteraction('Currently sync in progress');

  try {
    const response = await fetcher('/api/currently');
    if (!response.ok) {
      const errorMessage = await extractApiError(response, 'Currently service');
      deps.appendResponse({
        lines: buildCurrentlyErrorLines(errorMessage),
      });
      deps.setLastInteraction('Currently sync failed');
      return;
    }

    const payload = (await response.json()) as CurrentlySnapshot;
    const shouldUseFallback = payload.sections.length === 0;
    const snapshot = shouldUseFallback ? buildClientFallbackCurrentlySnapshot(payload) : payload;

    deps.appendResponse({
      lines: buildCurrentlyLines(snapshot),
    });
    deps.setLastInteraction(
      shouldUseFallback ? 'Currently panel rendered (fallback)' : 'Currently panel rendered',
    );
  } catch (error) {
    deps.appendResponse({
      lines: buildCurrentlyErrorLines(
        error instanceof Error
          ? error.message
          : 'Unexpected client error reaching currently endpoint.',
      ),
    });
    deps.setLastInteraction('Currently sync failed');
  }
};

const createInvestmentsHandler = (deps: CommandDependencies, fetcher: typeof fetch) => async () => {
  deps.setLastInteraction('Investments retrieval in progress');

  try {
    const response = await fetcher('/api/investments');
    if (!response.ok) {
      deps.appendResponse({
        lines: [
          { text: 'Investments module returned an error.', kind: 'error' },
          { text: await response.text(), kind: 'muted' },
        ],
      });
      deps.setLastInteraction('Investments retrieval failed');
      return;
    }

    const payload = await response.json();
    const parsed = InvestmentResponseSchema.safeParse(payload);
    if (!parsed.success) {
      deps.appendResponse({
        lines: [
          {
            text: 'Investments payload invalid. Seed data via /admin.',
            kind: 'error',
          },
        ],
      });
      deps.setLastInteraction('Investments retrieval failed');
      return;
    }

    const investments: InvestmentEntry[] = parsed.data.investments.map((entry) => ({
      ticker: entry.ticker,
      label: entry.label ?? null,
      perf6mPercent: entry.perf6mPercent ?? null,
      perfLastFetched: entry.perfLastFetched ?? null,
      source: entry.source,
    }));

    deps.appendResponse({
      lines: buildInvestmentsLines(investments),
    });
    deps.setLastInteraction(
      investments.length
        ? `Loaded ${investments.length.toString()} investment${investments.length === 1 ? '' : 's'}`
        : 'Investments list empty',
    );
  } catch (error) {
    deps.appendResponse({
      lines: [
        { text: 'Investments request failed.', kind: 'error' },
        {
          text:
            error instanceof Error
              ? error.message
              : 'Unexpected client error reaching investments endpoint.',
          kind: 'muted',
        },
      ],
    });
    deps.setLastInteraction('Investments retrieval failed');
  }
};

const createCvHandler = (deps: CommandDependencies, fetcher: typeof fetch) => async () => {
  deps.appendResponse({
    lines: buildCvInitializingLines(),
  });
  deps.setLastInteraction('CV retrieval in progress');

  try {
    const response = await fetcher('/api/cv');
    if (!response.ok) {
      const errorMessage = await extractApiError(response, 'CV service');
      deps.appendResponse({
        lines: buildCvErrorLines(errorMessage),
      });
      deps.setLastInteraction('CV retrieval failed');
      return;
    }

    const payload = (await response.json()) as CvMetadata;
    if (!payload.downloadUrl) {
      deps.appendResponse({
        lines: buildCvErrorLines(
          'CV metadata did not include a download URL. Configure the admin singleton and retry.',
        ),
      });
      deps.setLastInteraction('CV retrieval failed');
      return;
    }

    deps.flushTyping?.();
    deps.appendResponse({
      lines: buildCvSuccessLines(payload),
      sideEffect: () => {
        if (typeof window !== 'undefined') {
          window.open(payload.downloadUrl, '_blank', 'noopener,noreferrer');
        }
      },
    });
    deps.setLastInteraction('CV download ready');
  } catch (error) {
    deps.appendResponse({
      lines: buildCvErrorLines(
        error instanceof Error ? error.message : 'Unexpected client error reaching CV endpoint.',
      ),
    });
    deps.setLastInteraction('CV retrieval failed');
  }
};

const createProjectsHandler = (deps: CommandDependencies, fetcher: typeof fetch) => async () => {
  deps.appendResponse({
    lines: buildProjectsInitializingLines(),
  });
  deps.setLastInteraction('Projects retrieval in progress');

  try {
    const response = await fetcher('/api/projects');
    if (!response.ok) {
      const errorMessage = await extractApiError(response, 'Projects service');
      deps.appendResponse({
        lines: buildProjectsErrorLines(errorMessage),
      });
      deps.setLastInteraction('Projects retrieval failed');
      return;
    }

    const payload = await response.json();
    const parsed = ProjectsResponseSchema.safeParse(payload);
    if (!parsed.success) {
      deps.appendResponse({
        lines: buildProjectsErrorLines(
          'Projects payload was invalid. Verify the API response shape and retry.',
        ),
      });
      deps.setLastInteraction('Projects retrieval failed');
      return;
    }

    const projects = parsed.data.projects as ProjectSummary[];

    deps.appendResponse({
      lines: buildProjectsSuccessLines(projects),
    });
    deps.setLastInteraction(
      projects.length
        ? `Loaded ${projects.length.toString()} project${projects.length === 1 ? '' : 's'}`
        : 'Projects archive empty',
    );
  } catch (error) {
    deps.appendResponse({
      lines: buildProjectsErrorLines(
        error instanceof Error
          ? error.message
          : 'Unexpected client error reaching projects endpoint.',
      ),
    });
    deps.setLastInteraction('Projects retrieval failed');
  }
};

const createContactHandler = (deps: CommandDependencies, fetcher: typeof fetch) => async () => {
  deps.setLastInteraction('Contact info loading');

  try {
    const response = await fetcher('/api/contact');
    if (!response.ok) {
      deps.appendResponse({
        lines: buildContactErrorLines(`Contact endpoint responded with ${response.status}`),
      });
      deps.setLastInteraction('Contact info failed');
      return;
    }

    const payload = await response.json();
    const parsed = ContactSchema.safeParse(payload);
    if (!parsed.success) {
      deps.appendResponse({
        lines: buildContactErrorLines('Contact payload invalid. Configure via /admin.'),
      });
      deps.setLastInteraction('Contact info failed');
      return;
    }

    const info = parsed.data;

    deps.appendResponse({
      lines: buildContactLines(info),
      sideEffect: () => {
        void navigator.clipboard?.writeText(info.email).catch(() => undefined);
      },
    });
    deps.setLastInteraction('Contact info rendered');
  } catch (error) {
    deps.appendResponse({
      lines: buildContactErrorLines(
        error instanceof Error ? error.message : 'Unexpected error reaching contact endpoint.',
      ),
    });
    deps.setLastInteraction('Contact info failed');
  }
};

const createReelHandler = (deps: CommandDependencies, fetcher: typeof fetch) => async () => {
  deps.setLastInteraction('Reel loading');

  try {
    const response = await fetcher('/api/reel');
    if (!response.ok) {
      deps.appendResponse({
        lines: buildReelErrorLines(`Reel endpoint responded with ${response.status}`),
      });
      deps.setLastInteraction('Reel failed');
      return;
    }

    const payload = await response.json();
    const parsed = ReelResponseSchema.safeParse(payload);
    if (!parsed.success) {
      deps.appendResponse({
        lines: buildReelErrorLines('Reel payload invalid. Upload images via /admin.'),
      });
      deps.setLastInteraction('Reel failed');
      return;
    }

    const images: ReelItem[] = parsed.data.images.map((image) => ({
      id: image.id,
      url: image.url,
      caption: image.caption ?? null,
      order: image.order,
    }));

    const fallbackUsed = images.length === 0;
    const resolvedImages = fallbackUsed ? cloneFallbackReelItems() : images;

    deps.appendResponse({
      lines: [
        { text: 'RETRIEVING VISUAL MODULE...', kind: 'system' },
        {
          text: 'Click to open Reel Viewer. Use arrow keys or click thumbnails.',
          kind: 'muted',
          segments: [
            {
              text: 'Click to open Reel Viewer. Use arrow keys or click thumbnails.',
              kind: 'muted',
              href: '#reel-open',
            },
          ],
        },
      ],
      sideEffect: () => {
        const handler = (event: MouseEvent) => {
          const anchor = (event.target as HTMLElement | null)?.closest?.('a[href="#reel-open"]');
          if (!anchor) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          void deps.reelViewer.open(resolvedImages);
        };
        document.addEventListener('click', handler);
      },
    });
    deps.setLastInteraction(fallbackUsed ? 'Reel opened (fallback)' : 'Reel opened');
  } catch (error) {
    deps.appendResponse({
      lines: buildReelErrorLines(
        error instanceof Error ? error.message : 'Unexpected error reaching reel endpoint.',
      ),
    });
    deps.setLastInteraction('Reel failed');
  }
};

const createWritingHandler = (deps: CommandDependencies, fetcher: typeof fetch) => async () => {
  deps.setLastInteraction('Writing list loading');

  try {
    const response = await fetcher('/api/writing');
    if (!response.ok) {
      deps.appendResponse({
        lines: [
          {
            text: 'Unable to load writing modules.',
            kind: 'error',
          },
        ],
      });
      deps.setLastInteraction('Writing list failed');
      return;
    }

    const payload = await response.json();
    const parsed = WritingListResponseSchema.safeParse(payload);
    if (!parsed.success) {
      deps.appendResponse({
        lines: [
          {
            text: 'Writing payload was invalid. Retry after refreshing.',
            kind: 'error',
          },
        ],
      });
      deps.setLastInteraction('Writing list failed');
      return;
    }

    const articles: WritingSummary[] = parsed.data.articles.map(
      ({ slug, title, subtitle, publishedAt }) => ({
        slug,
        title,
        subtitle: subtitle ?? null,
        publishedAt: publishedAt ?? null,
      }),
    );

    const isFallback = parsed.data.meta?.source === 'fallback';
    const lines = buildWritingListLines(articles);
    if (isFallback) {
      lines.push({
        text: 'Writing archive is using fallback data until Supabase is back online.',
        kind: 'muted',
      });
    }

    deps.appendResponse({
      lines,
    });
    deps.setLastInteraction(
      articles.length
        ? `Loaded ${articles.length.toString()} article${articles.length === 1 ? '' : 's'}${
            isFallback ? ' (fallback)' : ''
          }`
        : 'Writing archive empty',
    );
  } catch (error) {
    deps.appendResponse({
      lines: [
        {
          text: 'Writing archive request failed.',
          kind: 'error',
        },
        {
          text:
            error instanceof Error
              ? error.message
              : 'Unexpected client error reaching writing endpoint.',
          kind: 'muted',
        },
      ],
    });
    deps.setLastInteraction('Writing list failed');
  }
};

const createRepoHandler = (deps: CommandDependencies) => () => {
  deps.appendResponse({
    lines: [
      { text: 'REPOSITORY LINK :: EVA-TERMINAL', kind: 'system' },
      {
        text: 'https://github.com/Hxnnyy/eva-terminal',
        kind: 'accent',
        segments: [
          {
            text: 'https://github.com/Hxnnyy/eva-terminal',
            kind: 'accent',
            href: 'https://github.com/Hxnnyy/eva-terminal',
          },
        ],
      },
      { text: 'Click above to open in a new tab.', kind: 'muted' },
    ],
  });
  deps.setLastInteraction('Repo link rendered');
};

const cloneFallbackReelItems = (): ReelItem[] =>
  REEL_FALLBACK.map((entry, index) => ({
    id: `fallback-${(index + 1).toString().padStart(2, '0')}`,
    url: entry.url,
    caption: entry.caption,
    order: index,
  }));

const cloneFallbackCurrentlySections = () =>
  CURRENTLY_FALLBACK_SECTIONS.map((section) => ({
    title: section.title,
    items: [...section.items],
  }));

const buildClientFallbackCurrentlySnapshot = (
  snapshot?: Partial<CurrentlySnapshot>,
): CurrentlySnapshot => ({
  sections: cloneFallbackCurrentlySections(),
  warnings: [...(snapshot?.warnings ?? []), 'Currently data unavailable. Rendering fallback copy.'],
  updatedAt: snapshot?.updatedAt ?? null,
  rawBody: snapshot?.rawBody ?? CURRENTLY_FALLBACK_BODY,
});

/**
 * Extracts an error message from an API response.
 * Attempts to parse JSON and find an 'error' property.
 * Falls back to statusText or a generic message.
 */
const extractApiError = async (response: Response, servicePrefix: string): Promise<string> => {
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (payload && typeof payload === 'object' && 'error' in payload) {
      const message = (payload as { error?: unknown }).error;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
  } catch {
    // Ignore JSON parse failure.
  }
  return (
    response.statusText || `${servicePrefix} responded with status ${response.status.toString()}.`
  );
};
