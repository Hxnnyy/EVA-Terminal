// Default test env: keep Supabase offline/fallback to avoid using real creds during Vitest.
process.env.SUPABASE_DISABLED_FOR_TESTS ??= 'true';
process.env.SUPPRESS_ENV_VALIDATION_FOR_TESTS ??= 'true';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-test-key';
process.env.NEXT_PUBLIC_SITE_URL ??= 'http://localhost:3000';
process.env.SUPABASE_SERVICE_ROLE ??= 'service-role-test-key';

import '@testing-library/jest-dom/vitest';

import { vi } from 'vitest';

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    }),
  };
});
