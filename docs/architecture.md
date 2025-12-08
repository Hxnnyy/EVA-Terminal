# Architecture

## Routing Layout (Next.js App Router)

- `/` (Terminal): `src/app/page.tsx` renders server wrapper `TerminalShell` which hydrates the client island `terminal-shell-client.tsx` for command handling, warmups, and theme switching.
- `/writing/[slug]` and `/articles/[slug]`: RSC pages with `revalidate = 300` using cached loaders (`fetchArticleBySlug`, `fetchArticleSummaries`) backed by the Supabase `articles` table and fallbacks when Supabase is disabled. MDX is compiled via `getMdxContent` and rendered with `RenderContent` + article components.
- `/projects`: mirrors `/articles` — index redirects to the most recently updated project that has a case-study MDX in Storage; if none exist it renders the “Archive not yet initialized.” empty state. The layout renders a sidebar grouped by month (from `groupProjectsByMonth`) and reader shell, reusing the articles UX.
- `/projects/[slug]`: RSC page with `revalidate = 300`; static params come from `fetchProjects`, and case studies are downloaded from Supabase Storage (`project-mdx/<projectId>/case-study.mdx`) via `fetchProjectCaseStudyBySlug` before running through the shared MDX renderer.
- `/admin`: `src/app/admin/page.tsx` uses `resolveAdminAuth` to validate env/session, then orchestrates `loadSections` (Promise.all), `resolveBucketStatus`, `loadCvMeta`, and `buildSummaryMetrics` to hydrate the dashboard with section states, bucket checks, CV metadata, metrics, warnings, and a correlation ID. UI lives in `src/features/admin/components/admin-dashboard.tsx`.
- `/api/*`: Route handlers reuse the same cached loaders as the pages (articles, projects, links, reel, contact, bio, currently, investments, CV) and set `Cache-Control` headers to mirror page TTLs. Admin mutations call `revalidateTag`/`revalidatePath` to keep pages and APIs coherent.
- Middleware/CSP: `middleware.ts` and `next.config.ts` apply CSP, HSTS, referrer, frame, and permissions policies and allowlist Supabase and MDX asset hosts.

## Admin Data Flow

1. `resolveAdminAuth` (`src/features/admin/app/admin-auth.ts`) builds the Supabase server client with env validation and returns `env-error`, `unauthenticated`, `forbidden`, or an authed session (fixture mode when `ADMIN_E2E_FIXTURE` or `SUPABASE_DISABLED_FOR_TESTS` are true). Correlation IDs are seeded from `x-request-id` or generated per request.
2. `loadSections` (`src/features/admin/app/section-loaders.ts`) orchestrates per-resource loaders (articles/projects/links/reel/investments/currently/contact/bio) with row caps (links 200; projects/articles 100; reel 200; investments 200). It yields `SectionState`s + warnings without throwing so the page can render degraded UIs.
3. `resolveBucketStatus` (`src/features/admin/app/bucket-status.ts`) verifies the `reel`, `cv`, and `project-mdx` buckets via `ensureBucket`, memoized for 5 minutes per bucket-name set; warnings surface missing/disabled buckets. `loadCvMeta` (`src/features/admin/app/cv-meta.ts`) fetches CV metadata with explicit null/error handling.
4. `buildSummaryMetrics` (`src/features/admin/app/summary-metrics.ts`) now derives success/warning tones per collection from presence/absence of data (green outline when count > 0, amber when empty). Meta strings surface “<Resource> Configured” vs “Not Configured”; investments/CV include date-only refreshed timestamps (no time component) when present. `loadDashboardData` composes the results, sets `degraded` flags, and can force fixture data when `x-force-admin-fallback: 1` or `ADMIN_E2E_FORCE_DEGRADED=true` is present.

## Content Pipeline (MDX Renderer)

- Articles/Writing: Supabase `articles` rows include `body_mdx`. `parseWritingMdx` (`src/lib/content/writing.ts`) uses `gray-matter` + a Zod schema to normalize frontmatter (title/subtitle/publishedAt/tags) and surface validation errors early. Compiled content flows through `getMdxContent` (`src/lib/mdx/render.tsx`), which runs `remark-gfm`, `rehype-prism-plus`, and `rehype-sanitize` with an extended schema before rendering with `RenderContent` + `articlesMdxComponents`.
- Projects: Case studies live in Supabase Storage bucket `NEXT_PUBLIC_SUPABASE_PROJECT_MDX_BUCKET` (default `project-mdx`) under `<projectId>/case-study.mdx`. `fetchProjectCaseStudyBySlug` downloads the file, pairs it with project metadata, and feeds the same MDX renderer.
- Both readers export `revalidate = 300` and rely on `unstable_cache` wrappers for fetchers so ISR and tag-based invalidation stay aligned.

## Caching Strategy (Summary)

- Public routes and APIs: 300s ISR/`Cache-Control` with `stale-while-revalidate=900` (investments use 600s/1800). `unstable_cache` keys are tagged (`articles`, `writing`, `projects`, `links`, `reel`, `contact`, `bio`, `currently`, `investments`) for targeted invalidation.
- Admin/auth/third-party fetches: `unstable_noStore` or `cache: 'no-store'` to avoid leaking session-bound data.
- Bucket verification: in-memory cache (5 minutes) around `ensureBucket` checks for `reel`/`cv` storage buckets; `clearBucketStatusCache` is exposed for tests.
- Invalidations: Admin mutations trigger `revalidateTag`/`revalidatePath` per resource so pages and APIs stay consistent.
- Assets: `next/image` host allowlist lives in `next.config.ts`; Supabase queries and storage listings apply row limits to avoid table scans.

## Resilience & Fallbacks

- If Supabase env is missing or `SUPABASE_DISABLED_FOR_TESTS=true`, article/project loaders fall back to static fixtures (`WRITING_FALLBACK`, `PROJECTS_FALLBACK`), and admin can run in fixture mode. Loader failures log correlation IDs and return degraded UIs with empty states instead of hard errors.
