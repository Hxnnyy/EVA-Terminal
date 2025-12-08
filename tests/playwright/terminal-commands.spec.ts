import { expect, test } from '@playwright/test';

test.describe('Terminal commands', () => {
  test('shows menu and renders links output', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Type /start or /help');
    await expect(input).toBeVisible({ timeout: 15_000 });

    await input.fill('/start');
    await input.press('Enter');
    await expect(page.getByText('COMMAND MATRIX', { exact: false })).toBeVisible({
      timeout: 10_000,
    });

    await input.fill('/3');
    await input.press('Enter');
    await expect(page.getByRole('link', { name: /github\.com/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
