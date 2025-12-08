import { z } from 'zod';

export const slugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required.')
    .regex(/^[a-z0-9-]+$/i, 'Slug must contain letters, numbers, or hyphens only.'),
});

export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'ID must be a valid UUID.' }),
});
