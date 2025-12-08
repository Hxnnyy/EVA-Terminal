import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots', 'admin');
mkdirSync(SCREENSHOT_DIR, { recursive: true });
const fixtureEnabled = process.env.ADMIN_E2E_FIXTURE === 'true';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Random123!';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set via .env');
}

test.describe.configure({
  timeout: 120_000,
  retries: process.env.CI ? 2 : 0,
});

test.describe('Admin dashboard', () => {
  test.skip(fixtureEnabled, 'Fixture mode bypasses Supabase auth login flow.');

  test('modal login unlocks dashboard', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });

    const modal = page.locator('.admin-modal');
    await expect(modal).toBeVisible({ timeout: 15_000 });
    await modal.getByLabel('Email').fill(ADMIN_EMAIL);
    await modal.getByLabel('Password').fill(ADMIN_PASSWORD);
    await modal.getByRole('button', { name: /sign in/i }).click();
    await expect(modal).toBeHidden({ timeout: 15_000 });
    await page.waitForTimeout(800);
    await page.waitForURL(/\/admin$/, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 });
    const dashboard = page.locator('.admin-dashboard');
    await expect(dashboard.locator('.admin-dashboard__grid')).toBeVisible({ timeout: 30_000 });
    await expect(dashboard.getByText('Welcome back', { exact: false })).toBeVisible({
      timeout: 30_000,
    });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'admin-dashboard.png'),
      fullPage: true,
    });
  });
});
