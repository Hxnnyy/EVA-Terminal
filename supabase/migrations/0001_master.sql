-- EVA Terminal schema bootstrap
-- Generated for initial Supabase provisioning.

-- ============================================================================
-- IMPORTANT FOR FORKS:
-- This migration contains hardcoded admin email policies. Before running:
-- 1. Search for 'admin@example.com' in this file
-- 2. Replace ALL occurrences with your Supabase auth email
-- 3. See README.md "Forking: Required Customization" for details
-- ============================================================================

begin;

create extension if not exists "pgcrypto";

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text,
  body_mdx text not null,
  status text not null check (status in ('draft', 'published')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists articles_status_created_idx
  on public.articles (status, created_at desc);

create trigger handle_articles_updated_at
  before update on public.articles
  for each row
  execute function public.handle_updated_at();

create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('social', 'site', 'other')),
  label text not null,
  url text not null,
  "order" int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger handle_links_updated_at
  before update on public.links
  for each row
  execute function public.handle_updated_at();

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null,
  blurb text,
  url text,
  tags text[] not null default '{}',
  "order" int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger handle_projects_updated_at
  before update on public.projects
  for each row
  execute function public.handle_updated_at();

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  label text,
  "order" int not null default 0,
  provider text not null default 'stooq' check (provider in ('stooq', 'alphavantage')),
  provider_symbol text,
  perf_6m_percent numeric,
  perf_last_fetched timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists investments_ticker_idx
  on public.investments (ticker);

create trigger handle_investments_updated_at
  before update on public.investments
  for each row
  execute function public.handle_updated_at();

create table if not exists public.singletons (
  key text primary key,
  body_mdx text,
  meta jsonb default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger handle_singletons_updated_at
  before update on public.singletons
  for each row
  execute function public.handle_updated_at();

create table if not exists public.reel_images (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caption text,
  "order" int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger handle_reel_images_updated_at
  before update on public.reel_images
  for each row
  execute function public.handle_updated_at();

alter table public.articles enable row level security;
alter table public.links enable row level security;
alter table public.projects enable row level security;
alter table public.investments enable row level security;
alter table public.singletons enable row level security;
alter table public.reel_images enable row level security;

create policy if not exists "articles_public_read"
  on public.articles
  for select
  using (true);

create policy if not exists "links_public_read"
  on public.links
  for select
  using (true);

create policy if not exists "projects_public_read"
  on public.projects
  for select
  using (true);

create policy if not exists "investments_public_read"
  on public.investments
  for select
  using (true);

create policy if not exists "singletons_public_read"
  on public.singletons
  for select
  using (true);

create policy if not exists "reel_public_read"
  on public.reel_images
  for select
  using (true);

-- NOTE: Replace 'admin@example.com' with your admin email in all policies below
create policy if not exists "articles_admin_write"
  on public.articles
  for all
  using (auth.email() = 'admin@example.com')
  with check (auth.email() = 'admin@example.com');

create policy if not exists "links_admin_write"
  on public.links
  for all
  using (auth.email() = 'admin@example.com')
  with check (auth.email() = 'admin@example.com');

create policy if not exists "projects_admin_write"
  on public.projects
  for all
  using (auth.email() = 'admin@example.com')
  with check (auth.email() = 'admin@example.com');

create policy if not exists "investments_admin_write"
  on public.investments
  for all
  using (auth.email() = 'admin@example.com')
  with check (auth.email() = 'admin@example.com');

create policy if not exists "singletons_admin_write"
  on public.singletons
  for all
  using (auth.email() = 'admin@example.com')
  with check (auth.email() = 'admin@example.com');

create policy if not exists "reel_admin_write"
  on public.reel_images
  for all
  using (auth.email() = 'admin@example.com')
  with check (auth.email() = 'admin@example.com');

-- Seed default singleton keys
INSERT INTO public.singletons (key, body_mdx, meta)
VALUES 
  ('onepager', '', '{"title": "Your Name", "subtitle": "Software Engineer"}'::jsonb),
  ('contact', '', '{"email": "hello@example.com"}'::jsonb),
  ('bio', '# About Me\n\nYour bio here.', '{}'::jsonb),
  ('currently', '## Currently\n\n- Working on something cool', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

commit;

begin;

-- Clean up existing policies to avoid duplicates when re-running the migration.
drop policy if exists "storage_reel_public_read" on storage.objects;
drop policy if exists "storage_cv_public_read" on storage.objects;
drop policy if exists "storage_reel_admin_write" on storage.objects;
drop policy if exists "storage_cv_admin_write" on storage.objects;

-- Allow public reads for reel assets (terminal reels reference public URLs).
create policy "storage_reel_public_read"
  on storage.objects
  for select
  using ( bucket_id = 'reel' );

-- Allow public reads for CV downloads while keeping writes locked down.
create policy "storage_cv_public_read"
  on storage.objects
  for select
  using ( bucket_id = 'cv' );

-- Admin-only writes to the reel bucket via authenticated Supabase JS client.
create policy "storage_reel_admin_write"
  on storage.objects
  for all
  using ( bucket_id = 'reel' and auth.email() = 'admin@example.com' )
  with check ( bucket_id = 'reel' and auth.email() = 'admin@example.com' );

-- Admin-only writes to the cv bucket via authenticated Supabase JS client.
create policy "storage_cv_admin_write"
  on storage.objects
  for all
  using ( bucket_id = 'cv' and auth.email() = 'admin@example.com' )
  with check ( bucket_id = 'cv' and auth.email() = 'admin@example.com' );

commit;
