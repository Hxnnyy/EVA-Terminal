test.setTimeout(180000);
import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots', 'options');
mkdirSync(SCREENSHOT_DIR, { recursive: true });

test.describe('Terminal read-only modules', () => {
  test('renders options 1-10 with fallbacks', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Type /start or /help')).toBeVisible({ timeout: 15_000 });

    const input = page.getByPlaceholder('Type /start or /help');
    const runCommand = async (command: string) => {
      await input.fill(command);
      await input.press('Enter');
      await page.waitForTimeout(300);
    };
    const fastForward = async () => {
      await input.fill('f');
      await input.press('Enter');
      await page.waitForTimeout(200);
    };
    const capture = async (slug: string) => {
      await page.waitForTimeout(200);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${slug}.png`),
        fullPage: true,
      });
    };
    const commands = [
      { cmd: '/1', slug: 'option-1-bio' },
      { cmd: '/2', slug: 'option-2-cv' },
      { cmd: '/3', slug: 'option-3-links' },
      { cmd: '/4', slug: 'option-4-projects' },
      { cmd: '/5', slug: 'option-5-writing' },
      { cmd: '/6', slug: 'option-6-investments' },
      { cmd: '/7', slug: 'option-7-currently' },
      { cmd: '/8', slug: 'option-8-contact' },
      { cmd: '/10', slug: 'option-10-theme' },
    ];

    for (const { cmd, slug } of commands) {
      await runCommand(cmd);
      await fastForward();
      await capture(slug);
      await page.waitForTimeout(150);
    }

    await runCommand('/9');
    await fastForward();
    await capture('option-9-reel');
  });
});
