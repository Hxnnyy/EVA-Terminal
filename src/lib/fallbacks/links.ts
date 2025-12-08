import type { LinkRecord } from '@/lib/supabase/links';

export const LINKS_FALLBACK: LinkRecord[] = [
  {
    id: 'fallback-github',
    category: 'social',
    label: 'GitHub',
    url: 'https://github.com/',
    order: 1,
  },
  {
    id: 'fallback-linkedin',
    category: 'social',
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/in/',
    order: 2,
  },
  {
    id: 'fallback-writing',
    category: 'site',
    label: 'Latest Writing',
    url: 'https://medium.com/',
    order: 3,
  },
  {
    id: 'fallback-portfolio',
    category: 'site',
    label: 'Portfolio',
    url: 'https://magi.studio',
    order: 4,
  },
];
