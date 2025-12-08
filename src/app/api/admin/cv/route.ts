import { createHash } from 'crypto';
import { NextResponse } from 'next/server';

import { requireAdminUser } from '@/lib/auth/admin';
import { serverEnv } from '@/lib/env.server';
import { validateJsonBody } from '@/lib/http/validation';
import { AdminCvSchema } from '@/lib/schemas';
import { createRevalidateHelpers } from '@/lib/supabase/revalidate';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

const noStoreHeaders = { 'Cache-Control': 'no-store' };

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    return handleMultipart(request);
  }
  return handleJson(request);
}

async function handleJson(request: Request) {
  try {
    const validation = await validateJsonBody(request, AdminCvSchema, {
      badRequestMessage: 'Invalid CV payload.',
    });
    if (!validation.ok) return validation.response;

    const parsed = validation.data;
    const supabase = await createSupabaseServerClient();
    const adminGuard = await requireAdminUser(supabase);
    if (!adminGuard.ok) {
      return NextResponse.json(
        { error: adminGuard.message },
        { status: adminGuard.status, headers: noStoreHeaders },
      );
    }

    await upsertCvMeta(supabase, createRevalidateHelpers(supabase), {
      download_url: parsed.downloadUrl,
      file_name: parsed.fileName,
      file_size_bytes: parsed.fileSizeBytes,
      last_updated: parsed.lastUpdated,
      checksum: parsed.checksum ?? null,
    });

    return NextResponse.json({ ok: true }, { status: 200, headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update CV metadata.',
      },
      { status: 500, headers: noStoreHeaders },
    );
  }
}

async function handleMultipart(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const adminGuard = await requireAdminUser(supabase);
    if (!adminGuard.ok) {
      return NextResponse.json(
        { error: adminGuard.message },
        { status: adminGuard.status, headers: noStoreHeaders },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'A CV file is required.' },
        { status: 400, headers: noStoreHeaders },
      );
    }

    const bucket = serverEnv.NEXT_PUBLIC_SUPABASE_CV_BUCKET;
    const existingPath = await getExistingCvPath(supabase, bucket);
    const path = `${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path);

    const buffer = Buffer.from(await file.arrayBuffer());
    const checksum = createHash('sha256').update(buffer).digest('hex');
    const lastUpdated = new Date().toISOString();

    const meta = {
      download_url: publicUrl,
      storage_path: path,
      file_name: file.name,
      file_size_bytes: file.size,
      last_updated: lastUpdated,
      checksum: `sha256:${checksum}`,
    };

    const revalidators = createRevalidateHelpers(supabase);
    await upsertCvMeta(supabase, revalidators, meta);
    if (existingPath) {
      void supabase.storage.from(bucket).remove([existingPath]);
    }

    return NextResponse.json(
      { ok: true, meta },
      {
        status: 200,
        headers: noStoreHeaders,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to upload CV file.',
      },
      { status: 500, headers: noStoreHeaders },
    );
  }
}

async function getExistingCvPath(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  bucket: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('singletons')
      .select('meta')
      .eq('key', 'cv_meta')
      .maybeSingle();
    if (error) {
      return null;
    }
    const meta = data?.meta as Record<string, unknown> | null;
    const explicit = typeof meta?.storage_path === 'string' ? meta.storage_path : null;
    if (explicit) {
      return explicit;
    }
    const downloadUrl = typeof meta?.download_url === 'string' ? meta.download_url : null;
    if (!downloadUrl) {
      return null;
    }
    try {
      const url = new URL(downloadUrl);
      const parts = url.pathname.split('/');
      const bucketIndex = parts.findIndex((part) => part === bucket);
      if (bucketIndex !== -1 && parts.length > bucketIndex + 1) {
        return decodeURIComponent(parts.slice(bucketIndex + 1).join('/'));
      }
    } catch {
      // ignore parse errors
    }
    return null;
  } catch {
    return null;
  }
}

async function upsertCvMeta(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  { revalidatePath, revalidateTag }: ReturnType<typeof createRevalidateHelpers>,
  meta: {
    download_url: string;
    storage_path?: string | null;
    file_name: string;
    file_size_bytes: number;
    last_updated: string;
    checksum: string | null;
  },
) {
  const { error } = await supabase.from('singletons').upsert({
    key: 'cv_meta',
    meta,
  });

  if (error) {
    throw error;
  }

  revalidatePath('/api/cv');
  revalidateTag('cv');
}
