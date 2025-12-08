import { serverEnv } from '../env.server';
import { buildSecurityHeaders, type SecurityHeader } from './headers';

type BuildCspOptions = {
  nonce?: string | null;
  isDev: boolean;
  connectSources?: string[];
};

type BuildCspHeadersOptions = {
  nonce?: string | null;
  isDev: boolean;
};

function parseOrigin(urlString?: string | null) {
  if (!urlString) {
    return null;
  }
  try {
    return new URL(urlString).origin;
  } catch {
    return null;
  }
}

function buildSupabaseConnectSources() {
  const sources: string[] = [];
  const origin = parseOrigin(serverEnv.NEXT_PUBLIC_SUPABASE_URL);
  if (!origin) {
    return sources;
  }

  const supabaseUrl = new URL(serverEnv.NEXT_PUBLIC_SUPABASE_URL);
  const websocketProtocol = supabaseUrl.protocol === 'https:' ? 'wss:' : 'ws:';

  sources.push(origin);
  sources.push(`${websocketProtocol}//${supabaseUrl.host}`);
  return sources;
}

function buildAlphaVantageConnectSources() {
  if (!serverEnv.ALPHAVANTAGE_API_KEY) {
    return [];
  }
  const origin = parseOrigin(serverEnv.ALPHAVANTAGE_ENDPOINT) ?? 'https://www.alphavantage.co';
  try {
    return [new URL(origin).origin];
  } catch {
    return [];
  }
}

function buildDefaultConnectSources(isDev: boolean, extras: string[] = []) {
  const sources = new Set<string>(["'self'"]);

  for (const value of buildSupabaseConnectSources()) {
    sources.add(value);
  }
  for (const value of buildAlphaVantageConnectSources()) {
    sources.add(value);
  }
  for (const value of extras) {
    if (value) {
      sources.add(value);
    }
  }

  if (isDev) {
    sources.add('ws:');
    sources.add('http:');
  }

  return Array.from(sources);
}

export function buildCsp({ nonce, isDev, connectSources }: BuildCspOptions) {
  const scriptSrc = [
    "'self'",
    isDev ? "'unsafe-inline'" : nonce ? `'nonce-${nonce}'` : null,
    isDev ? "'unsafe-eval'" : null,
    isDev ? 'blob:' : null,
    !isDev && nonce ? "'strict-dynamic'" : null,
  ]
    .filter(Boolean)
    .join(' ');

  const styleSrc = ["'self'", isDev ? "'unsafe-inline'" : nonce ? `'nonce-${nonce}'` : null]
    .filter(Boolean)
    .join(' ');

  const connectSrcValues = buildDefaultConnectSources(isDev, connectSources ?? []);
  const connectSrc = connectSrcValues.join(' ');

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' https: data:",
    "font-src 'self' https: data:",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];

  return directives.join('; ');
}

export function buildCspHeaders(options: BuildCspHeadersOptions): {
  csp: string;
  headers: SecurityHeader[];
} {
  const csp = buildCsp(options);
  const headers = buildSecurityHeaders({
    contentSecurityPolicy: csp,
    nonce: options.nonce,
  });

  return { csp, headers };
}
