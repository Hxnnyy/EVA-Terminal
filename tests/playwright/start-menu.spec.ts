import { expect, test } from '@playwright/test';

test.describe('Terminal /start menu', () => {
  test('shows all numbered options after running /start', async ({ page }) => {
    await page.goto('/');

    const input = page.getByPlaceholder('Type /start or /help');
    await input.fill('/start');
    await input.press('Enter');

    await expect(page.getByText('/10 THEME TIPS')).toBeVisible({ timeout: 15_000 });

    const menuItems = await page
      .locator('.terminal-output .terminal-line.output')
      .allTextContents();

    expect(menuItems).toEqual([
      '/1 BIO',
      '/2 CV',
      '/3 LINKS',
      '/4 PROJECTS',
      '/5 WRITING',
      '/6 INVESTMENTS',
      '/7 CURRENTLY...',
      '/8 CONTACT',
      '/9 REEL',
      '/10 THEME TIPS',
    ]);
  });
});
