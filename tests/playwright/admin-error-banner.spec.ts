import { expect, test } from '@playwright/test';

test.describe('Admin error banner', () => {
  test.use({
    extraHTTPHeaders: {
      'x-force-admin-fallback': '1',
    },
  });

  test('surfaces fallback warnings when admin data is unavailable', async ({ page }) => {
    await page.goto('/admin');

    const warningHeading = page.getByRole('heading', { name: /fallback mode/i });
    await expect(warningHeading).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /Links unavailable/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
