import { NextResponse } from 'next/server';

import { ensureBucket } from '@/features/admin/server/storage';
import { requireAdminUser } from '@/lib/auth/admin';
import { AdminProjectUploadSchema } from '@/lib/schemas';
import { createRevalidateHelpers } from '@/lib/supabase/revalidate';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/service-role-client';

type UploadContext = {
  bucket?: string;
  projectId?: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { revalidatePath, revalidateTag } = createRevalidateHelpers(supabase);
    const adminGuard = await requireAdminUser(supabase);
    if (!adminGuard.ok) {
      return NextResponse.json(
        { error: adminGuard.message },
        { status: adminGuard.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const projectId = formData.get('projectId');
    const bucket = (formData.get('bucket') as string | null) ?? 'project-mdx';

    if (!(file instanceof File) || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: 'Missing file or projectId.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const payloadValidation = AdminProjectUploadSchema.safeParse({
      projectId,
      bucket,
    });
    if (!payloadValidation.success) {
      return NextResponse.json(
        { error: 'Invalid upload payload.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const validatedBucket = payloadValidation.data.bucket || 'project-mdx';

    const ensureResult = await ensureBucket(validatedBucket);
    if (!ensureResult.ok) {
      return NextResponse.json(
        { error: ensureResult.message ?? 'Project MDX bucket unavailable.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const path = `${projectId}/case-study.mdx`;
    const storageClient = getSupabaseServiceRoleClient();
    const { error: uploadError } = await storageClient.storage
      .from(validatedBucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'text/markdown',
      });

    if (uploadError) {
      throw uploadError;
    }

    revalidatePath('/api/projects');
    revalidateTag('projects');
    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to upload case-study file.',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { revalidatePath, revalidateTag } = createRevalidateHelpers(supabase);
    const adminGuard = await requireAdminUser(supabase);
    if (!adminGuard.ok) {
      return NextResponse.json(
        { error: adminGuard.message },
        { status: adminGuard.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const { bucket = 'project-mdx', projectId }: UploadContext = await request.json();
    const payloadValidation = AdminProjectUploadSchema.safeParse({ projectId, bucket });
    if (!payloadValidation.success) {
      return NextResponse.json(
        { error: 'Invalid delete payload.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    const validatedBucket = payloadValidation.data.bucket || 'project-mdx';
    const validatedProjectId = payloadValidation.data.projectId;
    if (!validatedProjectId) {
      return NextResponse.json(
        { error: 'Missing projectId.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const path = `${validatedProjectId}/case-study.mdx`;
    const storageClient = getSupabaseServiceRoleClient();
    const { error: removeError } = await storageClient.storage.from(validatedBucket).remove([path]);
    if (removeError) {
      throw removeError;
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update({ slug: null })
      .eq('id', validatedProjectId);
    if (updateError) {
      throw updateError;
    }

    revalidatePath('/api/projects');
    revalidateTag('projects');
    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to remove case-study file.',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
