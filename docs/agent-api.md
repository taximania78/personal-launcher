# API agent

API REST permettant à un agent IA de **lire et modifier** le focus, la to-do
(aujourd'hui / demain) et les habitudes. Toutes les routes vivent sous
`/api/agent/*` et sont protégées par un **bearer token**.

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

Renvoie tout l'état courant en un appel.

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/agent/state
```

```jsonc
{
  "focus": { "id": 12, "text": "Finir le rapport" },
  "todos": {
    "today":    [ { "id": 1, "text": "…", "done": false, "overdue": false } ],
    "tomorrow": [ { "id": 5, "text": "…", "done": false } ]
  },
  "habits":       [ { "id": 3, "name": "Sport", "icon": "Dumbbell" } ],
  "checks_today": [ 3 ]
}
```

### Focus

```bash
# Définir le focus du jour (texte libre)
curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"Finir le rapport"}' http://localhost:3000/api/agent/focus

# Effacer le focus
curl -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/agent/focus
```

### To-do

```bash
# Créer (when: today | tomorrow, défaut today)
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"Acheter du pain","when":"tomorrow"}' http://localhost:3000/api/agent/todos

# Cocher / éditer (au moins un champ : done, text)
curl -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"done":true}' http://localhost:3000/api/agent/todos/1

# Supprimer
curl -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/agent/todos/1
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

## Codes d'erreur

| Code | Cas |
|------|-----|
| `400` | corps invalide |
| `401` | token absent / invalide / révoqué |
| `404` | id introuvable |
| `500` | erreur interne |

## Sécurité — point d'attention

Le front homelab est LAN-only sans HTTPS : un bearer transitant en clair sur le
LAN est exposé au sniffing local. Acceptable pour un usage mono-utilisateur ;
si l'agent tourne hors LAN, prévoir du TLS en amont.
