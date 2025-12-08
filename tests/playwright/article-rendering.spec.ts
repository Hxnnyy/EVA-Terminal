import { expect, test } from '@playwright/test';

test.describe('Article rendering', () => {
  test('renders fallback MDX content', async ({ page }) => {
    await page.goto('/writing/prompt-1-mapping-master-v4-5');

    await expect(page.getByRole('heading', { name: 'Prompt-1 Mapping Master v4.5' })).toBeVisible({
      timeout: 15_000,
    });

    await expect(
      page.getByText('Supabase bucket-configured', { exact: false }).first(),
    ).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page
        .getByText('fallback article documents the cached writing pipeline', { exact: false })
        .first(),
    ).toBeVisible({
      timeout: 10_000,
    });
  });
});
