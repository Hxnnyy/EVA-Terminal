import { expect, test } from '@playwright/test';

test.describe('Admin smoke', () => {
  test.skip(process.env.ADMIN_E2E_FIXTURE === 'true', 'Fixture mode bypasses auth redirects.');

  test('redirects unauthenticated users', async ({ page }) => {
    await page.goto('/admin');
    const url = new URL(page.url());
    expect(url.pathname).toBe('/');
  });
});
