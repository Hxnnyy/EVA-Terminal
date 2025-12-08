type WritingFallbackEntry = {
  slug: string;
  title: string;
  subtitle: string;
  published_at: string;
  body_mdx: string;
};

export const WRITING_FALLBACK: WritingFallbackEntry[] = [
  {
    slug: 'prompt-1-mapping-master-v4-5',
    title: 'Prompt-1 Mapping Master v4.5',
    subtitle: 'Supabase bucket-configured',
    published_at: '2025-11-15T12:00:00Z',
    body_mdx: `---
title: Prompt-1 Mapping Master v4.5
subtitle: Supabase bucket-configured
publishedAt: 2025-11-15T12:00:00Z
tags: [supabase, caching, eva-terminal]
---

## Supabase bucket-configured

This fallback article documents the cached writing pipeline when Supabase is unavailable. Supabase bucket-configured content ensures the terminal always renders a story even if live data cannot be reached.`,
  },
];
