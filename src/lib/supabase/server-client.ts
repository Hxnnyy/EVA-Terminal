import type { CookieOptions } from '@supabase/ssr';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import { serverEnv } from '@/lib/env.server';
import { CV_FALLBACK_METADATA } from '@/lib/fallbacks/cv';
import { INVESTMENTS_FALLBACK } from '@/lib/fallbacks/investments';
import { LINKS_FALLBACK } from '@/lib/fallbacks/links';
import { PROJECTS_FALLBACK } from '@/lib/fallbacks/projects';
import { REEL_FALLBACK } from '@/lib/fallbacks/reel';
import { WRITING_FALLBACK } from '@/lib/fallbacks/writing';
import { createLogger } from '@/lib/logger';
import type { Database } from '@/lib/supabase/database.types';
import {
  getSupabaseMode,
  isSupabaseDisabled,
  shouldUseAdminFixture,
  type SupabaseMode,
} from '@/lib/supabase/mode';

export class SupabaseEnvError extends Error {
  constructor(message?: string) {
    super(
      message ??
        'Supabase environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured.',
    );
    this.name = 'SupabaseEnvError';
  }
}

const SUPABASE_URL = serverEnv.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type CookieStore = Awaited<ReturnType<typeof cookies>>;
let cachedReadonlyClient: SupabaseClient<Database> | null = null;
let cachedFixtureClient: FixtureSupabaseClient | null = null;
let cachedFixtureDb: FixtureDb | null = null;
let cachedFixtureMode: SupabaseMode | null = null;
const defaultFixtureBuckets = [
  serverEnv.NEXT_PUBLIC_SUPABASE_REEL_BUCKET,
  serverEnv.NEXT_PUBLIC_SUPABASE_CV_BUCKET,
  serverEnv.NEXT_PUBLIC_SUPABASE_PROJECT_MDX_BUCKET,
].filter(Boolean) as string[];
let fixtureBuckets = new Set<string>(defaultFixtureBuckets);
const supabaseClientLogger = createLogger({ scope: 'supabase:client' });
let warnedDisabled = false;
let warnedMissingEnv = false;

const cookieAdapter = (store: CookieStore) => ({
  getAll: () => {
    const cookies: Array<{ name: string; value: string }> = [];
    store.getAll().forEach((cookie) => {
      cookies.push({ name: cookie.name, value: cookie.value });
    });
    return cookies;
  },
  get(name: string) {
    return store.get(name)?.value;
  },
  set(name: string, value: string, options: CookieOptions) {
    // In RSCs cookies are read-only; suppress errors and allow route handlers to set.
    if (typeof store.set === 'function') {
      try {
        store.set({ name, value, ...options });
      } catch {
        // noop
      }
    }
  },
  remove(name: string, options: CookieOptions) {
    if (typeof store.set === 'function') {
      try {
        store.set({ name, value: '', ...options, maxAge: 0 });
      } catch {
        // noop
      }
    }
  },
});

export async function createSupabaseServerClient(mode = getSupabaseMode()) {
  if (isSupabaseDisabled(mode)) {
    if (!warnedDisabled) {
      supabaseClientLogger.warn('Supabase client disabled via SUPABASE_DISABLED_FOR_TESTS');
      warnedDisabled = true;
    }
    return ensureFixtureClient(mode);
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (!warnedMissingEnv) {
      supabaseClientLogger.error('Supabase client env missing', {
        hasUrl: Boolean(SUPABASE_URL),
        hasAnonKey: Boolean(SUPABASE_ANON_KEY),
      });
      warnedMissingEnv = true;
    }
    throw new SupabaseEnvError();
  }

  const store = await cookies();
  const adapter = cookieAdapter(store);
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: adapter,
  });
}

export function getSupabaseReadonlyClient(mode = getSupabaseMode()) {
  if (isSupabaseDisabled(mode)) {
    if (!warnedDisabled) {
      supabaseClientLogger.warn('Supabase client disabled via SUPABASE_DISABLED_FOR_TESTS');
      warnedDisabled = true;
    }
    return ensureFixtureClient(mode);
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (!warnedMissingEnv) {
      supabaseClientLogger.error('Supabase client env missing', {
        hasUrl: Boolean(SUPABASE_URL),
        hasAnonKey: Boolean(SUPABASE_ANON_KEY),
      });
      warnedMissingEnv = true;
    }
    throw new SupabaseEnvError();
  }
  if (cachedReadonlyClient) {
    return cachedReadonlyClient;
  }
  cachedReadonlyClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedReadonlyClient;
}

export function isFixtureClient(client: SupabaseClient<Database>): client is FixtureSupabaseClient {
  return Boolean((client as { __isFixture?: boolean }).__isFixture);
}

export function ensureFixtureClient(mode = getSupabaseMode()): FixtureSupabaseClient {
  if (!cachedFixtureClient || !cachedFixtureMode || !modesEqual(mode, cachedFixtureMode)) {
    cachedFixtureDb = buildFixtureDb();
    cachedFixtureMode = mode;
    fixtureBuckets = new Set<string>(defaultFixtureBuckets);
    cachedFixtureClient = createFixtureClient(mode, cachedFixtureDb);
  }
  return cachedFixtureClient;
}

type FixtureTable = Array<Record<string, unknown>>;

type FixtureDb = {
  links: FixtureTable;
  projects: FixtureTable;
  articles: FixtureTable;
  investments: FixtureTable;
  reel_images: FixtureTable;
  singletons: FixtureTable;
};

type FixtureSupabaseClient = SupabaseClient<Database> & {
  __isFixture: true;
  __mode: SupabaseMode;
};

type InvestmentFallbackRecord = {
  id?: string;
  ticker?: string | null;
  label: string;
  order?: number;
  provider?: string;
  providerSymbol?: string | null;
  perf6mPercent?: number | null;
  perfLastFetched?: string | null;
};

const fixtureAdminUser: User = {
  id: 'fixture-admin-id',
  email: 'fixture-admin@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: { role: 'admin', roles: ['admin'], is_admin: true },
  user_metadata: {},
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
} as unknown as User;

function buildFixtureDb(): FixtureDb {
  const now = new Date().toISOString();
  const investmentFixtures = INVESTMENTS_FALLBACK.map(
    (record) => ({ ...record }) as InvestmentFallbackRecord,
  );

  return {
    links: LINKS_FALLBACK.map((link, index) => ({
      id: link.id ?? `fixture-link-${index + 1}`,
      category: (link.category ?? 'other') as string,
      label: link.label,
      url: link.url,
      order: link.order ?? index + 1,
      created_at: now,
      updated_at: now,
    })),
    projects: PROJECTS_FALLBACK.map((project, index) => {
      const caseStudy = project.actions.find((action) => action.kind === 'internal');
      const external = project.actions.find((action) => action.kind === 'external');
      return {
        id: project.id ?? `fixture-project-${index + 1}`,
        slug: caseStudy?.href.split('/').pop() ?? null,
        title: project.title,
        blurb: project.blurb ?? null,
        url: external?.href ?? null,
        tags: [...project.tags],
        order: (project as { order?: number }).order ?? index + 1,
        created_at: now,
        updated_at: now,
      };
    }),
    articles: WRITING_FALLBACK.map((entry, index) => ({
      id: (entry as { id?: string }).id ?? `fixture-article-${index + 1}`,
      slug: entry.slug,
      title: entry.title,
      subtitle: entry.subtitle ?? null,
      body_mdx: entry.body_mdx,
      status: 'published' as const,
      created_at: entry.published_at ?? now,
      updated_at: entry.published_at ?? now,
    })),
    investments: investmentFixtures.map((record, index) => ({
      id: record.id ?? `fixture-investment-${index + 1}`,
      ticker: record.ticker ?? null,
      label: record.label,
      order: record.order ?? index + 1,
      provider: record.provider ?? 'stooq',
      provider_symbol: record.providerSymbol ?? null,
      perf_6m_percent:
        typeof record.perf6mPercent === 'number'
          ? record.perf6mPercent.toString()
          : (record.perf6mPercent ?? null),
      perf_last_fetched: record.perfLastFetched ?? now,
      created_at: now,
      updated_at: now,
    })),
    reel_images: REEL_FALLBACK.map((item, index) => ({
      id: (item as { id?: string }).id ?? `fixture-reel-${index + 1}`,
      url: item.url,
      caption: item.caption ?? null,
      order: index + 1,
      created_at: now,
      updated_at: now,
    })),
    singletons: [
      {
        key: 'cv_meta',
        meta: {
          download_url: CV_FALLBACK_METADATA.downloadUrl,
          file_name: CV_FALLBACK_METADATA.fileName,
          file_size_bytes: CV_FALLBACK_METADATA.fileSizeBytes,
          last_updated: CV_FALLBACK_METADATA.lastUpdated,
          checksum: CV_FALLBACK_METADATA.checksum,
        },
      },
      {
        key: 'onepager',
        body_mdx: `# Your Name\n## Software Engineer\n\n### About\n\nA passionate software engineer with expertise in full-stack web development.\n\n### Experience\n\n- **Full-Stack Development** — Building modern web applications\n- **System Design** — Architecting scalable solutions\n\n### Contact\n\nUse \`/contact\` for details.`,
        meta: { title: 'Your Name', subtitle: 'Software Engineer' },
        updated_at: now,
      },
    ],
  };
}

class FixtureStorage {
  constructor(private bucket: string) {}

  async upload(path: string, _file: unknown, _options?: unknown) {
    void _file;
    void _options;
    return { data: { path }, error: null };
  }

  getPublicUrl(path: string) {
    const baseUrl = serverEnv.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const publicUrl = `${baseUrl}/storage/${this.bucket}/${encodeURIComponent(path)}`;
    return { data: { publicUrl } };
  }

  async remove(paths: string[]) {
    return { data: paths, error: null };
  }
}

type FixtureOperation = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

class FixtureQueryBuilder {
  private filters: Array<{ column: string; value: unknown }> = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private limitCount: number | null = null;

  constructor(
    private table: keyof FixtureDb,
    private db: FixtureDb,
    private operation: FixtureOperation = 'select',
    private payload: unknown = null,
  ) {}

  select(_columns?: string) {
    void _columns;
    return this;
  }

  insert(values: unknown) {
    this.operation = 'insert';
    this.payload = values;
    return this;
  }

  update(values: unknown) {
    this.operation = 'update';
    this.payload = values;
    return this;
  }

  upsert(values: unknown) {
    this.operation = 'upsert';
    this.payload = values;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  limit(value: number) {
    this.limitCount = value;
    return this;
  }

  async maybeSingle() {
    const { data, error } = await this.execute();
    return { data: (data as unknown[])[0] ?? null, error };
  }

  async single() {
    const { data, error } = await this.execute();
    return { data: (data as unknown[])[0] ?? null, error };
  }

  private async execute() {
    const now = new Date().toISOString();
    let rows = this.applyFilters();

    switch (this.operation) {
      case 'insert': {
        const payloadArray = Array.isArray(this.payload) ? this.payload : [this.payload];
        const inserted = payloadArray.map((value, index) => {
          const base = { ...(value as Record<string, unknown>) };
          if (!('id' in base) || !base.id) {
            base.id = `fixture-${String(this.table)}-${rows.length + index + 1}`;
          }
          return { ...base, created_at: now, updated_at: now };
        });
        (this.db[this.table] as unknown[]).push(...inserted);
        rows = inserted;
        break;
      }
      case 'update': {
        const updates = this.payload as Record<string, unknown>;
        rows = rows.map((row) =>
          Object.assign(row as Record<string, unknown>, updates, { updated_at: now }),
        );
        break;
      }
      case 'delete': {
        const toRemove = new Set(rows.map((row) => (row as { id?: string }).id));
        this.db[this.table] = (this.db[this.table] as unknown[]).filter((row) => {
          const id = (row as { id?: string }).id;
          return id ? !toRemove.has(id) : false;
        }) as FixtureDb[typeof this.table];
        break;
      }
      case 'upsert': {
        const values = Array.isArray(this.payload) ? this.payload : [this.payload];
        const upserted: unknown[] = [];
        values.forEach((value) => {
          const incoming = value as Record<string, unknown>;
          const key = incoming.key ?? (incoming as { id?: string }).id;
          const target =
            key != null
              ? (this.db[this.table] as unknown[]).find(
                  (row) => (row as Record<string, unknown>).key === key,
                )
              : undefined;
          if (target) {
            Object.assign(target, incoming, { updated_at: now });
            upserted.push(target);
          } else {
            const record = {
              ...incoming,
              id:
                key ??
                `fixture-${String(this.table)}-${(this.db[this.table] as unknown[]).length + 1}`,
              created_at: now,
              updated_at: now,
            };
            (this.db[this.table] as unknown[]).push(record);
            upserted.push(record);
          }
        });
        rows = upserted as unknown[];
        break;
      }
      default:
        break;
    }

    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      rows = [...rows].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[column];
        const bVal = (b as Record<string, unknown>)[column];
        if (aVal === bVal) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        return ascending
          ? Number(aVal > bVal) - Number(aVal < bVal)
          : Number(aVal < bVal) - Number(aVal > bVal);
      });
    }

    if (typeof this.limitCount === 'number') {
      rows = rows.slice(0, this.limitCount);
    }

    return { data: clone(rows), error: null };
  }

  private applyFilters(): unknown[] {
    const dataset = this.db[this.table] as unknown[];
    if (!this.filters.length) {
      return dataset.map((row) => row);
    }
    return dataset.filter((row) =>
      this.filters.every(({ column, value }) => (row as Record<string, unknown>)[column] === value),
    );
  }
}

function createFixtureClient(mode: SupabaseMode, db: FixtureDb): FixtureSupabaseClient {
  const authUser = shouldUseAdminFixture(mode) ? fixtureAdminUser : null;

  const client = {
    __isFixture: true as const,
    __mode: mode,
    auth: {
      getUser: async () => ({ data: { user: authUser }, error: null }),
      getSession: async () => ({
        data: { session: authUser ? { user: authUser } : null },
        error: null,
      }),
    },
    from: (table: keyof FixtureDb) =>
      new FixtureQueryBuilder(table, db) as unknown as ReturnType<SupabaseClient<Database>['from']>,
    storage: {
      from: (bucket: string) => new FixtureStorage(bucket),
      listBuckets: async () => ({
        data: Array.from(fixtureBuckets).map((name) => ({
          id: name,
          name,
          public: true,
          created_at: new Date(0).toISOString(),
          updated_at: new Date(0).toISOString(),
        })),
        error: null,
      }),
      createBucket: async (name: string, options?: { public?: boolean }) => {
        fixtureBuckets.add(name);
        return {
          data: { name, public: options?.public ?? true },
          error: null,
        };
      },
    },
  };

  return client as unknown as FixtureSupabaseClient;
}

const modesEqual = (a: SupabaseMode, b: SupabaseMode) =>
  a.disabledForTests === b.disabledForTests && a.adminFixture === b.adminFixture;

function clone<T>(value: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}
