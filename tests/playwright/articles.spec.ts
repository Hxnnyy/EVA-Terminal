import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

const ARTICLE_HEADING_SELECTOR = '.writing-article__hero h1';
const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots', 'articles');
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const sanitize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/gi, '-');

async function capture(page: Page, fileName: string) {
  const target = path.join(SCREENSHOT_DIR, `${sanitize(fileName)}.png`);
  await page.waitForTimeout(250);
  await page.screenshot({ path: target, fullPage: true });
}

test.describe('Articles reader', () => {
  test('navigates via sidebar', async ({ page }) => {
    await page.goto('/articles');

    const sidebar = page.getByTestId('articles-sidebar');
    await expect(sidebar).toBeVisible();

    const links = page.getByTestId('articles-sidebar-link');
    const firstLink = links.first();
    const firstLinkGroup = firstLink.locator('xpath=ancestor::details[1]');
    const firstGroupOpen = await firstLinkGroup.evaluate(
      (node) => (node as HTMLDetailsElement).open,
    );
    if (!firstGroupOpen) {
      await firstLinkGroup.locator('[data-testid="articles-sidebar-group-toggle"]').click();
    }

    const articleTitle = (await firstLink.getAttribute('data-article-title')) ?? 'article-initial';
    await expect(firstLink).toBeVisible();
    await firstLink.click();

    await expect(page.locator(ARTICLE_HEADING_SELECTOR)).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.writing-article__content')).toBeVisible({ timeout: 20_000 });
    await capture(page, `articles-${articleTitle}`);

    const firstGroup = page.getByTestId('articles-sidebar-group').first();
    const firstGroupToggle = firstGroup.locator('[data-testid="articles-sidebar-group-toggle"]');

    const wasOpen = await firstGroup.evaluate((node) => (node as HTMLDetailsElement).open);
    await firstGroupToggle.click();
    await expect(firstGroup).toHaveJSProperty('open', !wasOpen);
    await firstGroupToggle.click();
    await expect(firstGroup).toHaveJSProperty('open', wasOpen);

    await firstGroupToggle.focus();
    await page.keyboard.press('Space');
    await expect(firstGroup).toHaveJSProperty('open', !wasOpen);
    await page.keyboard.press('Enter');
    await expect(firstGroup).toHaveJSProperty('open', wasOpen);

    if ((await links.count()) > 1) {
      const secondLink = links.nth(1);
      const secondLinkGroup = secondLink.locator('xpath=ancestor::details[1]');
      const secondGroupOpen = await secondLinkGroup.evaluate(
        (node) => (node as HTMLDetailsElement).open,
      );

      if (!secondGroupOpen) {
        await secondLinkGroup.locator('[data-testid="articles-sidebar-group-toggle"]').click();
      }

      await expect(secondLink).toBeVisible();
      const secondTitle = (await secondLink.getAttribute('data-article-title')) ?? 'article-second';
      await secondLink.click();
      await expect(page.locator(ARTICLE_HEADING_SELECTOR)).toBeVisible({ timeout: 20_000 });
      await capture(page, `articles-${secondTitle}`);
    }
  });
});
