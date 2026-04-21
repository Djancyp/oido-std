# syntax=docker/dockerfile:1

# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps

# node-pty requires Python + build toolchain
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (standalone output)
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn build

# ── Stage 3: Production runner ───────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner

# node-pty native module needs these at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma generated client + schema (needed at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/generated ./generated
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# node-pty native bindings aren't copied by standalone — copy explicitly
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/node-pty ./node_modules/node-pty

# oido binary — place it at /app/oido and set OIDO_PATH
# Build with: docker build --build-arg OIDO_BINARY=./path/to/oido .
# Or mount at runtime: -v /host/oido:/app/oido
ARG OIDO_BINARY=./oido
COPY --chown=nextjs:nodejs ${OIDO_BINARY} ./oido
RUN chmod +x ./oido

# Data directory for SQLite (mount a volume here in production)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV OIDO_PATH=/app/oido
# Override DATABASE_URL to use the mounted volume path
ENV DATABASE_URL=file:/app/data/prod.db

CMD ["node", "server.js"]
