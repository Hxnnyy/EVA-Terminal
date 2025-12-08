import { expect, test } from '@playwright/test';

test('CLI /4 shows case study link when provided', async ({ page }) => {
  await page.route('**/api/projects', (route) => {
    route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify({
        projects: [
          {
            id: 'p1',
            slug: 'demo-project',
            title: 'Demo Project',
            blurb: 'Demo blurb',
            tags: ['nextjs', 'supabase'],
            actions: [{ kind: 'external', href: 'https://example.com', label: 'Launch' }],
            hasCaseStudy: true,
          },
        ],
      }),
    });
  });

  await page.goto('/');
  const input = page.getByPlaceholder('Type /start or /help');

  await input.fill('/4');
  await input.press('Enter');
  await page.keyboard.press('f');

  await expect(page.locator('.terminal-line', { hasText: 'Case Study:' })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator('.terminal-line', { hasText: '/projects/demo-project' })).toBeVisible({
    timeout: 10_000,
  });
});
