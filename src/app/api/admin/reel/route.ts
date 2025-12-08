import { NextResponse } from 'next/server';

import { ensureBucket } from '@/features/admin/server/storage';
import { requireAdminUser } from '@/lib/auth/admin';
import { serverEnv } from '@/lib/env.server';
import { validateJsonBody } from '@/lib/http/validation';
import { AdminReelSchema } from '@/lib/schemas';
import { createRevalidateHelpers } from '@/lib/supabase/revalidate';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/service-role-client';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    const supabase = await createSupabaseServerClient();
    const { revalidatePath, revalidateTag } = createRevalidateHelpers(supabase);
    const adminGuard = await requireAdminUser(supabase);
    if (!adminGuard.ok) {
      return NextResponse.json(
        { error: adminGuard.message },
        { status: adminGuard.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // Support multipart uploads from the admin UI (preferred path).
    if (contentType.toLowerCase().includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      const captionRaw = formData.get('caption');
      const orderRaw = formData.get('order');
      const caption =
        typeof captionRaw === 'string' && captionRaw.trim().length ? captionRaw.trim() : null;
      const order =
        typeof orderRaw === 'string' && Number.isFinite(Number.parseInt(orderRaw, 10))
          ? Number.parseInt(orderRaw, 10)
          : 0;

      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: 'Image file is required.' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        );
      }

      const bucket = serverEnv.NEXT_PUBLIC_SUPABASE_REEL_BUCKET || 'reel';
      const bucketStatus = await ensureBucket(bucket, { public: true, retries: 2, delayMs: 250 });
      if (!bucketStatus.ok) {
        return NextResponse.json(
          { error: bucketStatus.message ?? 'Reel bucket unavailable.' },
          { status: 503, headers: { 'Cache-Control': 'no-store' } },
        );
      }

      const path = `${crypto.randomUUID()}-${file.name}`;
      const storageClient = getSupabaseServiceRoleClient();
      const { error: uploadError } = await storageClient.storage.from(bucket).upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });
      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = storageClient.storage.from(bucket).getPublicUrl(path);
      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) {
        throw new Error('Failed to resolve public URL for reel image.');
      }

      const { data, error: insertError } = await storageClient
        .from('reel_images')
        .insert({
          url: publicUrl,
          caption,
          order,
        })
        .select('*')
        .single();

      if (insertError) {
        throw insertError;
      }

      revalidatePath('/api/reel');
      revalidateTag('reel');
      return NextResponse.json(
        { image: data },
        { status: 201, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // Fallback: JSON payload support (kept for compatibility).
    const validation = await validateJsonBody(request, AdminReelSchema, {
      badRequestMessage: 'Invalid reel payload.',
    });
    if (!validation.ok) return validation.response;

    const parsed = validation.data;

    const { data, error } = await supabase
      .from('reel_images')
      .insert({
        url: parsed.url,
        caption: parsed.caption ?? null,
        order: parsed.order ?? 0,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    revalidatePath('/api/reel');
    revalidateTag('reel');
    return NextResponse.json(
      { image: data },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create reel image.',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
