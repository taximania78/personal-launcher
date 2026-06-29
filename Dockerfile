FROM node:22-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Provide dummy env vars so the Zod env validator doesn't throw during
# `next build`'s page-data collection phase. These values are never baked
# into the output — they are overridden at runtime via docker-compose / k8s.
RUN DATABASE_URL=postgres://x:x@localhost/x \
    DATABASE_URL_READ=postgres://x:x@localhost/x \
    N8N_TODO_WEBHOOK_URL=https://placeholder.invalid/webhook \
    N8N_TODO_WEBHOOK_TOKEN=placeholder \
    UPLOAD_DIR=/app/data/uploads \
    pnpm build

# Migration tooling, self-contained. pnpm installs deps flat in the store and
# symlinks them, so COPYing just `node-pg-migrate/` loses its deps (yargs, etc.).
# Install it with npm (flat node_modules) into an isolated /migrate prefix and
# copy the whole tree — node-pg-migrate then resolves its deps correctly.
FROM base AS migrate-deps
WORKDIR /migrate
RUN npm install --omit=dev --no-audit --no-fund node-pg-migrate@^8.0.4 pg@^8.21.0

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
RUN mkdir -p /app/data/uploads && chown -R app:app /app/data

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/db ./db
COPY --from=migrate-deps /migrate/node_modules /migrate/node_modules
COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER app
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
