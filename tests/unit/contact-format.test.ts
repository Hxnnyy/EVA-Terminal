import { describe, expect, it } from 'vitest';

import { buildContactLines } from '@/lib/terminal/commands/contact';

describe('buildContactLines', () => {
  it('formats contact info', () => {
    const lines = buildContactLines({
      email: 'hello@example.dev',
      phone: '+1-555-123-4567',
      discord: '@joe',
    });
    const text = lines.map((line) => line.text);
    expect(text[0]).toContain('RETRIEVING ADMIN CONTACT DETAILS');
    expect(text.some((line) => line.includes('hello@example.dev'))).toBe(true);
    expect(text.some((line) => line.includes('+1-555-123-4567'))).toBe(true);
    expect(text.some((line) => line.includes('@joe'))).toBe(true);
  });
});
