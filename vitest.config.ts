import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup-tests.ts'],
    pool: 'threads',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/playwright/**',
      'tests/unit/projects-format.test.ts',
    ],
  },
  resolve: {
    alias: [
      {
        find: 'server-only',
        replacement: path.resolve(__dirname, 'tests/mocks/server-only.ts'),
      },
      {
        find: '@/components/terminal',
        replacement: path.resolve(__dirname, 'src/features/terminal/components'),
      },
      {
        find: '@/components/admin',
        replacement: path.resolve(__dirname, 'src/features/admin/ui/components'),
      },
      {
        find: '@/lib/terminal',
        replacement: path.resolve(__dirname, 'src/features/terminal/lib'),
      },
      {
        find: '@/features/terminal',
        replacement: path.resolve(__dirname, 'src/features/terminal'),
      },
      {
        find: '@/features/admin',
        replacement: path.resolve(__dirname, 'src/features/admin'),
      },
      {
        find: '@/features',
        replacement: path.resolve(__dirname, 'src/features'),
      },
      {
        find: '@/hooks/use-admin-auth',
        replacement: path.resolve(__dirname, 'src/features/admin/components/use-admin-auth'),
      },
      {
        find: '@/hooks/use-reel-viewer',
        replacement: path.resolve(__dirname, 'src/features/terminal/hooks/use-reel-viewer'),
      },
      { find: '@', replacement: path.resolve(__dirname, 'src') },
    ],
  },
});
