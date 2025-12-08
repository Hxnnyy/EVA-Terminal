import { z } from 'zod';

export const ContactSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  discord: z.string().optional(),
});

export const BioSchema = z.object({
  rawBody: z.string(),
});

export const CurrentlySchema = z.object({
  sections: z
    .array(
      z.object({
        title: z.string(),
        items: z.array(z.string()),
      }),
    )
    .min(0),
  warnings: z.array(z.string()),
  updatedAt: z.string().nullable(),
  rawBody: z.string().nullable(),
});

const LinkSchema = z.object({
  id: z.string(),
  category: z.union([z.literal('social'), z.literal('site'), z.literal('other')]),
  label: z.string(),
  url: z.string(),
  order: z.number().optional(),
});

export const LinksResponseSchema = z.object({
  links: z.array(LinkSchema),
  meta: z.object({ source: z.union([z.literal('supabase'), z.literal('fallback')]) }).optional(),
});
export type LinksResponse = z.infer<typeof LinksResponseSchema>;

const ProjectSummarySchema = z.object({
  id: z.string(),
  slug: z.string().nullable(),
  title: z.string(),
  blurb: z.string(),
  tags: z.array(z.string()),
  actions: z.array(
    z.object({
      kind: z.union([z.literal('internal'), z.literal('external')]),
      href: z.string(),
      label: z.string(),
    }),
  ),
  hasCaseStudy: z.boolean().optional(),
  updatedAt: z.string().optional().nullable(),
});

export const ProjectsResponseSchema = z.object({
  projects: z.array(ProjectSummarySchema),
});

const WritingSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string(),
  publishedAt: z.string().optional(),
});

export const WritingListResponseSchema = z.object({
  articles: z.array(WritingSummarySchema),
  meta: z.object({ source: z.union([z.literal('supabase'), z.literal('fallback')]) }),
});
export type WritingListResponse = z.infer<typeof WritingListResponseSchema>;

export const WritingDetailSchema = z.object({
  article: z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    subtitle: z.string(),
    publishedAt: z.string().nullable().optional(),
    bodyMdx: z.string(),
    plainBody: z.array(z.string()),
  }),
  meta: z.object({ source: z.union([z.literal('supabase'), z.literal('fallback')]) }),
});

const ReelItemSchema = z.object({
  id: z.string(),
  url: z.string(),
  order: z.number(),
  caption: z.string().nullable().optional(),
});

export const ReelResponseSchema = z.object({
  images: z.array(ReelItemSchema),
  meta: z.object({ source: z.union([z.literal('supabase'), z.literal('fallback')]) }).optional(),
});

export const AdminLinkSchema = z.object({
  category: z.union([z.literal('social'), z.literal('site'), z.literal('other')]),
  label: z.string().min(1, { message: 'Label is required.' }),
  url: z.string().url(),
  order: z.number().optional(),
});

export const AdminReelSchema = z.object({
  url: z.string().url(),
  caption: z.string().optional(),
  order: z.number().optional(),
});

export const AdminProjectSchema = z.object({
  title: z.string().min(1, { message: 'Title is required.' }),
  blurb: z.string().optional(),
  url: z.string().url().optional(),
  slug: z.string().min(1, { message: 'Slug cannot be empty.' }).optional(),
  order: z.number().optional(),
  tags: z.array(z.string().min(1)).optional(),
});

export const AdminArticleSchema = z.object({
  slug: z.string().trim().min(1, { message: 'Slug is required.' }),
  title: z.string().trim().min(1, { message: 'Title is required.' }),
  subtitle: z.string().nullable().optional(),
  body: z.string().trim().min(1, { message: 'Body is required.' }),
  status: z.union([z.literal('draft'), z.literal('published')]),
});

export const AdminInvestmentSchema = z.object({
  ticker: z.string().min(1),
  label: z.string().nullable().optional(),
  provider: z.union([z.literal('stooq'), z.literal('alphavantage')]).optional(),
  provider_symbol: z.string().nullable().optional(),
  order: z.number().nullable().optional(),
});

export const AdminReelUpdateSchema = z.object({
  caption: z.string().nullable().optional(),
  order: z.number().int().nonnegative().optional(),
});

export const AdminCvSchema = z.object({
  downloadUrl: z.string().url(),
  fileName: z.string(),
  fileSizeBytes: z.number().nonnegative(),
  lastUpdated: z.string(),
  checksum: z.string().nullable().optional(),
});

export const AdminProjectUploadSchema = z.object({
  bucket: z.string().default('project-mdx'),
  projectId: z.string(),
});

export const AdminSingletonSchema = z.object({
  key: z.string().min(1),
  body_mdx: z.string().nullable().optional(),
  meta: z.unknown().nullable().optional(),
});

const InvestmentRecordSchema = z.object({
  id: z.string(),
  ticker: z.string(),
  label: z.string().nullable(),
  order: z.number(),
  provider: z.union([z.literal('stooq'), z.literal('alphavantage')]),
  providerSymbol: z.string().nullable(),
  perf6mPercent: z.number().nullable(),
  perfLastFetched: z.string().nullable(),
});

export const InvestmentResponseSchema = z.object({
  investments: z
    .array(
      InvestmentRecordSchema.extend({
        source: z.union([
          z.literal('cache'),
          z.literal('stooq'),
          z.literal('alphavantage'),
          z.literal('missing'),
        ]),
      }),
    )
    .min(0),
});

export type ContactResponse = z.infer<typeof ContactSchema>;
export type InvestmentResponse = z.infer<typeof InvestmentResponseSchema>;
