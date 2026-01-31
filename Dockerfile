# ============================================
# Stage 1: deps — Install dependencies
# ============================================
FROM node:22-alpine AS deps

RUN apk add --no-cache curl bash && \
    curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN bun install --frozen-lockfile

# ============================================
# Stage 2: build-api — Compile API bundle
# ============================================
FROM deps AS build-api

COPY . .

RUN cd apps/api && bun build src/index.ts --outdir dist --target bun

# ============================================
# Stage 3: build-web — Build Next.js app
# ============================================
FROM deps AS build-web

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY . .

RUN cd apps/web && npx next build

# ============================================
# Stage 4: runner-api — Minimal Bun runtime
# ============================================
FROM oven/bun:1.3-alpine AS runner-api

RUN apk add --no-cache vips

WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN bun install --frozen-lockfile --production

# Workspace packages export .ts — Bun loads them directly
COPY packages/db/src packages/db/src
COPY packages/db/drizzle packages/db/drizzle
COPY packages/db/drizzle.config.ts packages/db/drizzle.config.ts
COPY packages/shared/src packages/shared/src
COPY packages/ui/src packages/ui/src

COPY --from=build-api /app/apps/api/dist apps/api/dist

RUN mkdir -p apps/api/uploads

EXPOSE 3001
CMD ["bun", "run", "apps/api/dist/index.js"]

# ============================================
# Stage 5: runner-web — Minimal Node.js runtime
# ============================================
FROM node:22-alpine AS runner-web

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=build-web /app/apps/web/.next/standalone ./
COPY --from=build-web /app/apps/web/.next/static apps/web/.next/static
COPY --from=build-web /app/apps/web/public apps/web/public

RUN chown -R nextjs:nodejs .

USER nextjs

ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
