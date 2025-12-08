import { z } from 'zod';

export const WritingMetaSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  subtitle: z.string().optional(),
  publishedAt: z.string().datetime().optional().nullable(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type WritingMeta = z.infer<typeof WritingMetaSchema>;
