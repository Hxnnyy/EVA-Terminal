import { expect, test } from '@playwright/test';

test('reel prompt opens viewer overlay', async ({ page }) => {
  await page.goto('/');

  const input = page.getByPlaceholder('Type /start or /help');
  await input.fill('/9');
  await input.press('Enter');

  const prompt = page.getByText('Click to open Reel Viewer', { exact: false });
  await expect(prompt).toBeVisible({ timeout: 10_000 });

  await prompt.click();

  const overlay = page.locator('.reel-viewer');
  await expect(overlay).toBeVisible({ timeout: 10_000 });
});
