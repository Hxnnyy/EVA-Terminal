import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../src/lib/supabase/database.types';

type TableName = 'articles' | 'links' | 'projects' | 'investments' | 'singletons' | 'reel_images';

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE'] as const;

function assertEnv(): void {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

async function resetTable(table: TableName, keyColumn: string): Promise<void> {
  const client = getClient();
  const { error } = await client.from(table).delete().not(keyColumn, 'is', null);
  if (error) {
    throw new Error(`Failed to clear ${table}: ${error.message}`);
  }
}

let clientSingleton: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (!clientSingleton) {
    const url = process.env.SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE!;
    clientSingleton = createClient<Database>(url, serviceRole, {
      auth: { persistSession: false },
    });
  }
  return clientSingleton;
}

async function seedArticles(): Promise<void> {
  const client = getClient();
  await resetTable('articles', 'id');
  const { error } = await client.from('articles').insert([
    {
      slug: 'magitech-stack',
      title: 'Inside the EVA Terminal Stack',
      subtitle: 'How the MAGI-inspired portfolio came together',
      body_mdx: `## EVA Terminal Architecture

Built on Next.js App Router with Supabase as the content and auth layer.

- **Typewriter Engine** decouples command execution from rendering.
- **MDX Everywhere** means articles, bio, and the currently panel ship from the same pipeline.
- **Investments** pull cached 6M performance metrics on the server.

\`\`\`ts
const { data } = await supabase.from("projects").select();
\`\`\`

More to follow once the build ships.`,
      status: 'published',
    },
  ]);
  if (error) {
    throw new Error(`Failed to seed articles: ${error.message}`);
  }
  console.log('Seeded articles');
}

async function seedLinks(): Promise<void> {
  const client = getClient();
  await resetTable('links', 'id');
  const { error } = await client.from('links').insert([
    {
      category: 'social',
      label: 'GitHub',
      url: 'https://github.com/your-username',
      order: 1,
    },
    {
      category: 'social',
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/in/your-profile/',
      order: 2,
    },
    {
      category: 'site',
      label: 'Latest Writing',
      url: 'https://medium.com/@your-username',
      order: 3,
    },
  ]);
  if (error) {
    throw new Error(`Failed to seed links: ${error.message}`);
  }
  console.log('Seeded links');
}

async function seedProjects(): Promise<void> {
  const client = getClient();
  await resetTable('projects', 'id');
  const { error } = await client.from('projects').insert([
    {
      slug: 'eva-terminal',
      title: 'EVA Terminal',
      blurb: 'MAGI-inspired CLI portfolio experience.',
      url: 'https://eva-terminal.dev',
      tags: ['nextjs', 'supabase', 'framer-motion'],
      order: 1,
    },
    {
      slug: 'signal-grid',
      title: 'Signal Grid',
      blurb: 'Data visualization toolkit for fintech analysts.',
      url: 'https://signalgrid.io',
      tags: ['react', 'd3', 'design-systems'],
      order: 2,
    },
  ]);
  if (error) {
    throw new Error(`Failed to seed projects: ${error.message}`);
  }
  console.log('Seeded projects');
}

async function seedInvestments(): Promise<void> {
  const client = getClient();
  await resetTable('investments', 'id');
  const { error } = await client.from('investments').insert([
    {
      ticker: 'AAPL',
      label: 'Apple',
      order: 1,
      provider_symbol: 'aapl.us',
    },
    {
      ticker: 'MSFT',
      label: 'Microsoft',
      order: 2,
      provider_symbol: 'msft.us',
    },
    {
      ticker: 'NVDA',
      label: 'NVIDIA',
      order: 3,
      provider_symbol: 'nvda.us',
    },
  ]);
  if (error) {
    throw new Error(`Failed to seed investments: ${error.message}`);
  }
  console.log('Seeded investments');
}

async function seedSingletons(): Promise<void> {
  const client = getClient();
  await resetTable('singletons', 'key');
  const { error } = await client.from('singletons').upsert([
    {
      key: 'bio',
      body_mdx: `### Your Name
- Strategic design & front-end lead
- Based in Your City
- Building cinematic web experiences with a pragmatic streak`,
    },
    {
      key: 'currently',
      body_mdx: `### Currently
- **Playing:** Armored Core VI
- **Watching:** Shin Evangelion
- **Listening:** Nujabes live loops
- **Reading:** Creative Selection`,
    },
    {
      key: 'cv_meta',
      meta: {
        last_updated: '2025-01-10',
        download_url: 'https://example.dev/docs/your-name-cv-2025.pdf',
        file_name: 'your-name-cv-2025.pdf',
        file_size_bytes: 358_400,
        checksum: 'sha256:placeholder-checksum',
      },
    },
  ]);
  if (error) {
    throw new Error(`Failed to seed singletons: ${error.message}`);
  }
  console.log('Seeded singletons');
}

async function seedReel(): Promise<void> {
  const client = getClient();
  await resetTable('reel_images', 'id');
  const { error } = await client.from('reel_images').insert([
    {
      url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
      caption: 'Interface explorations - EVA chroma set',
      order: 1,
    },
    {
      url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df',
      caption: 'Motion studies for Reel transitions',
      order: 2,
    },
  ]);
  if (error) {
    throw new Error(`Failed to seed reel images: ${error.message}`);
  }
  console.log('Seeded reel images');
}

async function main(): Promise<void> {
  try {
    assertEnv();
    await seedArticles();
    await seedLinks();
    await seedProjects();
    await seedInvestments();
    await seedSingletons();
    await seedReel();
    console.log('All seed data inserted successfully.');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  }
}

void main();
