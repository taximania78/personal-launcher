# API agent

API REST permettant à un agent IA de **piloter** le launcher : focus (par
jour), to-do (création / report datés), journal quotidien, priorités de la
semaine, habitudes, historique. Toutes les routes vivent sous `/api/agent/*`
et sont protégées par un **bearer token**.

## Authentification

Chaque requête doit porter l'en-tête :

```
Authorization: Bearer plt_…
```

Les tokens se créent et se révoquent depuis **`/config` → section « Tokens API (agent) »**.
Le secret en clair n'est affiché **qu'une seule fois** à la création (il est
stocké hashé en SHA-256). Un token absent, invalide ou révoqué → `401`.

## Découverte

La spec OpenAPI 3.1 est servie (publiquement, sans secret) sur :

```
GET /api/agent/openapi.json
```

Un agent peut l'ingérer directement pour en dériver ses outils. C'est **cette
URL** qu'on fournit à l'agent (pas ce fichier markdown). URL de base selon
l'environnement :

| Environnement | URL de base |
|---|---|
| Local (dev) | `http://localhost:3000` |
| Autre appareil du LAN | `http://<ip-hôte>:3000` |
| Homelab déployé | `http://<hôte-homelab>:8081` (front publié LAN-only) |

> Le spec ne déclare pas de bloc `servers` : selon l'outil, il peut falloir
> indiquer aussi l'URL de base à l'agent en plus de l'endpoint `openapi.json`.

## Endpoints

### `GET /api/agent/state`

Renvoie tout l'état courant en un appel : focus du jour et de demain, todos
(today / tomorrow / upcoming), todos en triage (reportées trop souvent),
journal du jour, priorités de la semaine, habitudes et leurs coches.

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/agent/state
```

```jsonc
{
  "focus": { "id": 12, "text": "Finir le rapport", "done": false, "why": "Deadline client vendredi" },
  "focus_tomorrow": { "id": 18, "text": "Préparer le point d'équipe", "why": null },
  "todos": {
    "today":    [ { "id": 1, "text": "…", "done": false, "overdue": false, "postponed_count": 0 } ],
    "tomorrow": [ { "id": 5, "text": "…", "done": false, "postponed_count": 0 } ],
    "upcoming": [ { "id": 9, "text": "…", "scheduled_for": "2026-07-08", "postponed_count": 1 } ]
  },
  "triage": [ { "id": 2, "text": "Relancer le fournisseur", "postponed_count": 3, "days_overdue": 4 } ],
  "journal": {
    "day": "2026-07-04",
    "focus_todo_id": 12,
    "focus_text": "Finir le rapport",
    "why": "Deadline client vendredi",
    "focus_outcome": "not_set",
    "report_reason": null,
    "report_comment": null,
    "deep_work": null,
    "shutdown_at": null,
    "shutdown_mode": null
  },
  "week_priorities": [ { "id": 4, "text": "Livrer le refonte focus", "done": false } ],
  "habits":       [ { "id": 3, "name": "Sport", "icon": "Dumbbell", "checks_last_7": 4 } ],
  "checks_today": [ 3 ]
}
```

`focus`/`focus_tomorrow`/`journal` sont `null` si rien n'est défini pour le
jour concerné. `todos.today` inclut aussi les todos en retard (`overdue: true`).

### Focus

Le focus d'un jour se pose soit par **texte libre** (`text`, crée une todo
focus), soit par **promotion d'une todo existante** (`todo_id`) — les deux
sont exclusifs. `when` cible le jour (`today` par défaut, `tomorrow`, ou une
date `YYYY-MM-DD` pour poser le focus d'un autre jour, ex. vendredi → lundi).
`why` (optionnel) explique pourquoi ce focus compte ; il est affiché sous le
focus et écrit dans le journal du jour.

```bash
# Définir le focus du jour par texte libre
curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"Finir le rapport","why":"Deadline client vendredi"}' http://localhost:3000/api/agent/focus

# Promouvoir une todo existante en focus de demain
curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"todo_id":18,"when":"tomorrow"}' http://localhost:3000/api/agent/focus

# Poser le focus d'un jour précis (ex. lundi prochain)
curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"Préparer la démo","when":"2026-07-06"}' http://localhost:3000/api/agent/focus
```

Réponse : `{ "id": 12, "text": "Finir le rapport", "date": "2026-07-04" }`.

```bash
# Effacer le focus du jour (todo conservée, journal recalé sur not_set)
curl -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/agent/focus

# Effacer le focus d'un jour précis
curl -X DELETE -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/agent/focus?date=2026-07-06"
```

### To-do

```bash
# Créer (when: today | tomorrow, défaut today)
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"Acheter du pain","when":"tomorrow"}' http://localhost:3000/api/agent/todos

# Créer avec une date libre (scheduled_for prime sur when) — placement dans la semaine
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"Préparer le point équipe","scheduled_for":"2026-07-08"}' http://localhost:3000/api/agent/todos

# Cocher / éditer (au moins un champ : done, text, scheduled_for)
curl -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"done":true}' http://localhost:3000/api/agent/todos/1

# Reporter (scheduled_for) — incrémente postponed_count côté serveur si la
# nouvelle date est ultérieure, et démote la todo du focus le cas échéant
curl -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"scheduled_for":"2026-07-06"}' http://localhost:3000/api/agent/todos/1

# Supprimer
curl -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/agent/todos/1
```

### Journal quotidien

Un journal par jour (`day`), upserté partiellement — un seul champ suffit
dans le corps. `focus_todo_id` accepte un entier, une chaîne numérique ou
`null` (déliaison). `focus_outcome` couvre le cycle de vie du focus du jour :
`not_set` (rien défini), `done`, `reported` (reporté, avec `report_reason`
parmi `trop_gros | imprevu | evite | plus_pertinent | autre` et un
`report_comment` libre), ou `expired` (jour clos sans issue renseignée).
`shutdown_at`/`shutdown_mode` (`normal` | `degrade`) tracent le rituel de
clôture de journée.

```bash
# Lire le journal d'un jour (null si vierge)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/agent/journal/2026-07-04

# Marquer le focus du jour comme fait
curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"focus_outcome":"done"}' http://localhost:3000/api/agent/journal/2026-07-04

# Reporter le focus avec un motif
curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"focus_outcome":"reported","report_reason":"trop_gros","report_comment":"Découpé en 3 sous-tâches"}' \
  http://localhost:3000/api/agent/journal/2026-07-04

# Clôture dégradée de la journée
curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"shutdown_at":"2026-07-04T21:30:00Z","shutdown_mode":"degrade"}' \
  http://localhost:3000/api/agent/journal/2026-07-04
```

### Priorités de la semaine

3 priorités maximum par semaine (`week_start`, toujours un **lundi** —
`400` sinon). Par défaut, `week_start` vaut le lundi de la semaine courante ;
on peut le forcer (ex. le dimanche soir, pour poser les priorités de la
semaine suivante).

```bash
# Lire les priorités de la semaine courante
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/agent/week-priorities

# Lire les priorités d'une semaine précise
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/agent/week-priorities?week_start=2026-06-29"

# Créer une priorité (409 si la limite de 3 est atteinte)
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"Livrer la refonte focus"}' http://localhost:3000/api/agent/week-priorities

# Modifier (text, done, position)
curl -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"done":true}' http://localhost:3000/api/agent/week-priorities/4

# Supprimer
curl -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/agent/week-priorities/4
```

### Habitudes

```bash
# Créer une habitude
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Sport","icon":"Dumbbell"}' http://localhost:3000/api/agent/habits

# Cocher / décocher (day défaut aujourd'hui, checked défaut true)
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"checked":true}' http://localhost:3000/api/agent/habits/3/check
```

### Historique

Pour la revue hebdo : journaux des N derniers jours (défaut 14, max 90) et
compte de coches par habitude sur la même fenêtre.

```bash
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/agent/history?days=14"
```

```jsonc
{
  "days": 14,
  "journals": [ { "day": "2026-07-04", "focus_outcome": "done", "…": "…" } ],
  "habits":   [ { "habit_id": 3, "name": "Sport", "checks": 4 } ]
}
```

## Codes d'erreur

| Code | Cas |
|------|-----|
| `400` | corps invalide |
| `401` | token absent / invalide / révoqué |
| `404` | id introuvable |
| `409` | limite atteinte (3 priorités max par semaine) |
| `500` | erreur interne |

## Sécurité — point d'attention

Le front homelab est LAN-only sans HTTPS : un bearer transitant en clair sur le
LAN est exposé au sniffing local. Acceptable pour un usage mono-utilisateur ;
si l'agent tourne hors LAN, prévoir du TLS en amont.
