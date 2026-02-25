# AGENTS.md

## Cursor Cloud specific instructions

### Overview

ExportFlow is a Next.js 14 marketing website (App Router) for a planned B2B SaaS multi-tenant export trade platform. Currently only the marketing/landing site is implemented — no backend, database, or API routes exist yet.

### Services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Next.js dev server | `npm run dev` | 3000 | Only service needed |

### Standard commands

All standard commands are in `package.json` scripts:

- **Dev**: `npm run dev`
- **Lint**: `npm run lint`
- **Build**: `npm run build`
- **Start (prod)**: `npm start`

### Environment variables

Copy `.env.example` to `.env.local`. Both variables (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA4_ID`) are optional/non-blocking for local development.

### Key caveats

- The app uses `next-intl` for i18n with 6 locales (en, fr, es, zh, tr, id). The default route redirects to `/en`. Always test pages under a locale prefix (e.g., `http://localhost:3000/en`).
- Tailwind CSS v4 is used via `@tailwindcss/postcss` plugin — there is no traditional `tailwind.config.js` content array; config is in `tailwind.config.ts`.
- No database or Prisma setup is required at this stage. The Prisma schema exists only as documentation in `docs/PRISMA_SCHEMA.md`.
- No Docker, no external services needed.
