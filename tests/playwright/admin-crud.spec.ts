import { expect, test } from '@playwright/test';

test.describe('Admin CRUD (fixture mode)', () => {
  test('creates and deletes a link without Supabase', async ({ page }) => {
    const createdLink = {
      id: 'fixture-link',
      category: 'social',
      label: 'Fixture Link',
      url: 'https://example.com/fixture',
      order: 99,
    };

    await page.route('**/api/admin/links**', async (route) => {
      const method = route.request().method();
      if (method === 'POST') {
        await route.fulfill({
          status: 201,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ link: createdLink }),
        });
        return;
      }
      if (method === 'DELETE') {
        await route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ok: true }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/admin');
    const linksSection = page.locator('.admin-card', { hasText: 'Links' });
    await expect(linksSection.getByRole('heading', { name: 'Links' })).toBeVisible({
      timeout: 15_000,
    });

    await linksSection.getByLabel('Label', { exact: true }).fill(createdLink.label);
    await linksSection.getByLabel('URL').fill(createdLink.url);
    await linksSection.getByRole('button', { name: 'Add Link' }).click();

    await expect(linksSection.getByText(createdLink.label)).toBeVisible({ timeout: 10_000 });

    const actions = linksSection.getByLabel(`Actions for ${createdLink.label}`);
    await actions.getByRole('button', { name: 'Delete' }).click();

    await expect(linksSection.getByText(createdLink.label)).not.toBeVisible({ timeout: 10_000 });
  });
});
