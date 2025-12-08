import type { SupabaseClient } from '@supabase/supabase-js';
import {
  revalidatePath as nextRevalidatePath,
  revalidateTag as nextRevalidateTag,
} from 'next/cache';

import type { Database } from '@/lib/supabase/database.types';
import { isFixtureClient } from '@/lib/supabase/server-client';

type RevalidatePathFn = typeof nextRevalidatePath;
type RevalidateTagFn = (tag: string) => ReturnType<typeof nextRevalidateTag>;

type Overrides = {
  revalidatePath?: RevalidatePathFn;
  revalidateTag?: RevalidateTagFn;
};

export function createRevalidateHelpers(
  supabase: SupabaseClient<Database>,
  overrides: Overrides = {},
) {
  const enabled = !isFixtureClient(supabase);

  const revalidatePath: RevalidatePathFn = (...args) => {
    if (!enabled) return;
    if (overrides.revalidatePath) {
      return overrides.revalidatePath(...args);
    }
    return nextRevalidatePath(...args);
  };

  // Next.js 16 requires a second 'profile' argument for revalidateTag.
  // We use 'max' to enable background revalidation (stale-while-revalidate).
  const revalidateTag: RevalidateTagFn = (tag) => {
    if (!enabled) return;
    if (overrides.revalidateTag) {
      return overrides.revalidateTag(tag);
    }
    return nextRevalidateTag(tag, 'max');
  };

  return { revalidatePath, revalidateTag };
}
