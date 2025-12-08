import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { ADMIN_FORBIDDEN_MESSAGE, hasAdminRole } from '@/lib/auth/admin';
import { serverEnv } from '@/lib/env.server';
import { attachRequestIdHeader, createLogger, REQUEST_ID_HEADER } from '@/lib/logger';
import { assertAdminBypassAllowed, logAdminBypassStatus } from '@/lib/security/admin-bypass';
import { buildCspHeaders } from '@/lib/security/csp';

const ADMIN_PAGE_PATH = '/admin';
const ADMIN_API_PATH = '/api/admin';
const PROTECTED_PATHS = [ADMIN_PAGE_PATH, ADMIN_API_PATH];

const isProtectedPath = (pathname: string) =>
  PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

const isAdminApiPath = (pathname: string) =>
  pathname === ADMIN_API_PATH || pathname.startsWith(`${ADMIN_API_PATH}/`);

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const nodeEnv = process.env.NODE_ENV;
  const isDev = nodeEnv === 'development';
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const requestId = requestHeaders.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  const { headers: securityHeaders } = buildCspHeaders({ nonce, isDev });

  for (const { key, value } of securityHeaders) {
    if (key === 'Content-Security-Policy' || key === 'x-nonce') {
      requestHeaders.set(key, value);
    }
  }

  const applyBaseHeaders = (response: NextResponse, { noStore = false } = {}) => {
    for (const { key, value } of securityHeaders) {
      response.headers.set(key, value);
    }
    if (noStore) {
      response.headers.set('Cache-Control', 'no-store');
    }
    return attachRequestIdHeader(response, requestId);
  };

  const pathname = request.nextUrl.pathname;
  const protectedPath = isProtectedPath(pathname);
  const adminApiRequest = isAdminApiPath(pathname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Only guard protected paths for auth.
  if (!protectedPath) {
    return applyBaseHeaders(response);
  }

  const logger = createLogger({
    requestId,
    scope: adminApiRequest ? 'middleware:admin-api' : 'middleware',
  });

  if (adminApiRequest) {
    logger.info('Admin API request', { path: pathname, method: request.method });
  }

  // Use centralized admin bypass check
  const bypassResult = assertAdminBypassAllowed({ nodeEnv });
  logAdminBypassStatus(bypassResult, { path: pathname, method: request.method }, requestId);

  if (bypassResult.flags.length > 0 && bypassResult.reason === 'blocked_production') {
    return applyBaseHeaders(
      NextResponse.json(
        {
          error: `Admin bypass flags are disabled in production. Remove: ${bypassResult.flags.join(
            ', ',
          )}.`,
        },
        { status: 403 },
      ),
      { noStore: true },
    );
  }

  if (bypassResult.allowed) {
    return applyBaseHeaders(response, { noStore: true });
  }

  const supabaseUrl = serverEnv.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasExplicitSupabaseEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!hasExplicitSupabaseEnv) {
    logger.warn('Admin access blocked: Supabase env missing.');
    return applyBaseHeaders(
      NextResponse.json(
        {
          error:
            'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        },
        { status: 503 },
      ),
      { noStore: true },
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name, options) {
        response.cookies.set({
          name,
          value: '',
          ...options,
          maxAge: 0,
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // For API routes, return 401 - client must handle auth
    if (adminApiRequest) {
      return applyBaseHeaders(
        NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
        { noStore: true },
      );
    }
    // For page routes, let the page render - AdminAuthGate will handle login modal
    return applyBaseHeaders(response, { noStore: true });
  }

  if (!hasAdminRole(user)) {
    const forbiddenUrl = new URL('/forbidden', request.url);
    forbiddenUrl.searchParams.set('reason', 'admin');
    forbiddenUrl.searchParams.set('message', ADMIN_FORBIDDEN_MESSAGE);
    forbiddenUrl.searchParams.set('from', request.nextUrl.pathname);
    logger.warn('Admin role missing for user request');
    return applyBaseHeaders(NextResponse.redirect(forbiddenUrl), { noStore: true });
  }

  return applyBaseHeaders(response, { noStore: true });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
