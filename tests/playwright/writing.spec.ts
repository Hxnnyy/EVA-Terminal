import { expect, test } from '@playwright/test';

test.describe('Terminal writing module', () => {
  test('lists and opens fallback article', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Type /start or /help');
    await expect(page.getByText('Type /start', { exact: false })).toBeVisible({ timeout: 15_000 });

    await input.fill('/5');
    await input.press('Enter');
    await input.fill('f');
    await input.press('Enter');

    await expect(
      page.locator('.terminal-line.system', { hasText: 'RETRIEVING ARTICLE DOSSIER' }).first(),
    ).toBeVisible({ timeout: 20_000 });

    const articleLink = page.locator('.terminal-link').first();
    const href = await articleLink.getAttribute('href');
    await expect(href).toBeTruthy();
    await expect(href).toContain('/articles/');
  });
});
