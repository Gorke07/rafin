# CLAUDE.md - Rafin

Self-hosted home library tracking system. Monorepo built with Bun, Turborepo, ElysiaJS, Next.js 15, and Drizzle ORM.

## Quick Reference

```bash
# Start all services (DB + API + Web)
docker compose up -d          # PostgreSQL on port 5433
bun install                   # Install dependencies
bun run db:push               # Push schema to DB
bun run dev                   # Start API (3001) + Web (3000)

# Database commands
bun run db:generate            # Generate migrations from schema
bun run db:migrate             # Run migrations
bun run db:studio              # Open Drizzle Studio
bun run db:reset               # Reset database

# Code quality
bun run lint                   # Biome lint
bun run format                 # Biome format
bun run typecheck              # TypeScript strict check
```

## Architecture

```
apps/
  api/          → ElysiaJS backend (Bun runtime, port 3001)
  web/          → Next.js 15 frontend (App Router, port 3000)
packages/
  db/           → Drizzle ORM schema, client, migrations (@rafin/db)
  shared/       → Zod validators and shared types (@rafin/shared)
  ui/           → Reusable UI components (@rafin/ui)
```

## Tech Stack

- **Runtime:** Bun 1.3.5
- **Backend:** ElysiaJS 1.2 + Better-Auth (session-based)
- **Frontend:** Next.js 15 + React 19 + TanStack Query/Form + shadcn/ui + Tailwind CSS
- **Database:** PostgreSQL 18 via Drizzle ORM 0.45
- **API Client:** @elysiajs/eden (type-safe RPC)
- **i18n:** next-intl (English + Turkish)
- **Linting:** Biome (single quotes, no semicolons, 100-char width)

## Code Style

- Biome enforces formatting: single quotes, no semicolons, 100-char line width
- Unused imports are errors
- TypeScript strict mode across all packages
- Shared validators in `packages/shared/src/validators/`

## Database Schema

Key tables: `books`, `locations` (hierarchical: room → furniture → shelf), `user_books` (reading status), `quotes`, `reviews`, `categories`, `collections` (manual + smart). Auth tables managed by Better-Auth (`user`, `session`, `account`, `verification`). Books use soft deletes (`deletedAt`).

## API Structure

Routes in `apps/api/src/routes/`: `books`, `book-lookup` (ISBN via Google Books, Open Library, Turkish scrapers), `book-notes`, `user-books`, `locations`, `collections`, `categories`, `stats`, `setup`, `upload`. Auth middleware extracts session in `apps/api/src/middleware/auth.ts`.

## Frontend Structure

Next.js App Router with route groups: `(auth)/` for login/register, `dashboard/` for protected routes. Components in `apps/web/components/`. SetupGuard protects routes until initial setup completes. Translations in `apps/web/messages/{en,tr}.json`.

## Environment Variables

See `.env.example`. Key vars: `DATABASE_URL`, `API_PORT`, `API_HOST`, `NEXT_PUBLIC_API_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.

## No Testing Framework Yet

Testing infrastructure has not been set up. No test files exist.
