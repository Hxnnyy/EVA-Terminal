import 'server-only';

import { ensureBucket } from '@/features/admin/server/storage';
import { serverEnv } from '@/lib/env.server';
import { createLogger, type Logger } from '@/lib/logger';
import type { StorageBucketStatus } from '@/lib/types/storage';

type BucketNames = {
  reel: string;
  cv: string;
  projects: string;
};

export type BucketStatusResult = {
  ok: boolean;
  bucketStatuses: StorageBucketStatus[];
  reelBucketStatus: StorageBucketStatus;
  cvBucketStatus: StorageBucketStatus;
  projectBucketStatus: StorageBucketStatus;
  warnings: string[];
};

const defaultBucketNames: BucketNames = {
  reel: serverEnv.NEXT_PUBLIC_SUPABASE_REEL_BUCKET || 'reel',
  cv: serverEnv.NEXT_PUBLIC_SUPABASE_CV_BUCKET || 'cv',
  projects: serverEnv.NEXT_PUBLIC_SUPABASE_PROJECT_MDX_BUCKET || 'project-mdx',
};

const toWarning = (status: StorageBucketStatus) =>
  `${status.name}: ${status.message ?? 'Storage bucket unavailable. Check Supabase storage.'}`;

const BUCKET_STATUS_CACHE_TTL_MS = 5 * 60 * 1000;

type BucketStatusCache = {
  key: string;
  timestamp: number;
  result: BucketStatusResult;
};

let bucketStatusCache: BucketStatusCache | null = null;

const safeEnsureBucket = async (name: string, logger: Logger): Promise<StorageBucketStatus> => {
  try {
    return await ensureBucket(name);
  } catch (error) {
    logger.warn(`Failed to verify storage bucket "${name}"`, error);
    return {
      name,
      ok: false,
      created: false,
      message: error instanceof Error ? error.message : 'Unknown storage error.',
    };
  }
};

export async function ensureStorageBuckets(
  logger: Logger = createLogger({ scope: 'admin:bucket' }),
  bucketNames: BucketNames = defaultBucketNames,
) {
  const [reelBucketStatus, cvBucketStatus, projectBucketStatus] = await Promise.all([
    safeEnsureBucket(bucketNames.reel, logger),
    safeEnsureBucket(bucketNames.cv, logger),
    safeEnsureBucket(bucketNames.projects, logger),
  ]);

  const bucketStatuses = [reelBucketStatus, cvBucketStatus, projectBucketStatus];

  return { bucketStatuses, reelBucketStatus, cvBucketStatus, projectBucketStatus };
}

export async function resolveBucketStatus(
  logger: Logger = createLogger({ scope: 'admin:bucket' }),
  bucketNames: BucketNames = defaultBucketNames,
): Promise<BucketStatusResult> {
  const cacheKey = `${bucketNames.reel}:${bucketNames.cv}:${bucketNames.projects}`;
  const isCacheValid =
    bucketStatusCache && bucketStatusCache.key === cacheKey
      ? Date.now() - bucketStatusCache.timestamp < BUCKET_STATUS_CACHE_TTL_MS
      : false;

  if (isCacheValid && bucketStatusCache) {
    return bucketStatusCache.result;
  }

  const { bucketStatuses, reelBucketStatus, cvBucketStatus } = await ensureStorageBuckets(
    logger,
    bucketNames,
  );

  const warnings = bucketStatuses.filter((status) => !status.ok).map(toWarning);

  const result: BucketStatusResult = {
    ok: warnings.length === 0,
    bucketStatuses,
    reelBucketStatus,
    cvBucketStatus,
    projectBucketStatus: bucketStatuses.find((b) => b.name === bucketNames.projects)!,
    warnings,
  };

  bucketStatusCache = {
    key: cacheKey,
    timestamp: Date.now(),
    result,
  };

  return result;
}

export function clearBucketStatusCache() {
  bucketStatusCache = null;
}
