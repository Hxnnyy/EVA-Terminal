import { describe, expect, it, vi } from 'vitest';

describe('onepager fetcher', () => {
  describe('fetchOnepager', () => {
    it('returns fallback when no data', async () => {
      vi.resetModules();
      const { fetchOnepager } = await import('@/lib/supabase/onepager');
      const result = await fetchOnepager();
      expect(result).toBeTruthy();
      expect(result?.bodyMdx).toContain('Your Name');
      expect(result?.meta).toBeDefined();
    });

    it('returns expected record structure', async () => {
      vi.resetModules();
      const { fetchOnepager } = await import('@/lib/supabase/onepager');
      const result = await fetchOnepager();
      expect(result).toBeTruthy();
      expect(typeof result?.bodyMdx).toBe('string');
      expect(typeof result?.updatedAt).toBe('string');
      expect(result?.meta).toBeDefined();
    });
  });

  describe('isOnepagerMeta', () => {
    it('returns true for valid meta object', async () => {
      const { isOnepagerMeta } = await import('@/lib/supabase/onepager');
      expect(isOnepagerMeta({ title: 'Test', subtitle: 'Sub' })).toBe(true);
      expect(isOnepagerMeta({ title: 'Test' })).toBe(true);
      expect(isOnepagerMeta({})).toBe(true);
    });

    it('returns false for invalid values', async () => {
      const { isOnepagerMeta } = await import('@/lib/supabase/onepager');
      expect(isOnepagerMeta(null)).toBe(false);
      expect(isOnepagerMeta(undefined)).toBe(false);
      expect(isOnepagerMeta('string')).toBe(false);
      expect(isOnepagerMeta([])).toBe(false);
      expect(isOnepagerMeta(123)).toBe(false);
    });
  });

  describe('ONEPAGER_FALLBACK', () => {
    it('contains expected fallback content', async () => {
      const { ONEPAGER_FALLBACK } = await import('@/lib/fallbacks/onepager');
      expect(ONEPAGER_FALLBACK.bodyMdx).toContain('# Your Name');
      expect(ONEPAGER_FALLBACK.bodyMdx).toContain('Software Engineer');
      expect(ONEPAGER_FALLBACK.meta.title).toBe('Your Name');
      expect(ONEPAGER_FALLBACK.meta.subtitle).toBe('Software Engineer');
      expect(ONEPAGER_FALLBACK.updatedAt).toBeDefined();
    });
  });
});
