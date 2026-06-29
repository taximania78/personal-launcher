# Base de données

Postgres 18. C'est la **frontière de données** entre deux producteurs et un
consommateur :

- l'**app Next.js** écrit ses propres tables (todos, lanceur, habitudes, config, apparence) ;
- les **workflows n8n** écrivent les tables d'ingestion (météo, agenda, candidatures, services, signaux) ;
- l'**app** lit *tout* en lecture seule pour afficher la home.

Aucun des deux producteurs n'écrit dans les tables de l'autre : la séparation
est imposée par les rôles Postgres, pas par convention. Voir
[Rôles & permissions](#rôles--permissions).

Pour le déploiement (homelab, secrets, sauvegardes), voir
[`deployment.md`](./deployment.md). Pour les workflows n8n, voir
[`n8n-workflows-guide.md`](./n8n-workflows-guide.md).

---

## Rôles & permissions

Trois rôles de connexion, créés par la migration `001_init.sql`. Chaque rôle a
un `statement_timeout` qui le protège des requêtes lentes.

| Rôle | Droits | `statement_timeout` | Utilisé par |
|------|--------|---------------------|-------------|
| `app_reader` | `SELECT` sur **toutes** les tables | 2 s | l'app (lectures) — `DATABASE_URL_READ` |
| `app_writer` | CRUD sur les **tables app** | 5 s | l'app (écritures) — `DATABASE_URL` |
| `n8n_writer` | CRUD/UPSERT sur les **tables d'ingestion** | 10 s | les workflows n8n |

Les droits sont accordés **table par table, dans la migration qui crée la
table** (`GRANT … ON <table> TO <rôle>`). Une nouvelle table sans `GRANT`
n'est lisible par personne — c'est volontaire, ça force à déclarer l'intention.

### Mots de passe des rôles (GUC de session)

La migration `001` ne lit pas les mots de passe depuis l'environnement mais
depuis des **GUC de session** :

```sql
v_reader_pwd := current_setting('app.reader_pwd', true);
CREATE ROLE app_reader LOGIN PASSWORD <v_reader_pwd>;
```

Ces GUC sont injectées via la query-string `?options=` de `DATABASE_URL_ADMIN` :

```
postgres://postgres:…@host:5432/launcher?options=-c%20app.reader_pwd%3D…%20-c%20app.writer_pwd%3D…%20-c%20app.n8n_pwd%3D…
```

L'assemblage de cette URL à partir de `APP_READER_PWD` / `APP_WRITER_PWD` /
`N8N_WRITER_PWD` est fait par `docker-entrypoint.sh` (prod) et par le bloc
`OPTS=…` du CI (`.github/workflows/ci.yml`). En local, `.env.local` contient
déjà l'URL admin complète.

> Le nom de la base diffère selon l'environnement (`launcher` en local/prod,
> `launcher_test` en CI). La migration `001` accorde donc `CONNECT` sur
> `current_database()`, jamais sur un nom figé.

---

## Migrations

Outil : [`node-pg-migrate`](https://github.com/salsita/node-pg-migrate), format
**SQL brut** (pas de JS), dossier `db/migrations/`.

```bash
pnpm migrate                 # applique les migrations en attente (rôle admin)
pnpm migrate:create ma_table # crée db/migrations/0NN_ma_table.sql
```

- `pnpm migrate` lance `node-pg-migrate -m db/migrations -j sql -d DATABASE_URL_ADMIN up`.
- Les migrations s'exécutent avec le rôle **admin** (`postgres`), seul habilité à
  `CREATE ROLE` / `CREATE TABLE` / `GRANT`.
- Elles tournent **automatiquement** au démarrage : `scripts/dev.sh` en local
  (étape 3) et `docker-entrypoint.sh` en prod, avant de lancer l'app.
- Convention de fichier : préfixe numérique à 3 chiffres + nom, en-tête
  `-- Up Migration`. Pas de section *Down* (les rollbacks se font par une
  nouvelle migration *forward*).

État actuel : `001` → `012`.

---

## Catalogue des tables

### Tables app (écrites via `app_writer`)

Alimentées par l'UI / les routes API de l'app (`/config`, `/api/launcher`, …).

| Table | Clé | Rôle | Notes |
|-------|-----|------|-------|
| `todos` | `id` BIGSERIAL | app_writer | `text` 1–280, `scheduled_for` DATE (jour rattaché : du jour / en retard si < aujourd'hui / demain), `is_focus` (≤ 1 vrai à la fois via index unique partiel), `position` |
| `launcher_tiles` | `id` BIGSERIAL | app_writer | tuiles du lanceur : `name` 1–32, `icon`, `href`, `position` |
| `habits` | `id` BIGSERIAL | app_writer | `name` 1–60, `icon`, `position`, `active` |
| `habit_checks` | `(habit_id, day)` | app_writer | coche d'habitude par jour ; FK → `habits` `ON DELETE CASCADE` |
| `app_config` | `id` = 1 | app_writer | **ligne unique** : `whoogle_url`, `focus_default` |
| `app_appearance` | `id` = 1 | app_writer | **ligne unique** : `background_image_path`, `background_dim_pct` 0–60 |
| `agent_tokens` | `id` BIGSERIAL | app_writer | tokens bearer de l'API agent : `name`, `token_hash` (SHA-256, unique), `token_prefix` (affichage), `last_used_at`, `revoked_at`. Voir [`agent-api.md`](./agent-api.md) |

### Tables d'ingestion (écrites via `n8n_writer`)

Remplies par des workflows n8n externes. L'app les lit seulement ; un seuil de
fraîcheur (`STALE_THRESHOLDS` dans `src/lib/env.ts`) décide si la donnée est
affichée comme « à jour ».

| Table | Clé | Rôle | Notes |
|-------|-----|------|-------|
| `meteo` | `id` = 1 | n8n_writer | **ligne unique** : `temperature_c`, `icon`, `condition` |
| `calendar` | `uid` | n8n_writer | événements ; `is_interview` pour la carte Job |
| `applications` | `notion_id` | n8n_writer | candidatures (source : Notion) ; `status`, `score`, `next_event` |
| `services` | `name` | n8n_writer | état homelab : `status` up/down/unknown, `uptime_24h` |
| `signals` | `id` = 1 | n8n_writer | **ligne unique** : dernier commit, état backups |

> **Pattern « ligne unique »** : `meteo`, `signals`, `app_config`,
> `app_appearance` (et la météo) utilisent `id SMALLINT PRIMARY KEY DEFAULT 1
> CHECK (id = 1)`. La table ne peut contenir qu'une seule ligne — c'est un
> singleton de configuration/état. Les migrations qui la créent font un
> `INSERT … (id) VALUES (1) ON CONFLICT DO NOTHING` pour garantir sa présence.

---

## Accès depuis l'app

### Pools de connexion — `src/lib/db.ts`

Deux pools `pg` (`max: 10, min: 2`), mémorisés sur `globalThis` hors production
pour survivre au HMR de Turbopack :

- `readerPool` → `DATABASE_URL_READ` (rôle `app_reader`) — toutes les lectures.
- `writerPool` → `DATABASE_URL` (rôle `app_writer`) — toutes les écritures.
- `withWriterTx(fn)` — transaction (`BEGIN`/`COMMIT`/`ROLLBACK`) sur le writer.

### Couche requêtes — `src/lib/queries/*`

Une fonction = une requête, typée. Les lectures passent par `readerPool` :

```ts
export async function listLauncherTiles(): Promise<LauncherTile[]> {
  const r = await readerPool.query<LauncherTile>(`
    SELECT id, name, icon, href, position, created_at, updated_at
    FROM launcher_tiles
    ORDER BY position ASC, id ASC
  `)
  return r.rows
}
```

### Garde-fou : timeout côté composant serveur

La home doit s'afficher même si la DB est lente ou absente. Les composants
serveur enveloppent leur lecture dans un `Promise.race` avec un timeout court
(≈ 500 ms) et un fallback gracieux — voir `Launcher.tsx`, `layout.tsx`,
`page.tsx`. Si la DB ne répond pas à temps, on rend une valeur de repli (lanceur
vide, fond uni, recherche Google) plutôt qu'une erreur.

---

## Environnements & variables

| Variable | Rôle pointé | Usage |
|----------|-------------|-------|
| `DATABASE_URL_ADMIN` | `postgres` (super-user) | migrations uniquement |
| `DATABASE_URL` | `app_writer` | écritures de l'app |
| `DATABASE_URL_READ` | `app_reader` | lectures de l'app |
| `TEST_DATABASE_URL` | `postgres` → base `launcher_test` | tests Vitest / CI |
| `APP_READER_PWD` / `APP_WRITER_PWD` / `N8N_WRITER_PWD` | — | mots de passe injectés dans les GUC de la migration `001` |

- **Local** : Postgres en conteneur (`docker-compose.dev.yml`, base `launcher`,
  `postgres` / `devpassword`, port 5432). Démarrage via `pnpm dev:up`.
- **CI** : base `launcher_test`, mots de passe factices (`.github/workflows/ci.yml`).
- **Prod (homelab)** : voir [`deployment.md`](./deployment.md).

---

## Données de test (seed)

Il n'existe pas de seed automatique. Pour peupler le lanceur en dev (ex. pour
tester l'affichage / le scroll), insérer directement dans la base conteneurisée :

```bash
docker exec -i launcher-postgres-dev psql -U postgres -d launcher <<'SQL'
DELETE FROM launcher_tiles;
INSERT INTO launcher_tiles (name, icon, href, position) VALUES
  ('Proxmox', 'Server', '#', 0),
  ('n8n', 'Workflow', '#', 1);
SQL
```

`icon` accepte un nom d'icône Lucide (résolu par `src/components/ui/TileIcon.tsx`)
ou un emoji. `href` est validé côté serveur. En production, le lanceur se
configure plutôt via l'UI `/config` (`TilesManager`).
