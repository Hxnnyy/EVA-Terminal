import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !serviceRole) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE are required to run the storage health check.',
    );
  }

  const reelBucket = process.env.NEXT_PUBLIC_SUPABASE_REEL_BUCKET || 'reel';
  const cvBucket = process.env.NEXT_PUBLIC_SUPABASE_CV_BUCKET || 'cv';
  const client = createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const buckets = [reelBucket, cvBucket];
  for (const bucket of buckets) {
    const { data: bucketInfo, error: bucketError } = await client.storage.getBucket(bucket);
    if (bucketError || !bucketInfo) {
      console.error(`Bucket ${bucket} missing or inaccessible.`, bucketError?.message ?? '');
      continue;
    }
    const { data: objects, error: listError } = await client.storage.from(bucket).list('', {
      limit: 1,
    });
    if (listError) {
      console.error(`Failed to list ${bucket}:`, listError.message);
      continue;
    }
    console.log(
      `${bucket} bucket OK. ${objects?.length ? 'Sample object present.' : 'No objects yet.'}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
