import { z } from 'zod';

import { createLogger } from './logger';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url({ message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL.' }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, { message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required.' }),
  NEXT_PUBLIC_SITE_URL: z.string().url({ message: 'NEXT_PUBLIC_SITE_URL must be a valid URL.' }),
  NEXT_PUBLIC_SUPABASE_REEL_BUCKET: z.string().default('reel'),
  NEXT_PUBLIC_SUPABASE_CV_BUCKET: z.string().default('cv'),
  NEXT_PUBLIC_SUPABASE_PROJECT_MDX_BUCKET: z.string().default('project-mdx'),
});

const relaxedDefaults = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test-key',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  NEXT_PUBLIC_SUPABASE_REEL_BUCKET: 'reel',
  NEXT_PUBLIC_SUPABASE_CV_BUCKET: 'cv',
  NEXT_PUBLIC_SUPABASE_PROJECT_MDX_BUCKET: 'project-mdx',
};

// Note: NEXT_PUBLIC_* vars must be explicitly referenced so Next.js inlines them
// into the client bundle at build time. Using process.env[key] dynamically won't work.
const rawPublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_REEL_BUCKET: process.env.NEXT_PUBLIC_SUPABASE_REEL_BUCKET,
  NEXT_PUBLIC_SUPABASE_CV_BUCKET: process.env.NEXT_PUBLIC_SUPABASE_CV_BUCKET,
  NEXT_PUBLIC_SUPABASE_PROJECT_MDX_BUCKET: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_MDX_BUCKET,
};

const allowRelaxed =
  process.env.NODE_ENV !== 'production' ||
  process.env.VITEST === 'true' ||
  process.env.SUPPRESS_ENV_VALIDATION_FOR_TESTS === 'true';

let parsed = publicEnvSchema.safeParse({
  ...(allowRelaxed ? relaxedDefaults : {}),
  ...rawPublicEnv,
});

if (!parsed.success) {
  const details = parsed.error.flatten().fieldErrors;
  const messages = Object.entries(details)
    .map(([key, value]) => `- ${key}: ${value?.join(', ') ?? 'is invalid or missing.'}`)
    .join('\n');
  if (!allowRelaxed) {
    throw new Error(`Invalid public environment configuration:\n${messages}`);
  }
  createLogger({ scope: 'env' }).warn(`Using relaxed defaults for public env:\n${messages}`);
  parsed = publicEnvSchema.safeParse(relaxedDefaults);
}

export const env = parsed.success ? parsed.data : relaxedDefaults;
export type PublicEnv = typeof env;
