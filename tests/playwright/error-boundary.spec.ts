import { expect, test } from '@playwright/test';

const cases = [
  { path: '/?error=1', title: 'Home terminal failed to load.' },
  { path: '/articles?error=1', title: "We couldn't render the articles index." },
  { path: '/projects?error=1', title: "We couldn't render the projects archive." },
];

test.describe('Segment error boundaries', () => {
  for (const scenario of cases) {
    test(`shows boundary for ${scenario.path}`, async ({ page }) => {
      await page.goto(scenario.path);

      const panel = page.getByTestId('segment-error-panel');
      await expect(panel).toBeVisible();
      await expect(panel).toContainText(scenario.title);

      const requestId = page.getByTestId('segment-error-request-id');
      await expect(requestId).not.toHaveText('');

      await expect(page.getByTestId('segment-error-reset')).toBeVisible();
      await expect(page.getByTestId('segment-error-reload')).toBeVisible();
    });
  }
});
