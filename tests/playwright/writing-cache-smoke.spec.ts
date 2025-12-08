import { expect, test } from '@playwright/test';

const slug = 'prompt-1-mapping-master-v4-5';

test.describe('Writing cache smoke', () => {
  test('second hit is served from cache', async ({ request }) => {
    const path = `/writing/${slug}`;

    const firstResponse = await request.get(path);
    expect(firstResponse.ok()).toBeTruthy();

    const secondResponse = await request.get(path);
    expect(secondResponse.ok()).toBeTruthy();

    const cacheHeader = secondResponse.headers()['x-nextjs-cache'];
    expect(cacheHeader, 'x-nextjs-cache should be present on cached responses').toBeDefined();
    expect(cacheHeader?.toUpperCase()).toBe('HIT');
  });
});
