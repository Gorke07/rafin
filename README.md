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
