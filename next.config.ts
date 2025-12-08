import './src/lib/env';
import './src/lib/env.server';

import createBundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';
import path from 'path';

import { buildCspHeaders } from './src/lib/security/csp';

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});

const host = process.env.HOST || '127.0.0.1';
const port = process.env.PORT || '3000';
const defaultDevHost = `${host}:${port}`;
const allowedDevOrigins = Array.from(
  new Set(
    [
      defaultDevHost,
      host,
      'localhost:3000',
      '127.0.0.1:3000',
      process.env.PLAYWRIGHT_BASE_URL ? new URL(process.env.PLAYWRIGHT_BASE_URL).host : '',
    ].filter(Boolean),
  ),
);

const remotePatterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
  {
    protocol: 'https',
    hostname: 'images.unsplash.com',
  },
  {
    protocol: 'https',
    hostname: 'cdn.example.dev',
  },
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (typeof supabaseUrl === 'string' && supabaseUrl.startsWith('http')) {
  try {
    const { hostname } = new URL(supabaseUrl);
    remotePatterns.push({
      protocol: 'https',
      hostname,
    });
  } catch {
    // ignore malformed env value
  }
}

const nextConfig: NextConfig = withBundleAnalyzer({
  outputFileTracingRoot: path.join(__dirname),
  allowedDevOrigins,
  images: {
    remotePatterns,
  },
  async headers() {
    const { headers } = buildCspHeaders({
      nonce: 'static-csp',
      isDev: process.env.NODE_ENV !== 'production',
    });

    return [
      {
        source: '/:path*',
        missing: [
          {
            type: 'header',
            key: 'x-nonce',
          },
        ],
        headers,
      },
    ];
  },
});

export default nextConfig;
