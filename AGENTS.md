<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Running the project

To launch, start, run, or "run in Docker" the app **locally**, always use:

```bash
pnpm dev:up        # → http://localhost:3000
```

This one command (`scripts/dev.sh`) is the only supported local launch. It is idempotent and boots the full stack: Postgres in a Docker container (`docker-compose.dev.yml`), then migrations, then the Next.js dev server on the host (Turbopack). Only Postgres is containerized locally — the app itself runs on the host. **That is intended; "run in Docker" locally still means `pnpm dev:up`.** First run only: `cp .env.local.example .env.local && pnpm install`.

**Do NOT use `docker compose up` / the root `docker-compose.yml` to run locally.** That file is the homelab/production deploy: it requires the pre-existing external Docker network `shared-n8n` and publishes the front on host port `8081` (LAN-only, no auth). The external network is missing on a dev machine, so it won't start there. Reach for it only when explicitly deploying to the homelab.
