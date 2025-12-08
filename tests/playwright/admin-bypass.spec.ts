import { expect, test } from '@playwright/test';

const bypassEnabled =
  process.env.SUPABASE_DISABLED_FOR_TESTS === 'true' || process.env.ADMIN_E2E_FIXTURE === 'true';
const isProd = process.env.NODE_ENV === 'production';

test.describe('Admin bypass flags', () => {
  test.skip(isProd, 'Bypass flags are blocked in production.');

  test('loads admin dashboard via fixture when bypass flags are enabled', async ({ page }) => {
    test.skip(!bypassEnabled, 'Bypass flags are disabled for this run.');

    await page.goto('/admin', { waitUntil: 'networkidle' });

    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('.admin-dashboard')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('.admin-modal')).toBeHidden({ timeout: 15_000 });
  });
});
