import { expect, test } from '@playwright/test';
import fs from 'fs/promises';

test.describe('Boot screen', () => {
  test('shows boot overlay then reveals terminal within 5s', async ({ page }) => {
    await page.route('**/api/investments', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ investments: [] }),
      });
    });

    await page.goto('/');

    const overlay = page.locator('.magi-boot');
    await expect(overlay).toBeVisible({ timeout: 1_000 });
    await expect(page.getByText('INITIALISING MAGI SYSTEM', { exact: false })).toBeVisible();

    await expect(overlay).toBeHidden({ timeout: 8_000 });
    await expect(page.getByPlaceholder('Type /start or /help')).toBeVisible({
      timeout: 10_000,
    });

    await fs.mkdir('screenshots', { recursive: true });
    await page.screenshot({
      path: 'screenshots/boot-ascii.png',
      fullPage: false,
    });
  });
});
