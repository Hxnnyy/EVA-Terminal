import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { THEME_CLASS_PREFIX, THEME_LIST } from '@/lib/theme/theme-manifest';

const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots', 'themes');
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const THEMES = THEME_LIST.map((theme) => ({
  command: `/${theme.id}`,
  className: `${THEME_CLASS_PREFIX}${theme.id}`,
}));

test.describe('Theme commands', () => {
  test('apply body classes when invoked', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Type /start or /help');
    await expect(page.getByText('Type /start', { exact: false })).toBeVisible({ timeout: 15_000 });

    for (const theme of THEMES) {
      await input.fill(theme.command);
      await input.press('Enter');
      await expect(page.locator('body')).toHaveClass(new RegExp(`\\b${theme.className}\\b`), {
        timeout: 15_000,
      });
      await page.waitForTimeout(300);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${theme.className}.png`),
        fullPage: true,
      });
    }
  });
});
