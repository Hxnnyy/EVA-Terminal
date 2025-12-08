import { describe, expect, it } from 'vitest';

import { ContactSchema, InvestmentResponseSchema } from '@/lib/schemas';

describe('ContactSchema', () => {
  it('accepts valid contact payload', () => {
    const result = ContactSchema.safeParse({
      email: 'hello@example.com',
      phone: '+1-555-0100',
      discord: 'user#1234',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = ContactSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
  });
});

describe('InvestmentResponseSchema', () => {
  const baseInvestment = {
    id: 'abc',
    ticker: 'ABC',
    label: 'ABC Corp',
    order: 1,
    provider: 'stooq',
    providerSymbol: 'ABC',
    perf6mPercent: 1.23,
    perfLastFetched: '2024-01-01T00:00:00.000Z',
  };

  it('accepts valid investment response', () => {
    const result = InvestmentResponseSchema.safeParse({
      investments: [{ ...baseInvestment, source: 'cache' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing fields', () => {
    const result = InvestmentResponseSchema.safeParse({
      investments: [{ source: 'cache', id: 'x', ticker: 'X' }],
    });
    expect(result.success).toBe(false);
  });
});
