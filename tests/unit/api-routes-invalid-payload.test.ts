import { describe, expect, it, vi } from 'vitest';

import { POST as createArticle } from '@/app/api/admin/articles/route';
import { POST as createProject } from '@/app/api/admin/projects/route';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

describe('admin API route validation', () => {
  it('returns actionable errors for invalid article payloads', async () => {
    const request = new Request('http://localhost/api/admin/articles', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: '', slug: '', body_mdx: '' }),
    });

    const response = await createArticle(request);
    const payload = (await response.json()) as { error: string; details?: string[] };

    expect(response.status).toBe(400);
    expect(payload.error).toContain('Invalid article payload');
    expect(payload.details).toEqual(
      expect.arrayContaining(['Slug is required.', 'Title is required.', 'Body is required.']),
    );
  });

  it('returns actionable errors for invalid article MDX', async () => {
    const request = new Request('http://localhost/api/admin/articles', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Article',
        slug: 'test-article',
        body_mdx: 'Hello {',
        status: 'published',
      }),
    });

    const response = await createArticle(request);
    const payload = (await response.json()) as { error: string; details?: string[] };

    expect(response.status).toBe(400);
    expect(payload.error).toContain('Invalid article body');
    expect(payload.details?.[0]).toMatch(/MDX syntax error/i);
  });

  it('returns actionable errors for invalid project payloads', async () => {
    const request = new Request('http://localhost/api/admin/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: '', url: 'not-a-url' }),
    });

    const response = await createProject(request);
    const payload = (await response.json()) as { error: string; details?: string[] };

    expect(response.status).toBe(400);
    expect(payload.error).toContain('Invalid project payload');
    expect(payload.details).toEqual(expect.arrayContaining(['Title is required.']));
  });
});
