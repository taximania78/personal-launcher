#!/usr/bin/env bash
#
# dev.sh — One-shot dev launcher for Personnal Launcher.
#
# Brings up the full local stack in order:
#   1. Docker daemon (starts Docker Desktop on macOS if it's down)
#   2. Postgres   (docker-compose.dev.yml — the dev "backend")
#   3. Migrations (node-pg-migrate, env loaded from .env.local)
#   4. Next.js dev server (Turbopack)
#
# Usage:
#   ./scripts/dev.sh            # full stack, then run the dev server (foreground)
#   ./scripts/dev.sh --no-dev   # bring up backend + migrate only, don't start Next.js
#
# Safe to re-run: every step is idempotent.

set -euo pipefail

# Run from the repo root regardless of where the script is called from.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RUN_DEV=true
[[ "${1:-}" == "--no-dev" ]] && RUN_DEV=false

# Prefer pnpm (repo uses a pnpm lockfile); fall back to npm.
if command -v pnpm >/dev/null 2>&1; then
  PKG=pnpm
else
  PKG="npm run"
fi

say() { printf '\033[1;36m▸ %s\033[0m\n' "$1"; }

# 1. Docker daemon -----------------------------------------------------------
if ! docker info >/dev/null 2>&1; then
  say "Docker daemon down — starting Docker Desktop…"
  open -a Docker
  until docker info >/dev/null 2>&1; do sleep 2; done
fi
say "Docker daemon ready"

# 2. Postgres ----------------------------------------------------------------
say "Starting Postgres (docker-compose.dev.yml)…"
docker compose -f docker-compose.dev.yml up -d
until docker exec launcher-postgres-dev pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
say "Postgres healthy on localhost:5432"

# 3. Env + migrations --------------------------------------------------------
if [[ ! -f .env.local ]]; then
  echo "✗ .env.local not found. Run: cp .env.local.example .env.local" >&2
  exit 1
fi
# node-pg-migrate reads DATABASE_URL_ADMIN from the process env, not .env.local.
set -a; source .env.local; set +a
say "Running migrations…"
$PKG migrate

# 4. Dev server --------------------------------------------------------------
if $RUN_DEV; then
  say "Starting Next.js dev server → http://localhost:3000"
  exec $PKG dev
else
  say "Backend ready. Skipping dev server (--no-dev)."
fi
