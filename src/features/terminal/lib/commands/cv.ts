import type { TerminalLineKind } from '@/lib/terminal/use-typewriter';

export type CvMetadata = {
  downloadUrl: string;
  fileName: string;
  lastUpdated: string | null;
  fileSizeBytes: number | null;
  checksum: string | null;
};

type Line = {
  text: string;
  kind?: TerminalLineKind;
  instant?: boolean;
};

const formatField = (label: string, value: string) => `${label.toUpperCase()}: ${value}`;

const formatDate = (value: string | null) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
};

export const buildCvInitializingLines = (): Line[] => [
  {
    text: 'Routing request to MAGI archive...',
    kind: 'system',
  },
  {
    text: 'Stand by while the dossier channel establishes a secure link.',
    kind: 'muted',
  },
];

const DOCUMENT_HEADING = 'DOCUMENT REQUESTED';

export const buildCvSuccessLines = (meta: CvMetadata): Line[] => [
  { text: DOCUMENT_HEADING, kind: 'system', instant: true },
  { text: formatField('File', meta.fileName), kind: 'output', instant: true },
  {
    text: formatField('Updated', formatDate(meta.lastUpdated) ?? 'Pending'),
    kind: 'muted',
    instant: true,
  },
];

export const buildCvErrorLines = (message: string): Line[] => [
  {
    text: 'CV archive is offline - unable to retrieve download coordinates.',
    kind: 'error',
  },
  {
    text: message,
    kind: 'muted',
  },
  {
    text: 'Check Supabase storage or configure CV metadata, then retry option 2.',
    kind: 'muted',
  },
];
