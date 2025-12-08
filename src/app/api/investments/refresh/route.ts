import { NextResponse } from 'next/server';

import { attachRequestIdHeader, resolveRequestId } from '@/lib/logger';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function POST(request: Request) {
  const requestId = resolveRequestId(request);
  const respond = <T>(body: T, init?: ResponseInit) =>
    attachRequestIdHeader(NextResponse.json<T>(body, init), requestId);

  // The refresh endpoint is now admin-only at /api/admin/investments/refresh.
  // Keep this handler to return a safe response without performing writes.
  return respond(
    {
      error: 'Investments refresh is now restricted. Use /api/admin/investments/refresh instead.',
      requestId,
    },
    { status: 410, headers: NO_STORE_HEADERS },
  );
}
