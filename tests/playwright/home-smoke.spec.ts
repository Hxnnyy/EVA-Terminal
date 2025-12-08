import { expect, test } from '@playwright/test';

test.describe('Home smoke', () => {
  test('shows terminal prompt', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Type /start or /help')).toBeVisible({ timeout: 20_000 });
  });
});
