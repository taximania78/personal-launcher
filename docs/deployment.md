# Déploiement (homelab / production)

Comment déployer Personnal Launcher sur le homelab, à côté de la stack n8n
existante. Le front est exposé sur le **LAN uniquement**, via le port hôte
`8081`. Pour lancer le projet **en local**, ce document n'est pas le bon :
utilise `pnpm dev:up` (voir `README.md` → *Quickstart (dev)*).

> ⚠️ Le chemin prod **ne tourne pas sur une machine de dev**. La stack
> `docker-compose.yml` attend le réseau Docker externe `integration-n8n-launcher` (absent d'un
> laptop) et expose le front sur le port hôte `8081`. En local, toujours
> `pnpm dev:up`.

> 🔓 **Pas d'authentification.** Le front est servi directement sur
> `http://<hôte>:8081`, sans aucune couche d'auth. À n'exposer que sur un LAN de
> confiance ; ne publie jamais ce port vers Internet. Si tu as besoin d'auth plus
> tard, place un reverse-proxy (Traefik + Authelia, Caddy + auth, etc.) devant et
> retire le mapping de port.

---

## Topologie

Deux conteneurs (app + postgres) dans ce compose, plus la stack n8n externe.

```
   navigateur LAN ── http://<hôte>:8081 ──┐  (port hôte 8081, pas d'auth)
                      ┌───────────────────▼────────────────────────┐
                      │ app  (image launcher:latest, Next.js :3000) │
                      │  ENTRYPOINT: migrations → node server.js    │
                      └───────────────┬────────────────────────────┘
                            data-launcher│ (réseau interne, bridge)
                      ┌───────────────▼────────────────────────────┐
                      │ postgres  (postgres:18, volume persistant)  │
                      └──────┬───────────────────────┬──────────────┘
                 data-launcher│ integration-n8n-launcher │ (réseau externe interne)
                             │                        │
                     app (reader/writer)      n8n (stack externe, n8n_writer)
```

- **app** est publié sur le port hôte `8081` (→ `3000` dans le conteneur) et
  parle à Postgres sur `data-launcher` (rôles `app_reader` / `app_writer`).
  Aucune authentification : accès LAN de confiance uniquement.
- **n8n** (stack séparée, pas dans ce compose) atteint Postgres via le réseau
  partagé `integration-n8n-launcher`, avec le rôle `n8n_writer`. Les 7 workflows cron
  écrivent dans les tables de collecte (`meteo`, `calendar`, `applications`,
  `services`, `signals`).

Le détail des workflows et des credentials n8n est dans
`n8n/workflows/README.md`.

---

## Prérequis

Sur l'hôte homelab :

- Docker + Docker Compose v2.
- La stack **n8n** en route (pour l'Étage 3 ; l'app fonctionne sans, les cartes
  de collecte tombent juste en `—`).
- Le réseau externe interne `integration-n8n-launcher` existe. Il est à créer et à attacher à n8n :

  ```bash
  docker network create --internal integration-n8n-launcher
  ```

  Puis ajoute `integration-n8n-launcher` au bloc `networks:` du compose de ta stack n8n, et
  recrée le conteneur n8n pour qu'il rejoigne le réseau.
- Le port hôte `8081` est libre sur l'hôte.

---

## Déploiement, étape par étape

### 1. Renseigner les secrets

```bash
cp .env.example .env
```

Édite `.env` et remplace tous les `change_me` par de vrais secrets. Les valeurs
attendues sont décrites dans [Variables d'environnement](#variables-denvironnement)
plus bas. Pas d'URL de tuiles ni d'URL Whoogle ici : elles se configurent au
runtime via la page `/config`.

`.env` est ignoré par git (`.gitignore`) — il ne doit jamais être commité.

### 2. Construire et démarrer la stack

Le service `app` a une directive `build: .` taguée `image: launcher:latest`, donc
le compose construit l'image lui-même :

```bash
docker compose up -d --build
```

`--build` force la (re)construction de l'image avant le démarrage ; sans le flag,
`docker compose up -d` ne builde que si l'image `launcher:latest` est absente.

Le `Dockerfile` est multi-étapes : `deps` (pnpm install) → `builder`
(`next build`, sortie `standalone`) → `runner` (image finale, user non-root
`app`, port 3000). Le build injecte des variables factices pour satisfaire le
validateur Zod pendant `next build` ; elles ne sont jamais embarquées dans la
sortie, tout est surchargé au runtime par le compose.

Au démarrage du conteneur `app`, `docker-entrypoint.sh` :

1. construit `DATABASE_URL_ADMIN` à partir de `PG_ADMIN_URL_BASE` en y
   ajoutant les mots de passe des rôles via les options GUC de la session
   (voir [Migrations & rôles](#migrations--rôles)) ;
2. applique les migrations (`node-pg-migrate -m db/migrations`) — idempotent ;
3. lance le serveur Next.js (`node server.js`).

Postgres démarre avec un `healthcheck` ; `app` attend `service_healthy` avant de
booter (`depends_on`).

### 3. Vérifier

```bash
docker compose ps                 # app + postgres "running"/"healthy"
docker compose logs -f app        # "Running migrations..." puis "Starting Next.js..."
```

Puis ouvre le front sur `http://<hôte>:8081` (depuis une machine du LAN).
La barre de recherche a l'autofocus ; le socle (header + lanceur) s'affiche
instantanément. Si Postgres est indisponible, le socle reste rendu et les
cartes du cockpit affichent des blocs `CardError` — c'est le comportement
attendu (dégradation gracieuse).

### 4. Première configuration

Au premier démarrage, 11 tuiles par défaut sont auto-seedées avec `href='#'`,
et l'URL Whoogle est vide (la recherche retombe sur Google). Va sur
`/config` (icône engrenage en haut à droite) pour renseigner les vraies URLs
des tuiles, l'URL Whoogle et le texte du Focus banner.

---

## Variables d'environnement

Définies dans `.env` (consommé par `docker-compose.yml`). Au runtime, l'app
valide un sous-ensemble via Zod (`src/lib/env.ts`) et **refuse de démarrer** si
une variable requise manque ou est malformée.

| Variable | Requis | Exemple / défaut | Rôle |
|---|---|---|---|
| `PG_ADMIN_PWD` | ✅ | — | Mot de passe du superuser `postgres`. Sert au conteneur postgres et à la base de `PG_ADMIN_URL_BASE` (migrations). |
| `APP_READER_PWD` | ✅ | — | Mot de passe du rôle `app_reader` (lecture, `statement_timeout` 2 s). |
| `APP_WRITER_PWD` | ✅ | — | Mot de passe du rôle `app_writer` (écriture app, timeout 5 s). |
| `N8N_WRITER_PWD` | ✅ | — | Mot de passe du rôle `n8n_writer` (écriture des workflows n8n). À reporter dans les credentials Postgres de n8n. |
| `N8N_TODO_WEBHOOK_URL` | ✅ | `https://n8n.example.com/webhook/todo-sync` | Webhook n8n appelé par l'app pour la sync Todo → Notion. Validé comme URL par Zod. |
| `N8N_TODO_WEBHOOK_TOKEN` | ✅ | — | Jeton d'auth de ce webhook (non vide). |
| `LOG_LEVEL` | ➖ | `info` | `debug` \| `info` \| `warn` \| `error`. |

Variables dérivées / fixées par le compose (pas à mettre dans `.env`) :

- `PG_ADMIN_URL_BASE`, `DATABASE_URL`, `DATABASE_URL_READ` — construites dans
  `docker-compose.yml` à partir des mots de passe ci-dessus et de l'hôte
  `postgres`.
- `UPLOAD_DIR` — fixé à `/app/data/uploads` (volume `launcher-uploads`).

> Note : `DATABASE_URL` / `DATABASE_URL_READ` pointent vers le service Docker
> `postgres` (pas `localhost`). C'est uniquement en dev (`.env.local`) qu'elles
> visent `localhost:5432`.

---

## Réseaux & volumes

**Réseaux** (`docker-compose.yml`) :

| Réseau | Type | Qui s'y connecte | Pourquoi |
|---|---|---|---|
| `launcher-access` | bridge (créé) | app | Accès LAN au front et sortie réseau de l'app. |
| `data-launcher` | bridge interne (créé) | app, postgres | Trafic app ↔ DB, privé et sans sortie Internet pour Postgres. |
| `integration-n8n-launcher` | externe interne | postgres, n8n | Accès dédié de n8n à Postgres (`n8n_writer`). |

Le réseau `integration-n8n-launcher` (`external: true`) doit **préexister** ; sinon
`docker compose up` échoue. Le front est exposé via le port hôte `8081`
(mapping `8081:3000` du service `app`), pas via un réseau de proxy.

**Volumes** (persistants, à inclure dans les sauvegardes) :

| Volume | Monté sur | Contenu |
|---|---|---|
| `postgres-data` | `/var/lib/postgresql` | Toute la base. |
| `launcher-uploads` | `/app/data/uploads` | Images de fond uploadées via `/config`. |

---

## Migrations & rôles

Le runner est `node-pg-migrate` ; les migrations vivent dans `db/migrations/`
(`001` … `012`). En prod, elles tournent **automatiquement** au démarrage du
conteneur via `docker-entrypoint.sh` — rien à lancer à la main.

Particularité : la migration `001_init.sql` crée les trois rôles Postgres
(`app_reader`, `app_writer`, `n8n_writer`) en lisant leurs mots de passe depuis
des **GUC de session** (`current_setting('app.reader_pwd', true)`, etc.). Ces
GUC sont passés via la query string `?options=-c app.foo=...` de
`DATABASE_URL_ADMIN`, que l'entrypoint assemble par URL-encodage des trois mots
de passe. Conséquence pratique : les rôles sont créés une seule fois (les blocs
sont gardés par `IF NOT EXISTS`) ; faire évoluer un mot de passe de rôle après
coup demande un `ALTER ROLE ... PASSWORD` manuel, l'entrypoint ne le rejoue pas.

Modèle de permissions (résumé) :

- `app_reader` : `SELECT` sur toutes les tables. Timeout 2 s.
- `app_writer` : écriture sur les tables pilotées par l'app (`todos`,
  `launcher_tiles`, `app_config`, `app_appearance`, `habits`…). Timeout 5 s.
- `n8n_writer` : écriture sur les tables de collecte (`meteo`, `calendar`,
  `applications`, `services`, `signals`).

---

## Opérations courantes

**Mettre à jour (nouveau code) :**

```bash
git pull
docker compose up -d --build    # reconstruit l'image, recrée app ; migrations rejouées au boot
```

**Voir les logs / l'état :**

```bash
docker compose logs -f app
docker compose ps
```

**Redémarrer juste l'app :**

```bash
docker compose restart app
```

**Sauvegarder la base :**

```bash
docker compose exec postgres pg_dump -U postgres launcher > launcher-$(date +%F).sql
```

**Restaurer :**

```bash
docker compose exec -T postgres psql -U postgres launcher < launcher-backup.sql
```

---

## Dépannage

| Symptôme | Cause probable | Correctif |
|---|---|---|
| `network integration-n8n-launcher declared as external, but could not be found` | Réseau externe absent | `docker network create --internal integration-n8n-launcher`, puis l'attacher à la stack n8n. |
| Port `8081` déjà utilisé (`bind: address already in use`) | Un autre service écoute sur `8081` | Changer le port hôte dans `docker-compose.yml` (`"<libre>:3000"`). |
| `app` redémarre en boucle, log `Invalid environment:` | Variable requise manquante/malformée dans `.env` | Comparer `.env` à `.env.example` ; vérifier que les URLs sont des URLs valides et que les `*_PWD` sont non vides. |
| `app` redémarre, log `ERROR: PG_ADMIN_URL_BASE not set` | Le compose n'a pas injecté l'URL admin | Vérifier `PG_ADMIN_PWD` dans `.env` et le bloc `environment:` du service `app`. |
| Migrations en échec sur les rôles | Mots de passe GUC non transmis | Vérifier `APP_READER_PWD` / `APP_WRITER_PWD` / `N8N_WRITER_PWD` dans `.env`. |
| Cartes du cockpit toutes en `—` | n8n n'écrit pas dans la base | Vérifier que n8n est sur `integration-n8n-launcher` et que ses credentials Postgres utilisent `n8n_writer` + `N8N_WRITER_PWD`. |
| Front injoignable sur `:8081` mais conteneurs sains | Pare-feu hôte, ou accès hors LAN | Vérifier que la machine cliente est sur le LAN et que le pare-feu de l'hôte autorise `8081`. |

---

## Voir aussi

- `README.md` — quickstart dev (`pnpm dev:up`) et architecture 3 étages.
- `AGENTS.md` — pourquoi le lancement local passe **toujours** par `pnpm dev:up`.
- `n8n/workflows/README.md` — inventaire des workflows et credentials n8n.
