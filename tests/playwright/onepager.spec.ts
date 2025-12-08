import { expect, test } from '@playwright/test';

test.describe('Onepager command', () => {
  test('opens one-pager view when /onepager is typed', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Type /start or /help');
    await input.fill('/onepager');
    await input.press('Enter');
    await expect(page.locator('.onepager-overlay')).toBeVisible({ timeout: 5000 });
  });

  test('closes with Escape key', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Type /start or /help');
    await input.fill('/onepager');
    await input.press('Enter');
    await expect(page.locator('.onepager-overlay')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.onepager-overlay')).toBeHidden();
  });

  test('closes with Return to Terminal button', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Type /start or /help');
    await input.fill('/onepager');
    await input.press('Enter');
    await expect(page.locator('.onepager-overlay')).toBeVisible();
    await page.getByRole('button', { name: /return to terminal/i }).click();
    await expect(page.locator('.onepager-overlay')).toBeHidden({ timeout: 3000 });
  });

  test('displays MDX content in overlay', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Type /start or /help');
    await input.fill('/onepager');
    await input.press('Enter');
    await expect(page.locator('.onepager-overlay')).toBeVisible();
    // Check for rendered content
    await expect(page.locator('.onepager-body')).toContainText('Your Name');
  });

  test('overlay has proper accessibility attributes', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Type /start or /help');
    await input.fill('/onepager');
    await input.press('Enter');
    const overlay = page.locator('.onepager-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).toHaveAttribute('role', 'dialog');
    await expect(overlay).toHaveAttribute('aria-modal', 'true');
    await expect(overlay).toHaveAttribute('aria-label', 'One-page summary');
  });
});
