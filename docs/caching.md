# Caching & Performance

## Defaults

- Public Supabase + API reads: 300s ISR with `Cache-Control: public, max-age=300, stale-while-revalidate=900` (routes and loaders mirror each other).
- Investments: 600s ISR with `s-maxage=600, stale-while-revalidate=60`. Refreshed daily at 4am CET via Vercel Cron.
- Admin/auth/third-party fetches (AlphaVantage, Stooq, signed URLs) stay `unstable_noStore`/`cache: 'no-store'`; never cache cookie-bound or secret-bearing responses.
- Invalidation: admin mutations trigger `revalidateTag` for affected resources plus `revalidatePath` for the matching API endpoint. No `revalidate = 0` usages remain.
- Storage bucket verification results are memoized for 5 minutes per runtime to avoid repeated `listBuckets` calls while keeping recoverability reasonable.

## Cache & Tag Map

| Resource                   | TTL (s) | Tags                      | Cached via                                            | Invalidated by                                                                                                                      |
| -------------------------- | ------- | ------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Articles (list/detail)     | 300     | `articles`, `writing`     | `unstable_cache` loaders + page ISR + `/api/writing`  | `revalidateTag('articles')`, `revalidateTag('writing')`, `revalidatePath('/api/writing')`, slug revalidate                          |
| Projects (list/case study) | 300     | `projects`                | `unstable_cache` loaders + page ISR + `/api/projects` | `revalidateTag('projects')`, `revalidatePath('/api/projects')`                                                                      |
| Links                      | 300     | `links`                   | `unstable_cache` + `/api/links` headers               | `revalidateTag('links')`, `revalidatePath('/api/links')`                                                                            |
| Reel images                | 300     | `reel`                    | `unstable_cache` + `/api/reel` headers                | `revalidateTag('reel')`, `revalidatePath('/api/reel')`                                                                              |
| Contact                    | 300     | `contact`, `singletons`   | `unstable_cache` + `/api/contact` headers             | `revalidateTag('contact')`, `revalidateTag('singletons')`, `revalidatePath('/api/contact')`                                         |
| Bio                        | 300     | `bio`, `singletons`       | `unstable_cache` + `/api/bio` headers                 | `revalidateTag('bio')`, `revalidateTag('singletons')`, `revalidatePath('/api/bio')`                                                 |
| Currently                  | 300     | `currently`, `singletons` | `unstable_cache` + `/api/currently` headers           | `revalidateTag('currently')`, `revalidateTag('singletons')`, `revalidatePath('/api/currently')`                                     |
| Onepager                   | 300     | `onepager`, `singletons`  | `unstable_cache` loader                               | `revalidateTag('onepager')`, `revalidateTag('singletons')`                                                                          |
| CV metadata                | 300     | `cv`                      | Route ISR + `/api/cv` headers                         | `revalidateTag('cv')`, `revalidatePath('/api/cv')`                                                                                  |
| Investments                | 600     | `investments`             | `unstable_cache` loader + `/api/investments` headers  | `revalidateTag('investments')`, `revalidatePath('/api/investments')`; refresh via POST `/api/admin/investments/refresh` (auth only) |

## Patterns

- **Loaders/server utilities:** wrap public Supabase reads with `unstable_cache(fn, key, { revalidate, tags })`; reuse the cached loader in API routes so tag invalidation propagates everywhere.
- **Route handlers:** export the same `revalidate` value as the loader and mirror headers with `stale-while-revalidate` set to 3× the ISR window.
- **Mutations:** admin writes call `revalidateTag`/`revalidatePath` for articles, writing detail pages, projects, links, reel, investments, contact/bio/currently singletons, and CV metadata.
- **No-store rules:** admin dashboard loaders, auth guards, service-role storage checks, signed URLs, and external price fetchers all opt into `unstable_noStore`/`cache: 'no-store'` to avoid leaking session or secret-bound responses.
- **Supabase safety:** collection queries cap results (links 200, projects 100, articles 100, reel 200, investments 200) to prevent full-table scans in admin views.
- **Storage buckets:** `ensureStorageBuckets` memoizes results for 5 minutes to keep service-role `listBuckets` costs low; admin can refresh by waiting for the TTL or redeploying.

## Assets & Motion

- MDX and local assets prefer `next/image` when width/height are provided; external hosts are allowlisted in `next.config.ts`, and `<img>` only appears as a fallback when optimization isn’t possible.
- Terminal decor/animation is lazy-loaded (`requestIdleCallback`) and skipped entirely when `prefers-reduced-motion` or the theme’s reduce-motion flag is active. Boot warmups run in the background and never block paint.
- First Load JS target: ≤120 kB shared; defer non-essential motion and idle warmups to keep TTI snappy for portfolio traffic.
