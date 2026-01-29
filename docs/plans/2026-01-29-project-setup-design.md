# Rafin Project Setup Design

**Date:** 2026-01-29
**Status:** Approved

---

## 1. Overview

Rafin is a self-hosted home library tracking system. Users can digitize their physical book collections, track book locations within their home, and manage reading progress.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Backend | ElysiaJS |
| Frontend | Next.js (App Router) |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Auth | Better-Auth (database sessions) |
| Monorepo | Turborepo |
| Linting | Biome |
| Dead Code | knip |
| Testing | bun:test |

---

## 2. Project Structure

```
rafin/
├── apps/
│   ├── web/                 # Next.js App Router
│   └── api/                 # ElysiaJS Backend
├── packages/
│   ├── db/                  # Drizzle schema + client
│   ├── shared/              # Zod schemas, types, utils
│   └── ui/                  # Shared React components
├── docker-compose.yml       # PostgreSQL
├── turbo.json
├── biome.json
├── knip.json
├── package.json
└── .env.example
```

---

## 3. Package Dependencies

### apps/api
```
dependencies: @rafin/db, @rafin/shared, elysia, better-auth
```

### apps/web
```
dependencies: @rafin/shared, @rafin/ui, next, @tanstack/react-query, @tanstack/react-form
devDependencies: @rafin/api (Eden type imports only)
```

### packages/db
```
dependencies: drizzle-orm, postgres
```

### packages/shared
```
dependencies: zod
```

---

## 4. Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `users` | Better-Auth user table |
| `sessions` | Better-Auth session table |
| `accounts` | Better-Auth account table |
| `locations` | Self-referencing (parent_id), type: room/furniture/shelf |
| `books` | ISBN, title, author, cover_path, purchase_price, location_id |
| `user_books` | user_id, book_id, status, current_page, started_at, finished_at |
| `quotes` | user_book_id, content, page_number, is_private |
| `reviews` | user_book_id, rating (1-5), content, is_private |

### Schema Files

```
packages/db/src/schema/
├── auth.ts          # Better-Auth tables
├── locations.ts     # Location hierarchy
├── books.ts         # Book inventory
├── user-books.ts    # User-Book relations
└── index.ts         # All exports
```

### Key Rules

- All tables have `created_at` and `updated_at` timestamps
- `books.location_id` → `locations.id` (one book, one location)
- `user_books` → composite unique (user_id + book_id)
- `books` uses soft delete (deleted_at)
- ID strategy: Serial (integer) for readable URLs

---

## 5. API Routes (apps/api)

### Structure

```
apps/api/src/
├── routes/
│   ├── auth.ts          # .all("/auth/*", betterAuth.handler)
│   ├── books.ts         # CRUD + ISBN lookup
│   ├── locations.ts     # Location hierarchy CRUD
│   ├── user-books.ts    # Reading status, progress
│   ├── quotes.ts        # Quotes management
│   ├── reviews.ts       # Reviews management
│   ├── stats.ts         # Dashboard metrics
│   └── upload.ts        # Cover image upload
├── services/
│   ├── isbn.ts          # Google Books / Open Library client
│   └── image.ts         # Download & resize cover images
├── middleware/
│   └── auth.ts          # Better-Auth session guard
└── index.ts             # Elysia app + route registration
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| ALL | `/auth/*` | Better-Auth handlers |
| GET | `/books` | List (filter, pagination) |
| POST | `/books` | Create book |
| GET | `/books/isbn/:isbn` | Fetch from external service |
| PATCH | `/books/:id` | Update book |
| DELETE | `/books/:id` | Soft delete |
| GET | `/locations` | Tree structure |
| POST | `/locations` | Create location |
| GET | `/user-books` | User's reading list |
| POST | `/user-books/:bookId` | Add to list |
| PATCH | `/user-books/:bookId` | Update status/page |
| GET | `/stats/overview` | Total books, pages, value |
| GET | `/stats/reading` | Current month stats |
| GET | `/stats/yearly/:year` | Yearly summary |

### Validation Example

```typescript
.post('/', ({ body }) => bookService.create(body), {
  body: t.Object({
    isbn: t.Optional(t.String()),
    title: t.String({ minLength: 1 }),
    author: t.String(),
    locationId: t.Optional(t.Integer()),
    purchasePrice: t.Optional(t.Number()),
  })
})
```

---

## 6. Frontend Structure (apps/web)

### Structure

```
apps/web/
├── middleware.ts              # Auth + locale detection
├── i18n/
│   ├── request.ts             # next-intl server config
│   └── routing.ts             # locale config
├── messages/
│   ├── en.json                # English (default)
│   └── tr.json                # Turkish
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx         # Sidebar + header
│   │   ├── page.tsx           # Home (stats)
│   │   ├── books/
│   │   │   ├── page.tsx       # Book list
│   │   │   ├── [id]/page.tsx  # Book detail
│   │   │   └── new/page.tsx   # Add book
│   │   ├── locations/
│   │   │   └── page.tsx       # Location management
│   │   ├── reading/
│   │   │   └── page.tsx       # My reading list
│   │   └── settings/
│   │       └── page.tsx       # Profile, theme, language
│   └── layout.tsx             # Root layout
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── books/                 # Book card, form
│   ├── locations/             # Location tree, selector
│   └── layout/                # Navbar, sidebar
├── lib/
│   ├── api.ts                 # Eden Treaty client
│   └── queries.ts             # Tanstack Query hooks
└── next.config.ts
```

### i18n Configuration

```typescript
// i18n/routing.ts
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'tr'],
  defaultLocale: 'en',
  localePrefix: 'never'  // No locale in URL
})
```

**Language detection order:**
1. Cookie (`NEXT_LOCALE`)
2. `Accept-Language` header
3. Default: `en`

### Route Groups

- `(auth)` → Login/register, no sidebar
- `(dashboard)` → Auth guard, sidebar layout

---

## 7. Docker Setup

### docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: rafin-db
    environment:
      POSTGRES_USER: rafin
      POSTGRES_PASSWORD: rafin_dev
      POSTGRES_DB: rafin
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## 8. Environment Variables

Single `.env` file at root, injected via Turborepo.

```
# Database
DATABASE_URL=postgresql://rafin:rafin_dev@localhost:5432/rafin

# API
API_PORT=3001

# Web
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### turbo.json globalEnv

```json
{
  "globalEnv": ["DATABASE_URL", "API_PORT", "NEXT_PUBLIC_API_URL"]
}
```

---

## 9. Scripts (root package.json)

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "db:generate": "turbo run db:generate --filter=@rafin/db",
    "db:migrate": "turbo run db:migrate --filter=@rafin/db",
    "db:studio": "turbo run db:studio --filter=@rafin/db",
    "test": "turbo run test",
    "clean": "turbo run clean && rm -rf node_modules",
    "knip": "knip"
  }
}
```

---

## 10. Tooling Configuration

### biome.json

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": { "quoteStyle": "single", "semicolons": "asNeeded" }
  }
}
```

### knip.json

```json
{
  "workspaces": {
    "apps/api": { "entry": ["src/index.ts"] },
    "apps/web": { "entry": ["app/**/*.tsx", "middleware.ts"] },
    "packages/db": { "entry": ["src/index.ts"] },
    "packages/shared": { "entry": ["src/index.ts"] },
    "packages/ui": { "entry": ["src/index.ts"] }
  },
  "ignoreDependencies": ["@types/*"]
}
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalEnv": ["DATABASE_URL", "API_PORT", "NEXT_PUBLIC_API_URL"],
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "lint": {},
    "test": {},
    "db:generate": { "cache": false },
    "db:migrate": { "cache": false },
    "db:studio": { "cache": false, "persistent": true },
    "clean": { "cache": false }
  }
}
```

---

## 11. Development Workflow

### Initial Setup

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Install dependencies
bun install

# 3. Run migrations
bun run db:migrate

# 4. Start development
bun run dev
```

### Daily Development

```bash
# Start everything
docker compose up -d && bun run dev

# Run linter
bun run lint

# Check unused code
bun run knip

# Run tests
bun run test

# Open Drizzle Studio
bun run db:studio
```

---

## 12. Image Handling

- Cover images stored in `apps/api/uploads/`
- Served via Elysia static plugin
- Frontend references: `${API_URL}/uploads/${book.coverPath}`
- No `public/uploads` in web app (avoids Docker volume complexity)

---

## 13. Key Decisions Summary

| Topic | Decision |
|-------|----------|
| Frontend | Next.js App Router |
| Backend | Bun + ElysiaJS |
| Monorepo | Turborepo (apps/ + packages/) |
| Database | PostgreSQL (docker-compose) |
| ORM | Drizzle ORM |
| Auth | Better-Auth (database sessions) |
| API Client | Eden Treaty + Tanstack Query |
| Forms | Tanstack Form + Zod |
| UI | Tailwind CSS + shadcn/ui |
| i18n | next-intl (cookie-based, hidden URL) |
| Linting | Biome |
| Dead code | knip |
| Test | bun:test |
| ID strategy | Serial (integer) |
| Image storage | Local filesystem (API serves) |
| Default language | English (+ Turkish) |
