import { z } from 'zod';

import { env } from './env';

const isProd = process.env.NODE_ENV === 'production';

const prodDisallowedFlag = (flagName: string) =>
  z
    .string()
    .optional()
    .transform((value) => value === 'true')
    .refine((enabled) => !isProd || !enabled, {
      message: `${flagName} cannot be enabled in production.`,
    });

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE: z.string().min(1).optional(),
  ALPHAVANTAGE_API_KEY: z.string().min(1).optional(),
  ALPHAVANTAGE_ENDPOINT: z.string().url().optional(),
  CRON_SECRET: z.string().min(1).optional(),
  CV_FALLBACK_URL: z.string().url().optional(),
  CV_FALLBACK_FILE_NAME: z.string().optional(),
  CV_FALLBACK_LAST_UPDATED: z.string().optional(),
  CV_FALLBACK_SIZE_BYTES: z.coerce.number().int().nonnegative().optional(),
  CV_FALLBACK_CHECKSUM: z.string().optional(),
  INVESTMENTS_FETCH_ENABLED: z
    .string()
    .optional()
    .transform((value) => value !== 'false'),
  INVESTMENTS_REFRESH_INTERVAL_HOURS: z.coerce.number().int().positive().default(24),
  ADMIN_E2E_FIXTURE: prodDisallowedFlag('ADMIN_E2E_FIXTURE'),
  SUPABASE_DISABLED_FOR_TESTS: prodDisallowedFlag('SUPABASE_DISABLED_FOR_TESTS'),
});

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.flatten().fieldErrors;
  const messages = Object.entries(details)
    .map(([key, value]) => `- ${key}: ${value?.join(', ') ?? 'is invalid or missing.'}`)
    .join('\n');
  throw new Error(`Invalid server environment configuration:\n${messages}`);
}

export const serverEnv = { ...env, ...parsed.data };
export type ServerEnv = typeof serverEnv;
