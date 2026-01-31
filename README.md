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

## Docker

```bash
# Build images
docker build --target runner-api -t rafin-api .
docker build --target runner-web --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 -t rafin-web .

# Run full stack (postgres + api + web)
docker compose up -d
```

Images are published to GitHub Container Registry on push to `main`:

```bash
docker pull ghcr.io/OWNER/rafin-api:latest
docker pull ghcr.io/OWNER/rafin-web:latest
```

## Tech Stack

- **Runtime:** Bun
- **Backend:** ElysiaJS
- **Frontend:** Next.js (App Router)
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Better-Auth
