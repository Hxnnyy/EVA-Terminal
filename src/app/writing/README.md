# Writing Route Caching

- `[slug]` pages use `revalidate = 300` (5 minutes) to lighten Supabase traffic while keeping content reasonably fresh.
- After updating a writing entry (via Supabase or fallback MDX), call `revalidatePath("/writing")` or `revalidatePath(\`/writing/${slug}\`)` to purge the cache early.
- Keep ISR windows aligned across any future writing routes or layouts; prefer short windows (≤5 minutes) only when content changes weekly or less.
- The Playwright smoke `tests/playwright/writing-cache-smoke.spec.ts` expects the second request to `/writing/<slug>` to return `x-nextjs-cache: HIT`; adjust the test if the caching window changes.
- API handlers under `src/app/api/writing` should mirror this policy; use `NextResponse.revalidate()` if you add mutations that must refresh cached pages.
