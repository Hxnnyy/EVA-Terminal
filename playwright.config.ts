import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT ?? '3000';
const HOST = process.env.HOST ?? '127.0.0.1';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${HOST}:${PORT}`;
const useProdServer = process.env.PLAYWRIGHT_MODE === 'prod';
const webServerCommand = useProdServer
  ? `npm run start -- --hostname 0.0.0.0 --port ${PORT}`
  : `npm run dev -- --hostname 0.0.0.0 --port ${PORT}`;

const testEnvDefaults = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? `http://${HOST}:54321`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'anon-test-key',
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? baseURL,
  NEXT_PUBLIC_SUPABASE_REEL_BUCKET: process.env.NEXT_PUBLIC_SUPABASE_REEL_BUCKET ?? 'reel',
  NEXT_PUBLIC_SUPABASE_CV_BUCKET: process.env.NEXT_PUBLIC_SUPABASE_CV_BUCKET ?? 'cv',
  NEXT_PUBLIC_SUPABASE_PROJECT_MDX_BUCKET:
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_MDX_BUCKET ?? 'project-mdx',
  SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE ?? 'service-role-test-key',
  SUPABASE_DISABLED_FOR_TESTS: process.env.SUPABASE_DISABLED_FOR_TESTS ?? 'true',
  SUPPRESS_ENV_VALIDATION_FOR_TESTS: process.env.SUPPRESS_ENV_VALIDATION_FOR_TESTS ?? 'true',
  ADMIN_E2E_FIXTURE: process.env.ADMIN_E2E_FIXTURE ?? 'true',
};

for (const [key, value] of Object.entries(testEnvDefaults)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}

export default defineConfig({
  testDir: './tests/playwright',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: false,
    timeout: useProdServer ? 240_000 : 120_000,
    env: { ...process.env, ...testEnvDefaults },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
