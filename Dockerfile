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

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    ca-certificates \
    git \
    ripgrep \
    openssh-client \
	 	curl \
 && update-ca-certificates \
 && rm -rf /var/lib/apt/lists/*
 
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Point HOME to the existing node user's home
ENV HOME=/home/node
ENV DATABASE_URL=file:/app/data/prod.db

# 1. FIX: Instead of creating a new user, just make sure the existing 'node' 
# user (which is already UID 1000) has the right directories.
RUN mkdir -p /home/node/.npm && chown -R node:node /home/node

# 2. Copy files and change ownership to the 'node' user
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# 3. Create data directory
RUN mkdir -p /app/data && chown node:node /app/data

# Switch to the pre-existing node user
# USER node

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV OIDO_PATH=/usr/local/bin/oido

# 5. Execute migration and start server
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && yarn start"]
