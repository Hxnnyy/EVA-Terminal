import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots', 'admin');
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Random123!';
const fixtureEnabled = process.env.ADMIN_E2E_FIXTURE === 'true';

test('reel table aligns thumbnails and actions', async ({ page }) => {
  test.skip(fixtureEnabled, 'Fixture mode bypasses Supabase auth login flow.');

  await page.goto('/admin', { waitUntil: 'domcontentloaded' });

  const modal = page.locator('.admin-modal');
  await modal.getByLabel('Email').fill(ADMIN_EMAIL);
  await modal.getByLabel('Password').fill(ADMIN_PASSWORD);
  await modal.getByRole('button', { name: /sign in/i }).click();
  await expect(modal).toBeHidden({ timeout: 15_000 });

  await page.waitForTimeout(600);
  await page.waitForURL(/\/admin/, { timeout: 10_000 });
  const reelSection = page.locator('.admin-card', { hasText: 'Reel Images' });
  await expect(reelSection).toBeVisible({ timeout: 30_000 });

  // Wait for rows in the new reel list layout
  const firstRow = reelSection.locator('.admin-list__row').first();
  await expect(firstRow).toBeVisible({ timeout: 10_000 });
  await expect(firstRow.locator('.admin-list__preview img')).toBeVisible();
  await expect(firstRow.locator('.admin-list__actions button').first()).toBeVisible();

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'reel-table.png'),
    fullPage: true,
  });
});
