import { expect, test } from '@playwright/test';

test.describe('Projects smoke', () => {
  test('renders projects API output', async ({ page }) => {
    await page.goto('/projects');
    const heading = page.getByRole('heading', { level: 1, name: /projects/i });
    const emptyState = page.getByText(/Archive not yet initialized/i);

    await expect(heading.or(emptyState)).toBeVisible({ timeout: 20_000 });
  });
});
