import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  attachRequestIdHeader,
  createLogger,
  REQUEST_ID_HEADER,
  resolveRequestId,
} from '@/lib/logger';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'uuid-test') } as unknown as Crypto);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('logger', () => {
  it('formats level, request id, and scope when logging', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logger = createLogger({ requestId: 'req-123', scope: 'api' });

    logger.warn('problem', { code: 500 });

    expect(warnSpy).toHaveBeenCalledWith(
      '[2025-01-01T00:00:00.000Z] [WARN] [req:req-123] [api]',
      'problem',
      {
        code: 500,
      },
    );
  });

  it('reuses request id across child loggers', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const logger = createLogger({ requestId: 'req-abc', scope: 'parent' });
    const child = logger.child('child');

    child.info('ready');

    expect(infoSpy).toHaveBeenCalledWith(
      '[2025-01-01T00:00:00.000Z] [INFO] [req:req-abc] [parent:child]',
      'ready',
    );
  });

  it('resolves request ids from headers and generates fallbacks', () => {
    const headers = new Headers({ [REQUEST_ID_HEADER]: 'hdr-1' });
    const request = new Request('https://example.com', { headers });

    expect(resolveRequestId(headers)).toBe('hdr-1');
    expect(resolveRequestId(request)).toBe('hdr-1');
    expect(resolveRequestId({ headers })).toBe('hdr-1');
    expect(resolveRequestId(undefined)).toBe('uuid-test');
  });

  it('attaches request id header when missing', () => {
    const response = new Response('ok', { headers: new Headers() });
    attachRequestIdHeader(response, '');
    expect(response.headers.get(REQUEST_ID_HEADER)).toBe('req-unknown');

    const preset = new Response('ok', { headers: new Headers({ [REQUEST_ID_HEADER]: 'preset' }) });
    attachRequestIdHeader(preset, 'next-id');
    expect(preset.headers.get(REQUEST_ID_HEADER)).toBe('preset');
  });

  it('redacts sensitive keys while preserving other fields', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = createLogger({ requestId: 'req-safe', scope: 'api' });

    logger.error('secure', {
      token: 'should-hide',
      nested: { service_role: 'super-secret', ok: 'value' },
    });

    expect(errorSpy).toHaveBeenCalledWith(
      '[2025-01-01T00:00:00.000Z] [ERROR] [req:req-safe] [api]',
      'secure',
      {
        token: '[REDACTED]',
        nested: { service_role: '[REDACTED]', ok: 'value' },
      },
    );
  });
});
