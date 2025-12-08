# Tests & Data Setup

- **Defaults (fast + offline):** Playwright config sets `SUPABASE_DISABLED_FOR_TESTS=true` and `ADMIN_E2E_FIXTURE=true`, so E2E runs use fixture data and do not talk to Supabase. No database is required for the smoke/full suites in CI.
- **Real Supabase runs:** Set `SUPABASE_DISABLED_FOR_TESTS=false`, `ADMIN_E2E_FIXTURE=false`, and provide `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE`. Seed data with `npm run db:seed` before executing `npm run test:e2e` to keep CRUD specs reproducible.
- **Admin auth credentials:** `ADMIN_EMAIL` / `ADMIN_PASSWORD` and optional `NON_ADMIN_EMAIL` / `NON_ADMIN_PASSWORD` drive the guarded admin specs when fixture mode is off.
- **Forced fallback checks:** The `admin-error-banner.spec.ts` suite sends the `x-force-admin-fallback: 1` header to trigger the admin fallback banner without touching Supabase. You can also set `ADMIN_E2E_FORCE_DEGRADED=true` when running the dev server to observe the same state manually.
- **Flake controls:** Supabase-authenticated Playwright suites (`admin-dashboard.spec.ts`, `admin-guard.spec.ts`) declare explicit timeouts/retries; keep them when adjusting tests that hit live Supabase.

Common commands:

```
npm run test            # Vitest unit/UI
npm run test:e2e:smoke  # Playwright smoke
npm run test:e2e        # Full Playwright (uses fixture mode by default)
```
