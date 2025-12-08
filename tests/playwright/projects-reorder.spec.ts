import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots', 'admin');
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Random123!';
const fixtureEnabled = process.env.ADMIN_E2E_FIXTURE === 'true';

test('projects reorder swaps rows immediately', async ({ page }) => {
  test.skip(fixtureEnabled, 'Fixture mode bypasses Supabase auth login flow.');

  let created = 0;
  await page.route('**/api/admin/projects/*', async (route) => {
    const request = route.request();
    if (request.method() === 'PUT') {
      const body = request.postDataJSON() as { order?: number } | null;
      const id = request.url().split('/').pop() ?? 'unknown';
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          project: {
            id,
            slug: null,
            title: `Project ${id}`,
            blurb: null,
            url: null,
            tags: [],
            order: body?.order ?? 0,
          },
        }),
      });
    }

    if (request.method() === 'DELETE') {
      return route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
    }

    return route.continue();
  });

  await page.route('**/api/admin/projects', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      const body = request.postDataJSON() as {
        title?: string;
        slug?: string | null;
        blurb?: string | null;
        url?: string | null;
        tags?: string[];
        order?: number;
      } | null;
      created += 1;
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          project: {
            id: `p${created}`,
            title: body?.title ?? `Project ${created}`,
            slug: body?.slug ?? null,
            blurb: body?.blurb ?? null,
            url: body?.url ?? null,
            tags: body?.tags ?? [],
            order: body?.order ?? created,
          },
        }),
      });
    }
    return route.continue();
  });

  await page.route('**/api/admin/projects/upload', (route) =>
    route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) }),
  );

  await page.goto('/admin', { waitUntil: 'domcontentloaded' });

  const modal = page.locator('.admin-modal');
  await modal.getByLabel('Email').fill(ADMIN_EMAIL);
  await modal.getByLabel('Password').fill(ADMIN_PASSWORD);
  await modal.getByRole('button', { name: /sign in/i }).click();
  await expect(modal).toBeHidden({ timeout: 15_000 });

  await page.waitForTimeout(600);
  await page.waitForURL(/\/admin/, { timeout: 10_000 });
  const projectSection = page.locator('.admin-card', { hasText: 'Projects' });
  const listRows = projectSection.locator('.admin-list__row');
  await expect(listRows.first()).toBeVisible({ timeout: 30_000 });
  const rowCount = await listRows.count();
  test.skip(rowCount < 2, 'Need at least two projects to verify reordering.');

  const firstTitle = (
    await listRows.nth(0).locator('.admin-list__cell').first().innerText()
  ).trim();
  const secondTitle = (
    await listRows.nth(1).locator('.admin-list__cell').first().innerText()
  ).trim();

  // Move the first project down
  const buttons = await listRows.nth(0).locator('.admin-list__actions button').all();
  test.skip(buttons.length < 2, 'Reorder buttons not present for first row.');
  await buttons[1].click(); // down arrow

  await expect
    .poll(
      async () => (await listRows.nth(0).locator('.admin-list__cell').first().innerText()).trim(),
      { timeout: 15_000 },
    )
    .toBe(secondTitle);

  await expect
    .poll(
      async () => (await listRows.nth(1).locator('.admin-list__cell').first().innerText()).trim(),
      { timeout: 15_000 },
    )
    .toBe(firstTitle);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'projects-reorder.png'),
    fullPage: true,
  });
});
