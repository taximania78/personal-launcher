# Personnal Launcher

Homepage navigateur remplaçant Heimdall : barre Whoogle + lanceur de services homelab + cockpit de productivité (Todo, Agenda, Habitudes, Job search, Homelab signals).

## Quickstart (dev)

One-shot launcher — boots Docker + Postgres, applies migrations, then starts the dev server:

```bash
# First time only:
cp .env.local.example .env.local   # has the GUC options in DATABASE_URL_ADMIN so migrations work
pnpm install

# Every time:
pnpm dev:up                        # → http://localhost:3000
```

`pnpm dev:up` runs `scripts/dev.sh`, which is idempotent and safe to re-run. It:
1. Starts the Docker daemon (launches Docker Desktop on macOS if it's down)
2. Brings up Postgres (`docker-compose.dev.yml`) — the dev **backend** — and waits until it's healthy
3. Loads `.env.local` and applies migrations (`node-pg-migrate`)
4. Starts the Next.js dev server (Turbopack)

Use `./scripts/dev.sh --no-dev` to bring up the backend + migrate only, without starting Next.js.

> **Note:** `next dev` / `pnpm dev` alone only starts the front end. Postgres (the backend) won't be running — use `pnpm dev:up` for the full stack.

<details>
<summary>Manual steps (if you'd rather not use the script)</summary>

```bash
docker compose -f docker-compose.dev.yml up -d
set -a; source .env.local; set +a   # migrate reads env from the shell, not .env.local
pnpm migrate
pnpm dev
```
</details>

Open `http://localhost:3000`.

> Launcher tile URLs and Whoogle URL are **not** env vars anymore — configure them at runtime via the `/config` page (gear icon top-right).

## Quickstart (prod / homelab deploy — NOT for local runs)

> ⚠️ This path is for deploying to the homelab only. It will **not** run on a
> dev machine: it needs the external `integration-n8n-launcher` network (missing on a laptop).
> The front is published on host port `8081`, **LAN access only, no auth**. To
> run locally, use `pnpm dev:up` above.

```bash
cp .env.example .env
# edit .env with real passwords (no tile URLs needed — configure those at runtime via /config)
docker compose up -d --build
```

The app reaches the front on `http://<host>:8081` once up. It expects one
external Docker network to exist before `docker compose up`:
- `integration-n8n-launcher` (your existing n8n stack — attach it to this network so n8n can write to Postgres)

If it doesn't exist: `docker network create --internal integration-n8n-launcher`, then add it to your n8n compose's `networks` block.

> 📘 Guide de déploiement complet (topologie, variables d'env, réseaux, rôles
> Postgres, opérations, dépannage) : [`docs/deployment.md`](docs/deployment.md).
> `docker compose up -d --build` construit l'image `launcher:latest` (directive
> `build: .`) puis démarre la stack.

## Architecture (3 tiers, strictly decoupled)

- **Étage 1 (Socle):** Header + Whoogle bar + Launcher. Renders instantly, no blocking network calls.
- **Étage 2 (Cockpit):** Focus banner + 5 cards (Todo, Agenda, Habitudes, Job, Homelab). Reads Postgres only; degrades to `—` on failure. La carte Habitudes (grille hebdo de coches, source 100 % locale) se gère depuis `/config`.
- **Étage 3 (Collecte):** 6 n8n cron workflows (Notion, CalDAV, Open-Meteo, Uptime Kuma, GitHub, backups) + 1 webhook receiver for Todo → Notion sync.

### Configuration au runtime

Les tuiles du lanceur, l'URL Whoogle et le texte par défaut du Focus banner sont configurables directement dans l'app via la page `/config` (accessible par l'icône engrenage en haut à droite de la homepage).

Sur le premier démarrage, les 11 tuiles par défaut sont auto-seedées avec `href='#'`. L'URL Whoogle est vide par défaut — la barre de recherche tombe sur Google.

## Smoke test before deploying

1. `pnpm dev` → check `http://localhost:3000` renders, search bar has autofocus.
2. Stop postgres (`docker compose -f docker-compose.dev.yml stop postgres`) → reload → socle still renders, cockpit shows `CardError` blocks.
3. Restart postgres → reload → everything back.
4. Toggle a todo, reload → state persisted in DB.

## Tests

```bash
docker compose -f docker-compose.dev.yml up -d
docker exec launcher-postgres-dev psql -U postgres -c "CREATE DATABASE launcher_test;" || true

set -a; source .env.local; set +a
OPTS="-c%20app.reader_pwd%3D${APP_READER_PWD}%20-c%20app.writer_pwd%3D${APP_WRITER_PWD}%20-c%20app.n8n_pwd%3D${N8N_WRITER_PWD}"
DATABASE_URL_ADMIN="postgres://postgres:devpassword@localhost:5432/launcher_test?options=${OPTS}" \
  pnpm migrate

pnpm test
```

## Migrations

The migration runner is `node-pg-migrate`. Migrations are in `db/migrations/`.

**Important:** Migration 001 creates the three Postgres roles (`app_reader`, `app_writer`, `n8n_writer`) by reading their passwords from session GUC settings (`current_setting('app.reader_pwd', true)` etc.). These GUCs are passed via the `?options=-c app.foo=...` query string in `DATABASE_URL_ADMIN`. The `pnpm migrate` script reads `DATABASE_URL_ADMIN` from env. See `.env.local.example` for the URL format.

## n8n workflows

See `n8n/workflows/README.md`.

## API agent

Surface REST bearer-authentifiée permettant à un agent IA de lire/modifier le
focus, la to-do et les habitudes. Doc complète (auth, endpoints, exemples
`curl`) : [`docs/agent-api.md`](docs/agent-api.md).

Adresse à donner à un agent — l'endpoint OpenAPI 3.1 (public, sans secret) :

```
GET /api/agent/openapi.json
```

URL de base selon l'environnement :
- Local (dev) : `http://localhost:3000`
- Autre appareil du LAN : `http://<ip-hôte>:3000`
- Homelab déployé : `http://<hôte-homelab>:8081` (front publié LAN-only)

Les endpoints `/api/agent/*` exigent `Authorization: Bearer plt_…` ; les tokens
se créent dans `/config` → « Tokens API (agent) » (secret affiché une seule
fois). ⚠️ Hors LAN, mettre un reverse-proxy HTTPS devant (bearer en clair sinon).

## Open items (see spec § 12)

- Liste exhaustive des valeurs `Status` Notion
- Outil de backup utilisé (workflow `backups-status`)
- Slug exact Uptime Kuma status page
- Design tokens — palette à itérer

**Resolved:**
- URLs effectives des tuiles du lanceur — configurable via `/config` ✓
- Configuration de l'URL Whoogle — configurable via `/config` ✓

## Stack

Next.js 16.2 (App Router, React 19) · TypeScript · Tailwind 4.3 · PostgreSQL 18 · `pg` + `node-pg-migrate` · `zod` · `vitest` · `pnpm` · Node 22 LTS · Docker Compose.
