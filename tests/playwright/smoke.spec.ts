import { expect, test } from '@playwright/test';

test.describe('Terminal smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('renders the command prompt', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Type /start or /help')).toBeVisible();
  });

  test('renders updated MAGI header copy', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('S.C. Magi System')).toBeVisible();
    await expect(page.getByText('Neural Access Node')).toBeVisible();
  });

  test('skips boot overlay when reduced motion', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.magi-boot')).toHaveCount(0);
  });
});
