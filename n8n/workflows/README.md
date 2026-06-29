# n8n Workflows

These workflows feed the launcher Postgres database. Each runs on its own cron and writes to a dedicated table.

## Workflow inventory

| File | Trigger | Source | Destination |
|---|---|---|---|
| `meteo.json` | Cron 30 min | Open-Meteo HTTP | `meteo` (id=1) |
| `caldav-agenda.json` | Cron 5 min | CalDAV | `calendar` (uid) |
| `notion-applications.json` | Cron 10 min | Notion API | `applications` (notion_id) |
| `uptime-services.json` | Cron 5 min | Uptime Kuma API | `services` (name) |
| `github-commits.json` | Cron 15 min | GitHub API | `signals.last_commit_*` |
| `backups-status.json` | Cron 1h | TBD | `signals.backups_*` |
| `todo-notion-sync.json` | Webhook | App | Notion API |

## Required n8n credentials

- **Postgres** (`launcher`) — Host `postgres`, DB `launcher`, User `n8n_writer`, password from `N8N_WRITER_PWD`.
- **Notion API** — integration token with access to DB `<NOTION_DB_ID>`.
- **CalDAV** — community CalDAV node + Basic Auth (app password) for your CalDAV server (Infomaniak, Nextcloud, iCloud, etc.).
- **GitHub** — personal access token (read-only).
- **Uptime Kuma** — none if using public status page.

## Importing a workflow

1. Open n8n → `Workflows` → `Import from File`.
2. Select the `.json` file from this directory.
3. Map credentials (Postgres + per-source).
4. Activate the workflow.

## Backing up after changes

Each time you edit a workflow:

1. Open it in n8n.
2. Click the three dots → `Download`.
3. Replace the corresponding `.json` here and commit.

## Postgres node template

For every entrant workflow, the Postgres node uses the `n8n_writer` credential and an `ON CONFLICT` upsert. Example for `meteo`:

```sql
INSERT INTO meteo (id, location, temperature_c, icon, condition, fetched_at)
VALUES (1, $1, $2, $3, $4, NOW())
ON CONFLICT (id) DO UPDATE SET
  location = EXCLUDED.location,
  temperature_c = EXCLUDED.temperature_c,
  icon = EXCLUDED.icon,
  condition = EXCLUDED.condition,
  fetched_at = EXCLUDED.fetched_at;
```

## Webhook token (todo-sync)

The `todo-notion-sync` workflow uses a Webhook trigger node. Configure:
- Authentication: Header Auth
- Header Name: `X-Webhook-Token`
- Header Value: same as `N8N_TODO_WEBHOOK_TOKEN` in the app's `.env`.
