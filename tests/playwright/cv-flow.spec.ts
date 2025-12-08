import { expect, test } from '@playwright/test';

test.describe('CV command flow', () => {
  test('/2 followed by /3 keeps CLI responsive', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Type /start', { exact: false })).toBeVisible({ timeout: 15_000 });
    const input = page.getByPlaceholder('Type /start or /help');

    await input.fill('/2');
    await input.press('Enter');
    await expect(
      page.locator('.terminal-line.system', { hasText: 'DOCUMENT REQUESTED' }),
    ).toBeVisible({ timeout: 15_000 });

    await input.fill('/3');
    await input.press('Enter');
    await expect(
      page.locator('.terminal-line.system', { hasText: 'RETRIEVING LINK MATRIX' }).last(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
