export const PROJECTS_FALLBACK = [
  {
    id: 'fallback-eva-terminal',
    title: 'EVA Terminal',
    blurb: 'MAGI-inspired CLI portfolio experience.',
    tags: ['nextjs', 'supabase', 'framer-motion'],
    actions: [
      { kind: 'internal', href: '/projects/eva-terminal', label: 'Case Study' },
      { kind: 'external', href: 'https://eva-terminal.dev', label: 'Launch' },
    ],
  },
] as const;
