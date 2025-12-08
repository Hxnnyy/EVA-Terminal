import 'server-only';

import {
  getSupabaseServiceRoleClient,
  SupabaseServiceRoleError,
} from '@/lib/supabase/service-role-client';
import type { StorageBucketStatus } from '@/lib/types/storage';

type EnsureBucketOptions = {
  public?: boolean;
  retries?: number;
  delayMs?: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function attemptEnsureBucket(name: string, isPublic: boolean): Promise<StorageBucketStatus> {
  try {
    const client = getSupabaseServiceRoleClient();
    const { data: buckets, error } = await client.storage.listBuckets();
    if (error) {
      return { name, ok: false, created: false, message: error.message };
    }

    const exists = (buckets ?? []).some((bucket) => bucket.name === name);
    if (exists) {
      return { name, ok: true, created: false };
    }

    const { error: createError } = await client.storage.createBucket(name, {
      public: isPublic,
    });
    if (createError) {
      return { name, ok: false, created: false, message: createError.message };
    }

    return { name, ok: true, created: true };
  } catch (error) {
    if (error instanceof SupabaseServiceRoleError) {
      return { name, ok: false, created: false, message: error.message };
    }
    return {
      name,
      ok: false,
      created: false,
      message: error instanceof Error ? error.message : 'Unknown storage error.',
    };
  }
}

/**
 * Ensures a storage bucket exists, retrying transient failures and surfacing structured errors.
 */
export async function ensureBucket(
  name: string,
  options: EnsureBucketOptions = {},
): Promise<StorageBucketStatus> {
  if (!name) {
    return { name, ok: false, created: false, message: 'Bucket name is required.' };
  }

  const retries = Math.max(0, options.retries ?? 1);
  const delayMs = options.delayMs ?? 200;
  const isPublic = options.public ?? true;

  let attempt = 0;
  let result = await attemptEnsureBucket(name, isPublic);
  while (!result.ok && attempt < retries) {
    attempt += 1;
    await sleep(delayMs);
    result = await attemptEnsureBucket(name, isPublic);
  }

  return result;
}
