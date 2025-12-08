import { headers } from 'next/headers';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import NotFound from '@/app/not-found';

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

describe('app/not-found logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'uuid-test') } as unknown as Crypto);
    vi.stubGlobal('React', React);
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('logs info when the path cannot be resolved from headers', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(headers).mockResolvedValue(new Headers());

    await NotFound();

    expect(warnSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
  });

  it('logs a warning when a path is available', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(headers).mockResolvedValue(new Headers({ 'x-invoke-path': '/missing' }));

    await NotFound();

    expect(warnSpy).toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
  });
});
