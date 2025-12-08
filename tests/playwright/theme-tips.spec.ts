import { expect, test } from '@playwright/test';

test('/10 theme tips shows new guidance copy', async ({ page }) => {
  await page.goto('/');

  const input = page.getByPlaceholder('Type /start or /help');
  await input.fill('/10');
  await input.press('Enter');

  await expect(page.getByText('RETRIEVING MAGI USAGE GUIDANCE', { exact: false })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText('Streaming', { exact: false })).toBeVisible();
  await expect(page.getByText('Persist', { exact: false })).toHaveCount(0);
});
