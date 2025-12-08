# Contributing to EVA Terminal

Thank you for your interest in contributing! This guide covers local setup, architecture, and technical details.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Running Tests](#running-tests)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Architecture Overview](#architecture-overview)
- [Environment Variables Reference](#environment-variables-reference)
- [Caching Strategy](#caching-strategy)
- [Security Headers](#security-headers)
- [Theming System](#theming-system)
- [Testing Strategy](#testing-strategy)
- [TypeScript Guidelines](#typescript-guidelines)

---

## Prerequisites

- Node.js 20.x or later (see `.nvmrc`)
- npm 10+
- Git
- Playwright browsers (for E2E): `npx playwright install chromium`

---

## Local Setup

### 1. Fork and clone

```bash
git clone https://github.com/YOUR_USERNAME/eva-terminal.git
cd eva-terminal
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

For local development without Supabase, set:

```
SUPABASE_DISABLED_FOR_TESTS=true
```

### 4. Start the dev server

```bash
npm run dev
```

---

## Running Tests

```bash
# Full quality gate (format, lint, typecheck, unit tests, E2E)
npm run check

# Just unit tests
npm run test

# Just E2E tests
npm run test:e2e

# E2E smoke tests (fast)
npm run test:e2e:smoke

# E2E with UI (watch mode)
npm run test:e2e:ui
```

### Test Environment Flags

| Flag                                     | Purpose                                         |
| ---------------------------------------- | ----------------------------------------------- |
| `SUPABASE_DISABLED_FOR_TESTS=true`       | Swap in fixture client instead of real Supabase |
| `ADMIN_E2E_FIXTURE=true`                 | Auto-auth as fixture admin during tests         |
| `SUPPRESS_ENV_VALIDATION_FOR_TESTS=true` | Skip env validation for isolated tests          |

> ⚠️ These flags are blocked in production via `prodDisallowedFlag` validators.

---

## Code Style

- **ESLint** and **Prettier** are enforced via pre-commit hooks (Husky + lint-staged)
- Run `npm run format:fix` to auto-format
- Run `npm run lint -- --fix` to fix lint issues
- `skipLibCheck` is disabled — run `npm run typecheck` after adding/upgrading deps

---

## Pull Request Process

1. **Branch from `main`**: Use descriptive names like `feat/add-skip-link` or `fix/csp-form-action`
2. **Make focused commits**: Each commit should represent a logical change
3. **Run `npm run check`**: Ensure all tests pass before pushing
4. **Open a PR**: Describe what you changed and why
5. **Address feedback**: Respond to review comments promptly

### What We're Looking For

- Bug fixes with test coverage
- Accessibility improvements
- Performance optimizations
- Documentation improvements
- New features that align with the terminal-first aesthetic

### What to Avoid

- Breaking changes without discussion
- Large refactors without prior approval
- Adding heavy dependencies
- Changes that reduce test coverage

---

## Architecture Overview

```
src/
├── app/                    # Next.js App Router
│   ├── (site)/             # Public site routes
│   ├── admin/              # Admin panel
│   ├── api/                # API routes
│   └── globals.css         # Global styles
├── components/             # Shared UI components
├── features/
│   ├── admin/              # Admin panel feature
│   └── terminal/           # Terminal UI feature
├── lib/
│   ├── auth/               # Admin auth helpers
│   ├── env.ts              # Public env validation (Zod)
│   ├── env.server.ts       # Server env validation
│   ├── fallbacks/          # Static fallback data
│   ├── mdx/                # MDX rendering
│   ├── schemas.ts          # API payload schemas (Zod)
│   ├── security/           # CSP, headers, bypass logic
│   ├── supabase/           # Supabase clients & helpers
│   └── theme/              # Theme manifest & CSS builder
└── middleware.ts           # Auth guards, CSP, request IDs
```

### Key Patterns

- **Server/Client separation**: `'use client'` only where needed; heavy logic stays server-side
- **Route groups**: `(site)` isolates public layout from admin
- **Feature modules**: Co-located components, hooks, types, and tests
- **Zod everywhere**: Runtime validation at API boundaries, env vars, and form inputs

---

## Environment Variables Reference

### Required (for real Supabase data)

| Variable                        | Description              |
| ------------------------------- | ------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `NEXT_PUBLIC_SITE_URL`          | Your site's public URL   |

### Optional Features

| Variable                             | Description                          |
| ------------------------------------ | ------------------------------------ |
| `SUPABASE_SERVICE_ROLE`              | Service role key for admin writes    |
| `ALPHAVANTAGE_API_KEY`               | For investment price fetching        |
| `ALPHAVANTAGE_ENDPOINT`              | Custom AlphaVantage endpoint         |
| `CRON_SECRET`                        | Secret for Vercel Cron job auth      |
| `INVESTMENTS_FETCH_ENABLED`          | Enable/disable investment fetching   |
| `INVESTMENTS_REFRESH_INTERVAL_HOURS` | Price refresh interval (default: 24) |

### Storage Buckets

| Variable                                  | Default       |
| ----------------------------------------- | ------------- |
| `NEXT_PUBLIC_SUPABASE_REEL_BUCKET`        | `reel`        |
| `NEXT_PUBLIC_SUPABASE_CV_BUCKET`          | `cv`          |
| `NEXT_PUBLIC_SUPABASE_PROJECT_MDX_BUCKET` | `project-mdx` |

### CV Fallbacks

| Variable                   | Description               |
| -------------------------- | ------------------------- |
| `CV_FALLBACK_URL`          | Public URL to fallback CV |
| `CV_FALLBACK_FILE_NAME`    | Display filename          |
| `CV_FALLBACK_LAST_UPDATED` | ISO date string           |
| `CV_FALLBACK_SIZE_BYTES`   | File size                 |
| `CV_FALLBACK_CHECKSUM`     | SHA256 checksum           |

---

## Caching Strategy

See [docs/caching.md](docs/caching.md) for the full policy.

### Summary

| Resource    | TTL      | Tags                  |
| ----------- | -------- | --------------------- |
| Articles    | 300s     | `articles`, `writing` |
| Projects    | 300s     | `projects`            |
| Links       | 300s     | `links`               |
| Investments | 600s     | `investments`         |
| Admin/auth  | no-store | —                     |

### Patterns

- Public reads: `unstable_cache(fn, key, { revalidate, tags })`
- Admin mutations: `revalidateTag()` + `revalidatePath()`
- Auth/secrets: `cache: 'no-store'`

---

## Security Headers

Middleware (`src/middleware.ts`) applies:

- **CSP with nonces**: `strict-dynamic` in production, `unsafe-inline` in dev for HMR
- **Request IDs**: `x-request-id` header for correlation
- **No-store for admin**: auth routes never cached

### CSP Sources

- `script-src`: `'self'`, nonce, `'strict-dynamic'` (prod)
- `connect-src`: `'self'`, Supabase REST/realtime, AlphaVantage (if configured)
- `frame-ancestors`: `'self'`

See `src/lib/security/csp.ts` for implementation.

---

## Theming System

### Source of Truth

`src/lib/theme/theme-manifest.ts` — defines all theme palettes.

### How It Works

1. `buildThemeCss()` generates `.theme-<id>` CSS classes
2. `<ThemeStyleTag>` injects them during SSR
3. Terminal commands (`/eva01`, etc.) toggle `theme-*` class on `<body>`
4. Active theme persists in `localStorage`

### Adding a Theme

1. Duplicate an entry in `theme-manifest.ts`
2. Update CSS variables (use `r, g, b` triples for `--*-rgb` tokens)
3. Run `npm run build` to verify
4. Test with `npm run test:e2e` (theme-switch spec)

---

## Testing Strategy

### Unit Tests (Vitest)

- Location: `tests/unit/`
- Coverage: env validation, schemas, helpers, MDX rendering
- Run: `npm run test`

### E2E Tests (Playwright)

- Location: `tests/playwright/`
- Coverage: auth guards, CRUD flows, terminal commands, themes
- Run: `npm run test:e2e`

### Fixture System

When `SUPABASE_DISABLED_FOR_TESTS=true`:

- `server-client.ts` returns a mock `FixtureSupabaseClient`
- In-memory `FixtureQueryBuilder` simulates Supabase operations
- `ADMIN_E2E_FIXTURE=true` auto-auths as fixture admin

---

## TypeScript Guidelines

- `skipLibCheck: false` — catches breaking changes in dependencies
- Prefer Zod schemas with `z.infer<>` for API types
- Use discriminated unions for results (e.g., `AdminGuardResult`)
- No `any` — use `unknown` and narrow
- Module augmentations in `src/types/` for incomplete library types

---

## Scripts Reference

| Command                         | Description              |
| ------------------------------- | ------------------------ |
| `npm run dev`                   | Start Next.js locally    |
| `npm run build`                 | Production build         |
| `npm run start`                 | Start production server  |
| `npm run lint`                  | ESLint                   |
| `npm run typecheck`             | TypeScript no-emit check |
| `npm run format` / `format:fix` | Prettier check/fix       |
| `npm run check`                 | Full quality gate        |
| `npm run test`                  | Vitest unit tests        |
| `npm run test:e2e`              | Playwright E2E           |
| `npm run test:e2e:smoke`        | Playwright smoke tests   |
| `npm run test:e2e:ui`           | Playwright UI mode       |
| `npm run storage:check`         | Verify Supabase buckets  |
| `npm run db:seed`               | Seed example content     |

### Git Hooks

Husky pre-commit runs `lint-staged`:

- `npm run lint -- --fix`
- `npm run format:fix --`

Set `HUSKY=0` to bypass locally.

### Local Runtime Artifacts

Dev runs may leave `server.pid`, `devlog*.txt`, `play-*.log` — these are git-ignored.

---

## Boot Sequence

The animated boot sequence:

1. Black screen with cursor
2. Pre-typed "INITIALISING MAGI SYSTEM" stream
3. NERV ASCII logo
4. Gold ready line
5. Fade to terminal

Implementation: `src/features/terminal/lib/boot.ts`

---

## Investments Refresh

`/api/investments` is read-only (cached 10 min).

Prices are refreshed automatically via **Vercel Cron** at 4am CET daily. To force a manual refresh:

```bash
POST /api/admin/investments/refresh
```

Requires admin auth. Returns fresh data and revalidates caches.

---

## Questions?

Open an issue or start a discussion. We're happy to help!
