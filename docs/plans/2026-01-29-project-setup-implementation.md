# Rafin Project Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bootstrap a complete Turborepo monorepo with Bun, ElysiaJS API, Next.js frontend, PostgreSQL database, and all configured tooling.

**Architecture:** Monorepo structure with `apps/` for deployable applications (api, web) and `packages/` for shared code (db, shared, ui). Turborepo orchestrates builds, Biome handles linting/formatting, and knip detects dead code.

**Tech Stack:** Bun runtime, Turborepo, ElysiaJS, Next.js App Router, Drizzle ORM, PostgreSQL, Better-Auth, Eden Treaty, Tanstack Query/Form, shadcn/ui, next-intl, Biome, knip

---

## Task 1: Initialize Git Repository

**Files:**
- Create: `.gitignore`
- Create: `README.md`

**Step 1: Initialize git**

Run:
```bash
cd /home/kmadmin/rafin
git init
```

Expected: `Initialized empty Git repository`

**Step 2: Create .gitignore**

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
.next/
.turbo/
out/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Database
postgres_data/

# Uploads
apps/api/uploads/*
!apps/api/uploads/.gitkeep

# Testing
coverage/

# Misc
*.tsbuildinfo
```

**Step 3: Create README.md**

```markdown
# Rafin

Self-hosted home library tracking system.

## Development

```bash
# Start PostgreSQL
docker compose up -d

# Install dependencies
bun install

# Run migrations
bun run db:migrate

# Start development
bun run dev
```

## Tech Stack

- **Runtime:** Bun
- **Backend:** ElysiaJS
- **Frontend:** Next.js (App Router)
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Better-Auth
```

**Step 4: Commit**

Run:
```bash
git add .gitignore README.md
git commit -m "chore: initialize git repository"
```

Expected: Commit created successfully

---

## Task 2: Create Root Package Configuration

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `docker-compose.yml`

**Step 1: Create root package.json**

```json
{
  "name": "rafin",
  "private": true,
  "packageManager": "bun@1.2.0",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "db:generate": "turbo run db:generate --filter=@rafin/db",
    "db:migrate": "turbo run db:migrate --filter=@rafin/db",
    "db:push": "turbo run db:push --filter=@rafin/db",
    "db:studio": "turbo run db:studio --filter=@rafin/db",
    "test": "turbo run test",
    "clean": "turbo run clean && rm -rf node_modules",
    "knip": "knip",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "knip": "^5.40.0",
    "turbo": "^2.3.0",
    "typescript": "^5.7.0"
  }
}
```

**Step 2: Create .env.example**

```bash
# Database
DATABASE_URL=postgresql://rafin:rafin_dev@localhost:5432/rafin

# API
API_PORT=3001
API_HOST=localhost

# Web
NEXT_PUBLIC_API_URL=http://localhost:3001

# Auth
BETTER_AUTH_SECRET=your-secret-key-change-in-production
BETTER_AUTH_URL=http://localhost:3001
```

**Step 3: Create docker-compose.yml**

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
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U rafin -d rafin"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

**Step 4: Copy .env.example to .env**

Run:
```bash
cp .env.example .env
```

**Step 5: Commit**

Run:
```bash
git add package.json .env.example docker-compose.yml
git commit -m "chore: add root package.json and docker-compose"
```

---

## Task 3: Configure Turborepo

**Files:**
- Create: `turbo.json`

**Step 1: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalEnv": [
    "DATABASE_URL",
    "API_PORT",
    "API_HOST",
    "NEXT_PUBLIC_API_URL",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL"
  ],
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^test"]
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    },
    "db:push": {
      "cache": false
    },
    "db:studio": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

**Step 2: Commit**

Run:
```bash
git add turbo.json
git commit -m "chore: configure turborepo"
```

---

## Task 4: Configure Biome

**Files:**
- Create: `biome.json`

**Step 1: Create biome.json**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedImports": "error",
        "noUnusedVariables": "warn"
      },
      "style": {
        "noNonNullAssertion": "off"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded"
    }
  },
  "files": {
    "ignore": [
      "node_modules",
      ".next",
      "dist",
      ".turbo",
      "*.json"
    ]
  }
}
```

**Step 2: Commit**

Run:
```bash
git add biome.json
git commit -m "chore: configure biome linter and formatter"
```

---

## Task 5: Configure knip

**Files:**
- Create: `knip.json`

**Step 1: Create knip.json**

```json
{
  "workspaces": {
    "apps/api": {
      "entry": ["src/index.ts"],
      "project": ["src/**/*.ts"]
    },
    "apps/web": {
      "entry": ["app/**/*.tsx", "app/**/*.ts", "middleware.ts"],
      "project": ["**/*.ts", "**/*.tsx"]
    },
    "packages/db": {
      "entry": ["src/index.ts"],
      "project": ["src/**/*.ts"]
    },
    "packages/shared": {
      "entry": ["src/index.ts"],
      "project": ["src/**/*.ts"]
    },
    "packages/ui": {
      "entry": ["src/index.ts", "src/index.tsx"],
      "project": ["src/**/*.ts", "src/**/*.tsx"]
    }
  },
  "ignoreDependencies": [
    "@types/*",
    "tailwindcss",
    "postcss",
    "autoprefixer"
  ],
  "ignoreWorkspaces": []
}
```

**Step 2: Commit**

Run:
```bash
git add knip.json
git commit -m "chore: configure knip for dead code detection"
```

---

## Task 6: Create TypeScript Base Configuration

**Files:**
- Create: `tsconfig.json`

**Step 1: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true
  },
  "exclude": ["node_modules", "dist", ".next", ".turbo"]
}
```

**Step 2: Commit**

Run:
```bash
git add tsconfig.json
git commit -m "chore: add base typescript configuration"
```

---

## Task 7: Create packages/db Package

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/drizzle.config.ts`
- Create: `packages/db/src/index.ts`
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/schema/index.ts`

**Step 1: Create directory structure**

Run:
```bash
mkdir -p packages/db/src/schema
```

**Step 2: Create packages/db/package.json**

```json
{
  "name": "@rafin/db",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./client": {
      "types": "./src/client.ts",
      "default": "./src/client.ts"
    },
    "./schema": {
      "types": "./src/schema/index.ts",
      "default": "./src/schema/index.ts"
    }
  },
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "drizzle-orm": "^0.38.0",
    "postgres": "^3.4.5"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.0",
    "dotenv": "^16.4.0"
  }
}
```

**Step 3: Create packages/db/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create packages/db/drizzle.config.ts**

```typescript
import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './src/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
})
```

**Step 5: Create packages/db/src/client.ts**

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!

const client = postgres(connectionString)

export const db = drizzle(client, { schema })

export type Database = typeof db
```

**Step 6: Create packages/db/src/schema/index.ts**

```typescript
// Auth tables will be added in Task 8
// Domain tables will be added in later tasks

export {}
```

**Step 7: Create packages/db/src/index.ts**

```typescript
export * from './client'
export * from './schema'
```

**Step 8: Commit**

Run:
```bash
git add packages/db
git commit -m "feat: create @rafin/db package with drizzle setup"
```

---

## Task 8: Add Better-Auth Schema to packages/db

**Files:**
- Create: `packages/db/src/schema/auth.ts`
- Modify: `packages/db/src/schema/index.ts`

**Step 1: Create packages/db/src/schema/auth.ts**

```typescript
import { pgTable, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
})

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

**Step 2: Update packages/db/src/schema/index.ts**

```typescript
export * from './auth'
```

**Step 3: Commit**

Run:
```bash
git add packages/db/src/schema
git commit -m "feat: add better-auth schema tables"
```

---

## Task 9: Add Domain Schema to packages/db

**Files:**
- Create: `packages/db/src/schema/locations.ts`
- Create: `packages/db/src/schema/books.ts`
- Create: `packages/db/src/schema/user-books.ts`
- Modify: `packages/db/src/schema/index.ts`

**Step 1: Create packages/db/src/schema/locations.ts**

```typescript
import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const locationType = ['room', 'furniture', 'shelf'] as const

export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: locationType }).notNull(),
  parentId: integer('parent_id').references((): any => locations.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const locationsRelations = relations(locations, ({ one, many }) => ({
  parent: one(locations, {
    fields: [locations.parentId],
    references: [locations.id],
    relationName: 'locationHierarchy',
  }),
  children: many(locations, { relationName: 'locationHierarchy' }),
}))
```

**Step 2: Create packages/db/src/schema/books.ts**

```typescript
import { pgTable, serial, text, integer, numeric, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { locations } from './locations'

export const books = pgTable('books', {
  id: serial('id').primaryKey(),
  isbn: text('isbn'),
  title: text('title').notNull(),
  author: text('author').notNull(),
  publisher: text('publisher'),
  publishedYear: integer('published_year'),
  pageCount: integer('page_count'),
  coverPath: text('cover_path'),
  translator: text('translator'),
  purchaseDate: timestamp('purchase_date'),
  purchasePrice: numeric('purchase_price', { precision: 10, scale: 2 }),
  currency: text('currency').default('TRY'),
  store: text('store'),
  copyNote: text('copy_note'),
  locationId: integer('location_id').references(() => locations.id, { onDelete: 'set null' }),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const booksRelations = relations(books, ({ one }) => ({
  location: one(locations, {
    fields: [books.locationId],
    references: [locations.id],
  }),
}))
```

**Step 3: Create packages/db/src/schema/user-books.ts**

```typescript
import { pgTable, serial, text, integer, boolean, timestamp, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './auth'
import { books } from './books'

export const readingStatus = ['tbr', 'reading', 'completed', 'dnf'] as const

export const userBooks = pgTable(
  'user_books',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bookId: integer('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    status: text('status', { enum: readingStatus }).notNull().default('tbr'),
    currentPage: integer('current_page').default(0),
    startedAt: timestamp('started_at'),
    finishedAt: timestamp('finished_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [unique('user_book_unique').on(table.userId, table.bookId)]
)

export const userBooksRelations = relations(userBooks, ({ one }) => ({
  user: one(users, {
    fields: [userBooks.userId],
    references: [users.id],
  }),
  book: one(books, {
    fields: [userBooks.bookId],
    references: [books.id],
  }),
}))

export const quotes = pgTable('quotes', {
  id: serial('id').primaryKey(),
  userBookId: integer('user_book_id')
    .notNull()
    .references(() => userBooks.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  pageNumber: integer('page_number'),
  isPrivate: boolean('is_private').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const quotesRelations = relations(quotes, ({ one }) => ({
  userBook: one(userBooks, {
    fields: [quotes.userBookId],
    references: [userBooks.id],
  }),
}))

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  userBookId: integer('user_book_id')
    .notNull()
    .references(() => userBooks.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  content: text('content'),
  isPrivate: boolean('is_private').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const reviewsRelations = relations(reviews, ({ one }) => ({
  userBook: one(userBooks, {
    fields: [reviews.userBookId],
    references: [userBooks.id],
  }),
}))
```

**Step 4: Update packages/db/src/schema/index.ts**

```typescript
export * from './auth'
export * from './locations'
export * from './books'
export * from './user-books'
```

**Step 5: Commit**

Run:
```bash
git add packages/db/src/schema
git commit -m "feat: add domain schema (locations, books, user-books)"
```

---

## Task 10: Create packages/shared Package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/validators/index.ts`
- Create: `packages/shared/src/validators/book.ts`
- Create: `packages/shared/src/validators/location.ts`
- Create: `packages/shared/src/types/index.ts`

**Step 1: Create directory structure**

Run:
```bash
mkdir -p packages/shared/src/validators packages/shared/src/types
```

**Step 2: Create packages/shared/package.json**

```json
{
  "name": "@rafin/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./validators": {
      "types": "./src/validators/index.ts",
      "default": "./src/validators/index.ts"
    },
    "./types": {
      "types": "./src/types/index.ts",
      "default": "./src/types/index.ts"
    }
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.24.0"
  }
}
```

**Step 3: Create packages/shared/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create packages/shared/src/validators/book.ts**

```typescript
import { z } from 'zod'

export const createBookSchema = z.object({
  isbn: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  publisher: z.string().optional(),
  publishedYear: z.number().int().min(1000).max(2100).optional(),
  pageCount: z.number().int().positive().optional(),
  translator: z.string().optional(),
  purchaseDate: z.coerce.date().optional(),
  purchasePrice: z.number().positive().optional(),
  currency: z.string().default('TRY'),
  store: z.string().optional(),
  copyNote: z.string().optional(),
  locationId: z.number().int().positive().optional(),
})

export const updateBookSchema = createBookSchema.partial()

export const updateReadingStatusSchema = z.object({
  status: z.enum(['tbr', 'reading', 'completed', 'dnf']),
  currentPage: z.number().int().min(0).optional(),
})

export type CreateBookInput = z.infer<typeof createBookSchema>
export type UpdateBookInput = z.infer<typeof updateBookSchema>
export type UpdateReadingStatusInput = z.infer<typeof updateReadingStatusSchema>
```

**Step 5: Create packages/shared/src/validators/location.ts**

```typescript
import { z } from 'zod'

export const createLocationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['room', 'furniture', 'shelf']),
  parentId: z.number().int().positive().optional(),
})

export const updateLocationSchema = createLocationSchema.partial()

export type CreateLocationInput = z.infer<typeof createLocationSchema>
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>
```

**Step 6: Create packages/shared/src/validators/index.ts**

```typescript
export * from './book'
export * from './location'
```

**Step 7: Create packages/shared/src/types/index.ts**

```typescript
export type ReadingStatus = 'tbr' | 'reading' | 'completed' | 'dnf'

export type LocationType = 'room' | 'furniture' | 'shelf'

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
```

**Step 8: Create packages/shared/src/index.ts**

```typescript
export * from './validators'
export * from './types'
```

**Step 9: Commit**

Run:
```bash
git add packages/shared
git commit -m "feat: create @rafin/shared package with validators and types"
```

---

## Task 11: Create packages/ui Package (Empty Shell)

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/index.ts`

**Step 1: Create directory structure**

Run:
```bash
mkdir -p packages/ui/src
```

**Step 2: Create packages/ui/package.json**

```json
{
  "name": "@rafin/ui",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

**Step 3: Create packages/ui/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create packages/ui/src/index.ts**

```typescript
// Shared UI components will be added here as needed
export {}
```

**Step 5: Commit**

Run:
```bash
git add packages/ui
git commit -m "feat: create @rafin/ui package shell"
```

---

## Task 12: Create apps/api Package Structure

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/index.ts`

**Step 1: Create directory structure**

Run:
```bash
mkdir -p apps/api/src/routes apps/api/src/services apps/api/src/middleware apps/api/uploads
touch apps/api/uploads/.gitkeep
```

**Step 2: Create apps/api/package.json**

```json
{
  "name": "@rafin/api",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun run --hot src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target bun",
    "start": "bun run dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@elysiajs/cors": "^1.1.0",
    "@elysiajs/static": "^1.1.0",
    "@rafin/db": "workspace:*",
    "@rafin/shared": "workspace:*",
    "better-auth": "^1.2.0",
    "elysia": "^1.2.0"
  },
  "devDependencies": {
    "@types/bun": "^1.1.0"
  }
}
```

**Step 3: Create apps/api/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["bun-types"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create apps/api/src/index.ts**

```typescript
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'

const app = new Elysia()
  .use(
    cors({
      origin: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      credentials: true,
    })
  )
  .use(
    staticPlugin({
      assets: 'uploads',
      prefix: '/uploads',
    })
  )
  .get('/', () => ({ message: 'Rafin API is running' }))
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .listen(Number(process.env.API_PORT) || 3001)

console.log(`🦊 Rafin API is running at ${app.server?.hostname}:${app.server?.port}`)

export type App = typeof app
```

**Step 5: Commit**

Run:
```bash
git add apps/api
git commit -m "feat: create @rafin/api package with elysia setup"
```

---

## Task 13: Add Better-Auth to API

**Files:**
- Create: `apps/api/src/lib/auth.ts`
- Create: `apps/api/src/middleware/auth.ts`
- Modify: `apps/api/src/index.ts`

**Step 1: Create apps/api/src/lib/auth.ts**

```typescript
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@rafin/db/client'
import * as schema from '@rafin/db/schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
})
```

**Step 2: Create apps/api/src/middleware/auth.ts**

```typescript
import { Elysia } from 'elysia'
import { auth } from '../lib/auth'

export const authMiddleware = new Elysia({ name: 'auth-middleware' })
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers })
    return {
      user: session?.user ?? null,
      session: session?.session ?? null,
    }
  })
  .macro({
    requireAuth: () => ({
      async beforeHandle({ user, error }) {
        if (!user) {
          return error(401, { message: 'Unauthorized' })
        }
      },
    }),
  })
```

**Step 3: Update apps/api/src/index.ts**

```typescript
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'
import { auth } from './lib/auth'
import { authMiddleware } from './middleware/auth'

const app = new Elysia()
  .use(
    cors({
      origin: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )
  .use(
    staticPlugin({
      assets: 'uploads',
      prefix: '/uploads',
    })
  )
  .mount('/api/auth', auth.handler)
  .use(authMiddleware)
  .get('/', () => ({ message: 'Rafin API is running' }))
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .listen(Number(process.env.API_PORT) || 3001)

console.log(`🦊 Rafin API is running at ${app.server?.hostname}:${app.server?.port}`)

export type App = typeof app
```

**Step 4: Create lib directory**

Run:
```bash
mkdir -p apps/api/src/lib
```

**Step 5: Commit**

Run:
```bash
git add apps/api/src
git commit -m "feat: add better-auth integration to api"
```

---

## Task 14: Create apps/web Package Structure

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/components.json`

**Step 1: Create directory structure**

Run:
```bash
mkdir -p apps/web/app apps/web/components/ui apps/web/lib apps/web/i18n apps/web/messages
```

**Step 2: Create apps/web/package.json**

```json
{
  "name": "@rafin/web",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --turbopack --port 3000",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@rafin/shared": "workspace:*",
    "@rafin/ui": "workspace:*",
    "@tanstack/react-form": "^0.43.0",
    "@tanstack/react-query": "^5.62.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.468.0",
    "next": "^15.1.0",
    "next-intl": "^3.26.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^2.5.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@rafin/api": "workspace:*",
    "@elysiajs/eden": "^1.2.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16"
  }
}
```

**Step 3: Create apps/web/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "preserve",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    },
    "incremental": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", ".next"]
}
```

**Step 4: Create apps/web/next.config.ts**

```typescript
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  transpilePackages: ['@rafin/shared', '@rafin/ui'],
}

export default withNextIntl(nextConfig)
```

**Step 5: Create apps/web/tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss'
import tailwindAnimate from 'tailwindcss-animate'

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [tailwindAnimate],
} satisfies Config
```

**Step 6: Create apps/web/postcss.config.mjs**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Step 7: Create apps/web/components.json**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

**Step 8: Commit**

Run:
```bash
git add apps/web/package.json apps/web/tsconfig.json apps/web/next.config.ts apps/web/tailwind.config.ts apps/web/postcss.config.mjs apps/web/components.json
git commit -m "feat: create @rafin/web package with next.js setup"
```

---

## Task 15: Add i18n Configuration to Web

**Files:**
- Create: `apps/web/i18n/routing.ts`
- Create: `apps/web/i18n/request.ts`
- Create: `apps/web/messages/en.json`
- Create: `apps/web/messages/tr.json`
- Create: `apps/web/middleware.ts`

**Step 1: Create apps/web/i18n/routing.ts**

```typescript
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'tr'],
  defaultLocale: 'en',
  localePrefix: 'never',
})
```

**Step 2: Create apps/web/i18n/request.ts**

```typescript
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { routing } from './routing'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value

  let locale = localeCookie || routing.defaultLocale

  if (!routing.locales.includes(locale as 'en' | 'tr')) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
```

**Step 3: Create apps/web/messages/en.json**

```json
{
  "common": {
    "loading": "Loading...",
    "error": "An error occurred",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "search": "Search",
    "noResults": "No results found"
  },
  "auth": {
    "login": "Login",
    "register": "Register",
    "logout": "Logout",
    "email": "Email",
    "password": "Password",
    "name": "Name",
    "forgotPassword": "Forgot password?",
    "noAccount": "Don't have an account?",
    "hasAccount": "Already have an account?"
  },
  "nav": {
    "home": "Home",
    "books": "Books",
    "locations": "Locations",
    "reading": "My Reading",
    "settings": "Settings"
  },
  "books": {
    "title": "Books",
    "addBook": "Add Book",
    "scanISBN": "Scan ISBN",
    "manualEntry": "Manual Entry",
    "noBooks": "No books yet",
    "totalBooks": "Total Books"
  },
  "locations": {
    "title": "Locations",
    "addLocation": "Add Location",
    "room": "Room",
    "furniture": "Furniture",
    "shelf": "Shelf"
  },
  "reading": {
    "title": "My Reading",
    "tbr": "To Be Read",
    "reading": "Currently Reading",
    "completed": "Completed",
    "dnf": "Did Not Finish",
    "progress": "Progress",
    "currentPage": "Current Page"
  },
  "settings": {
    "title": "Settings",
    "profile": "Profile",
    "language": "Language",
    "theme": "Theme",
    "dark": "Dark",
    "light": "Light",
    "system": "System"
  }
}
```

**Step 4: Create apps/web/messages/tr.json**

```json
{
  "common": {
    "loading": "Yükleniyor...",
    "error": "Bir hata oluştu",
    "save": "Kaydet",
    "cancel": "İptal",
    "delete": "Sil",
    "edit": "Düzenle",
    "search": "Ara",
    "noResults": "Sonuç bulunamadı"
  },
  "auth": {
    "login": "Giriş Yap",
    "register": "Kayıt Ol",
    "logout": "Çıkış Yap",
    "email": "E-posta",
    "password": "Şifre",
    "name": "İsim",
    "forgotPassword": "Şifremi unuttum",
    "noAccount": "Hesabınız yok mu?",
    "hasAccount": "Zaten hesabınız var mı?"
  },
  "nav": {
    "home": "Ana Sayfa",
    "books": "Kitaplar",
    "locations": "Konumlar",
    "reading": "Okumalarım",
    "settings": "Ayarlar"
  },
  "books": {
    "title": "Kitaplar",
    "addBook": "Kitap Ekle",
    "scanISBN": "ISBN Tara",
    "manualEntry": "Manuel Giriş",
    "noBooks": "Henüz kitap yok",
    "totalBooks": "Toplam Kitap"
  },
  "locations": {
    "title": "Konumlar",
    "addLocation": "Konum Ekle",
    "room": "Oda",
    "furniture": "Mobilya",
    "shelf": "Raf"
  },
  "reading": {
    "title": "Okumalarım",
    "tbr": "Okunacaklar",
    "reading": "Şu An Okunan",
    "completed": "Tamamlanan",
    "dnf": "Yarım Bırakılan",
    "progress": "İlerleme",
    "currentPage": "Mevcut Sayfa"
  },
  "settings": {
    "title": "Ayarlar",
    "profile": "Profil",
    "language": "Dil",
    "theme": "Tema",
    "dark": "Koyu",
    "light": "Açık",
    "system": "Sistem"
  }
}
```

**Step 5: Create apps/web/middleware.ts**

```typescript
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
```

**Step 6: Commit**

Run:
```bash
git add apps/web/i18n apps/web/messages apps/web/middleware.ts
git commit -m "feat: add next-intl i18n configuration"
```

---

## Task 16: Add Core App Files to Web

**Files:**
- Create: `apps/web/app/globals.css`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/lib/utils.ts`
- Create: `apps/web/lib/api.ts`

**Step 1: Create apps/web/app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --card: 0 0% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 14.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 14.9%;
    --input: 0 0% 14.9%;
    --ring: 0 0% 83.1%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Step 2: Create apps/web/app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rafin - Home Library Tracker',
  description: 'Track your home library, reading progress, and book locations',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

**Step 3: Create apps/web/lib/utils.ts**

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Step 4: Create apps/web/lib/api.ts**

```typescript
import { treaty } from '@elysiajs/eden'
import type { App } from '@rafin/api'

export const api = treaty<App>(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')
```

**Step 5: Commit**

Run:
```bash
git add apps/web/app/globals.css apps/web/app/layout.tsx apps/web/lib
git commit -m "feat: add core app files and eden treaty client"
```

---

## Task 17: Add Basic Pages to Web

**Files:**
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/(auth)/login/page.tsx`
- Create: `apps/web/app/(auth)/register/page.tsx`
- Create: `apps/web/app/(dashboard)/layout.tsx`
- Create: `apps/web/app/(dashboard)/page.tsx`

**Step 1: Create directory structure**

Run:
```bash
mkdir -p apps/web/app/\(auth\)/login apps/web/app/\(auth\)/register apps/web/app/\(dashboard\)
```

**Step 2: Create apps/web/app/page.tsx**

```tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/login')
}
```

**Step 3: Create apps/web/app/(auth)/login/page.tsx**

```tsx
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function LoginPage() {
  const t = useTranslations('auth')

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Rafin</h1>
          <p className="mt-2 text-muted-foreground">{t('login')}</p>
        </div>
        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              {t('email')}
            </label>
            <input
              id="email"
              type="email"
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              {t('password')}
            </label>
            <input
              id="password"
              type="password"
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-primary py-2 text-primary-foreground hover:bg-primary/90"
          >
            {t('login')}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          {t('noAccount')}{' '}
          <Link href="/register" className="text-primary hover:underline">
            {t('register')}
          </Link>
        </p>
      </div>
    </div>
  )
}
```

**Step 4: Create apps/web/app/(auth)/register/page.tsx**

```tsx
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function RegisterPage() {
  const t = useTranslations('auth')

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Rafin</h1>
          <p className="mt-2 text-muted-foreground">{t('register')}</p>
        </div>
        <form className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              {t('name')}
            </label>
            <input
              id="name"
              type="text"
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              {t('email')}
            </label>
            <input
              id="email"
              type="email"
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              {t('password')}
            </label>
            <input
              id="password"
              type="password"
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-primary py-2 text-primary-foreground hover:bg-primary/90"
          >
            {t('register')}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          {t('hasAccount')}{' '}
          <Link href="/login" className="text-primary hover:underline">
            {t('login')}
          </Link>
        </p>
      </div>
    </div>
  )
}
```

**Step 5: Create apps/web/app/(dashboard)/layout.tsx**

```tsx
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = useTranslations('nav')

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-card p-4">
        <h1 className="mb-8 text-2xl font-bold">Rafin</h1>
        <nav className="space-y-2">
          <Link
            href="/"
            className="block rounded-md px-3 py-2 hover:bg-accent"
          >
            {t('home')}
          </Link>
          <Link
            href="/books"
            className="block rounded-md px-3 py-2 hover:bg-accent"
          >
            {t('books')}
          </Link>
          <Link
            href="/locations"
            className="block rounded-md px-3 py-2 hover:bg-accent"
          >
            {t('locations')}
          </Link>
          <Link
            href="/reading"
            className="block rounded-md px-3 py-2 hover:bg-accent"
          >
            {t('reading')}
          </Link>
          <Link
            href="/settings"
            className="block rounded-md px-3 py-2 hover:bg-accent"
          >
            {t('settings')}
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
```

**Step 6: Create apps/web/app/(dashboard)/page.tsx**

```tsx
import { useTranslations } from 'next-intl'

export default function DashboardPage() {
  const t = useTranslations('nav')

  return (
    <div>
      <h1 className="text-3xl font-bold">{t('home')}</h1>
      <p className="mt-4 text-muted-foreground">
        Welcome to Rafin - Your home library tracker
      </p>
    </div>
  )
}
```

**Step 7: Commit**

Run:
```bash
git add apps/web/app
git commit -m "feat: add basic pages (auth, dashboard)"
```

---

## Task 18: Install Dependencies and Verify Setup

**Step 1: Start PostgreSQL**

Run:
```bash
cd /home/kmadmin/rafin
docker compose up -d
```

Expected: PostgreSQL container starts

**Step 2: Install dependencies**

Run:
```bash
bun install
```

Expected: All dependencies installed, lockfile created

**Step 3: Generate database migrations**

Run:
```bash
bun run db:generate
```

Expected: Migration files created in `packages/db/drizzle/`

**Step 4: Run migrations**

Run:
```bash
bun run db:push
```

Expected: Schema pushed to database

**Step 5: Verify lint passes**

Run:
```bash
bun run lint
```

Expected: No errors (warnings ok)

**Step 6: Verify typecheck passes**

Run:
```bash
bun run typecheck
```

Expected: No type errors

**Step 7: Commit lockfile and migrations**

Run:
```bash
git add bun.lockb packages/db/drizzle
git commit -m "chore: add lockfile and initial migrations"
```

---

## Task 19: Test Development Server

**Step 1: Start dev server**

Run:
```bash
bun run dev
```

Expected: Both API (port 3001) and Web (port 3000) start

**Step 2: Test API health endpoint**

Run (in new terminal):
```bash
curl http://localhost:3001/health
```

Expected: `{"status":"ok","timestamp":"..."}`

**Step 3: Test web app**

Open browser: `http://localhost:3000`

Expected: Redirects to login page, shows Rafin login form

**Step 4: Stop dev server**

Press `Ctrl+C` to stop

**Step 5: Final commit**

Run:
```bash
git add -A
git commit -m "chore: project setup complete"
```

---

## Summary

After completing all tasks, you will have:

1. **Root Configuration:**
   - Turborepo monorepo with Bun
   - Biome linting/formatting
   - knip dead code detection
   - Docker Compose for PostgreSQL
   - TypeScript base configuration

2. **packages/db:**
   - Drizzle ORM with PostgreSQL
   - Better-Auth schema (users, sessions, accounts, verifications)
   - Domain schema (locations, books, user_books, quotes, reviews)

3. **packages/shared:**
   - Zod validators for books and locations
   - Shared TypeScript types

4. **packages/ui:**
   - Empty shell ready for shadcn/ui components

5. **apps/api:**
   - ElysiaJS with Better-Auth integration
   - CORS and static file serving configured
   - Auth middleware with macro

6. **apps/web:**
   - Next.js App Router
   - next-intl i18n (en/tr, cookie-based, no URL prefix)
   - Tailwind CSS + shadcn/ui configuration
   - Eden Treaty client for type-safe API calls
   - Basic auth and dashboard pages

---

Plan complete and saved to `docs/plans/2026-01-29-project-setup-implementation.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
