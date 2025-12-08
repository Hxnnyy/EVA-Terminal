import { expect, test } from '@playwright/test';

test.describe('Articles smoke', () => {
  test('redirects /articles to latest article', async ({ page }) => {
    await page.goto('/articles');
    await expect(page).toHaveURL(/\/articles\/.+/);
    await expect(page.locator('.writing-article__hero h1')).toHaveText(/.+/, { timeout: 20_000 });
  });
});
