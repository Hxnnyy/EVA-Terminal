import { NextResponse } from 'next/server';

import { CONTACT_FALLBACK } from '@/lib/fallbacks/contact';
import { attachRequestIdHeader, createLogger, resolveRequestId } from '@/lib/logger';
import { type ContactResponse, ContactSchema } from '@/lib/schemas';
import { fetchContactInfoCached } from '@/lib/supabase/contact';

export const revalidate = 300;

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
};

export async function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const logger = createLogger({ requestId, scope: 'api:contact' });
  const respond = <T>(body: T, init?: ResponseInit) =>
    attachRequestIdHeader(NextResponse.json<T>(body, init), requestId);

  try {
    const record = await fetchContactInfoCached();
    if (!record) {
      return respond<ContactResponse>(CONTACT_FALLBACK, {
        status: 200,
        headers: CACHE_HEADERS,
      });
    }
    const responseBody: ContactResponse = {
      email: record.email,
      ...(record.phone ? { phone: record.phone } : {}),
      ...(record.discord ? { discord: record.discord } : {}),
    };
    const parsed = ContactSchema.safeParse(responseBody);
    if (!parsed.success) {
      logger.warn('Contact response failed validation; serving fallback', parsed.error.flatten());
      return respond<ContactResponse>(CONTACT_FALLBACK, {
        status: 200,
        headers: CACHE_HEADERS,
      });
    }
    return respond<ContactResponse>(responseBody, {
      status: 200,
      headers: CACHE_HEADERS,
    });
  } catch (error) {
    logger.warn('Falling back to static contact info', error);
    return respond<ContactResponse>(CONTACT_FALLBACK, {
      status: 200,
      headers: CACHE_HEADERS,
    });
  }
}
