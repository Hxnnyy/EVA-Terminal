import { expect, test } from '@playwright/test';

const NON_ADMIN_EMAIL = process.env.NON_ADMIN_EMAIL;
const NON_ADMIN_PASSWORD = process.env.NON_ADMIN_PASSWORD;
const fixtureEnabled = process.env.ADMIN_E2E_FIXTURE === 'true';

test.describe.configure({
  timeout: 90_000,
  retries: process.env.CI ? 2 : 0,
});

test.describe('Admin guard', () => {
  test.skip(fixtureEnabled, 'Fixture mode bypasses auth redirects.');

  test('unauthenticated user sees login gate on /admin', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL((url) => url.pathname === '/admin');
    await expect(page.locator('.admin-auth-gate')).toBeVisible({ timeout: 12_000 });
  });

  test('non-admin user is redirected with a friendly message', async ({ page }) => {
    test.skip(
      !NON_ADMIN_EMAIL || !NON_ADMIN_PASSWORD,
      'Set NON_ADMIN_EMAIL and NON_ADMIN_PASSWORD to run the non-admin guard check.',
    );

    await page.goto('/admin');

    const modal = page.locator('.admin-modal');
    await expect(modal).toBeVisible({ timeout: 12_000 });
    await modal.getByLabel('Email').fill(NON_ADMIN_EMAIL!);
    await modal.getByLabel('Password').fill(NON_ADMIN_PASSWORD!);
    await modal.getByRole('button', { name: /sign in/i }).click();
    await expect(modal).toBeHidden({ timeout: 15_000 });

    await page.waitForURL(/\/(admin|forbidden)/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/forbidden/);
    await expect(
      page.getByText('You need admin access to view this area', { exact: false }),
    ).toBeVisible({
      timeout: 8_000,
    });
  });
});
