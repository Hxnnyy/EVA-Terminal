import { describe, expect, it } from 'vitest';

import { parseBioSingletonRow } from '@/features/terminal/lib/commands/bio.server';

describe('parseBioSingletonRow', () => {
  it('parses a fully populated singleton payload', () => {
    const snapshot = parseBioSingletonRow({
      body_mdx: `### Identity
- Name: Your Name
- Role: Creative technologist
- Base: Vancouver, BC
- Focus: Cinematic web narratives

### Core Aptitudes
- React / Next.js systems architect
- Framer Motion choreography

### Comm Links
- Email: [hello@example.dev](mailto:hello@example.dev)
- Portfolio: [example.dev](https://example.dev)
`,
      updated_at: '2025-02-01T12:00:00Z',
    });

    expect(snapshot.sections).toHaveLength(3);

    const [identity, aptitudes, comms] = snapshot.sections;
    expect(identity.title).toBe('Identity');
    expect(identity.items).toEqual([
      { kind: 'field', label: 'Name', value: 'Your Name' },
      { kind: 'field', label: 'Role', value: 'Creative technologist' },
      { kind: 'field', label: 'Base', value: 'Vancouver, BC' },
      { kind: 'field', label: 'Focus', value: 'Cinematic web narratives' },
    ]);

    expect(aptitudes.title).toBe('Core Aptitudes');
    expect(aptitudes.items).toEqual([
      { kind: 'bullet', text: 'React / Next.js systems architect' },
      { kind: 'bullet', text: 'Framer Motion choreography' },
    ]);

    expect(comms.items).toContainEqual({
      kind: 'field',
      label: 'Email',
      value: 'hello@example.dev → mailto:hello@example.dev',
    });
    expect(snapshot.warnings).toEqual([]);
    expect(snapshot.updatedAt).toBe('2025-02-01T12:00:00Z');
  });

  it('returns warnings when only headings are present', () => {
    const snapshot = parseBioSingletonRow({
      body_mdx: `### Identity

### Core Aptitudes
`,
      updated_at: '2025-02-01T12:00:00Z',
    });

    expect(snapshot.sections).toHaveLength(0);
    expect(snapshot.warnings).toEqual(['Bio singleton did not include any parsable entries.']);
  });

  it('handles missing singleton payloads gracefully', () => {
    const missing = parseBioSingletonRow(null);
    expect(missing.sections).toHaveLength(0);
    expect(missing.warnings).toEqual([
      'Bio singleton is missing. Seed content via the admin dashboard.',
    ]);

    const empty = parseBioSingletonRow({ body_mdx: '   \n', updated_at: null });
    expect(empty.sections).toHaveLength(0);
    expect(empty.warnings).toEqual(['Bio singleton is present but empty.']);
  });
});
