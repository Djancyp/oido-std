# syntax=docker/dockerfile:1

# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps

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

ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate
RUN yarn build


# ── Stage 3: Production runner ───────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner

# RUN apt-get update && apt-get install -y --no-install-recommends \
#     python3 make g++ \
#   && rm -rf /var/lib/apt/lists/*
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    ca-certificates \
 && update-ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Fix npm / prisma env issues
ENV HOME=/home/nextjs
ENV DATABASE_URL=file:/app/data/prod.db

# Create user
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs \
 && mkdir -p /home/nextjs/.npm \
 && chown -R nextjs:nodejs /home/nextjs

# App files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

COPY --chown=nextjs:nodejs oido /usr/local/bin/oido
## need to copy /home/djan/.config/oido and /home/djan/.cache/oido
COPY --chown=nextjs:nodejs .config/oido /home/nextjs/.config/oido
COPY --chown=nextjs:nodejs .cache/oido /home/nextjs/.cache/oido

RUN chmod +x /usr/local/bin/oido
# Data directory
RUN mkdir -p /app/data \
 && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV OIDO_PATH=/app/oido

# ✔ FINAL FIX: NO npx, NO env issues
CMD ["node","server.js"]
