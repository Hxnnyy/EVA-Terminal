export type SecurityHeader = { key: string; value: string };

export type BuildSecurityHeadersOptions = {
  contentSecurityPolicy?: string | null;
  nonce?: string | null;
};

const BASE_SECURITY_HEADERS: SecurityHeader[] = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

export function buildSecurityHeaders(options: BuildSecurityHeadersOptions = {}): SecurityHeader[] {
  const headers = [...BASE_SECURITY_HEADERS];

  if (options.contentSecurityPolicy) {
    headers.push({
      key: 'Content-Security-Policy',
      value: options.contentSecurityPolicy,
    });
  }

  if (options.nonce) {
    headers.push({
      key: 'x-nonce',
      value: options.nonce,
    });
  }

  return headers;
}
