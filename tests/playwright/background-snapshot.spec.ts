import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

const DIR = path.join(process.cwd(), 'screenshots', 'backgrounds');
mkdirSync(DIR, { recursive: true });

const slug = process.env.BG_SNAPSHOT_NAME ?? 'background';

test('captures terminal background', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const input = page.getByPlaceholder('Type /start or /help');
  await expect(input).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(DIR, `${slug}.png`),
    fullPage: true,
  });
});
