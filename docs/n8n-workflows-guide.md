# Guide de réalisation des workflows n8n

Document de référence pour construire les 7 workflows du Tier 3 (Collecte) dans l'UI n8n, les tester, puis les exporter dans `n8n/workflows/`.

---

## 1. Prérequis (une seule fois)

### 1.1 Accès réseau

Le Postgres du launcher est attaché au réseau Docker externe `shared-n8n` (voir `docker-compose.yml`). Depuis le container n8n, il est joignable à l'adresse **`postgres:5432`**. Aucun port n'est publié sur l'hôte : c'est normal.

### 1.2 Credential Postgres (n8n → Credentials → New → Postgres)

| Champ | Valeur |
|---|---|
| Name | `launcher (n8n_writer)` |
| Host | `postgres` |
| Database | `launcher` |
| User | `n8n_writer` |
| Password | valeur de `N8N_WRITER_PWD` (`.env` du launcher) |
| SSL | Disable |
| Port | `5432` |

Test : crée un workflow jetable avec un node **Postgres → Execute Query** : `SELECT 1`. Le rôle `n8n_writer` a un `statement_timeout` de 10 s (migration 008) — une requête qui dépasse échouera, c'est voulu.

Droits du rôle (rappel) : INSERT/UPDATE (+DELETE selon table) sur `meteo`, `calendar`, `applications`, `services`, `signals` **uniquement**. Pas d'accès à `todos` ni aux tables de config.

### 1.3 Autres credentials

| Credential | Type n8n | Notes |
|---|---|---|
| Notion | Notion API | Token d'intégration interne ; **partager** la DB candidatures `<NOTION_DB_ID>` ET la DB todos avec l'intégration (Notion → ⋯ → Connections) |
| CalDAV (Infomaniak) | node communautaire CalDAV — Basic Auth | Mot de passe d'application (pas le mot de passe principal) |
| GitHub | Header Auth | PAT classic read-only (`public_repo` suffit) : `Authorization: Bearer <PAT>` |
| Uptime Kuma | aucun | status page publique |

### 1.4 Conventions communes à tous les workflows entrants

1. **Trigger** : node **Schedule Trigger**, fréquence du tableau ci-dessous.
2. **Écriture** : node **Postgres → Execute Query** avec le credential `launcher (n8n_writer)`, requête paramétrée (champ **Query Parameters**) — jamais de valeurs concaténées dans le SQL. Depuis le node Postgres v2.6 (n8n 2.25+), **Query Parameters attend une seule expression renvoyant un tableau** : `{{ [$json.a, $json.b] }}` (et non plus `{{ $json.a }}, {{ $json.b }}`, qui déclenche `there is no parameter $1`).
3. **`fetched_at = NOW()`** à chaque upsert : c'est ce champ qui pilote les badges « stale » du cockpit.
4. **Settings du workflow** (panneau ⚙) : Timezone `Europe/Paris`, et active **Save failed executions** pour le debug.
5. **Retry** : sur les nodes HTTP/Notion, Settings du node → `Retry On Fail` = 3, `Wait Between Retries` = 5 s.
6. **Export après chaque modification** : ⋯ → `Download`, remplace le fichier correspondant dans `n8n/workflows/` et commit.

### 1.5 Inventaire et fraîcheur attendue

| Workflow | Fréquence | Table (clé upsert) | Badge stale après | Erreur après |
|---|---|---|---|---|
| `meteo` | 30 min | `meteo` (id=1) | 1 h | 24 h |
| `caldav-agenda` | 15 min | `calendar` (uid) | 30 min | 24 h |
| `notion-applications` | 10 min | `applications` (notion_id) | 1 h | 24 h |
| `uptime-services` | 5 min | `services` (name) | 15 min | 24 h |
| `github-commits` | 15 min | `signals` (id=1) | 2 h | 24 h |
| `backups-status` | 1 h | `signals` (id=1) | 2 h | 24 h |
| `todo-notion-sync` | webhook | → Notion | n/a | n/a |

> `signals` est une table mono-ligne partagée par 2 workflows : chaque upsert ne doit toucher **que ses colonnes** (les SQL ci-dessous le garantissent).

---

## 2. `meteo` — Open-Meteo → `meteo`

**3 nodes : Schedule (30 min) → HTTP Request → Postgres.**

### Node HTTP Request

- Method `GET`, URL :

```
https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current=temperature_2m,weather_code&timezone=Europe%2FParis
```

(Paris : 48.8566 N, 2.3522 E ; pas de clé API.)

### Node Code (mapping WMO → icône/condition)

```js
const c = $input.first().json.current;
const code = c.weather_code;
const table = [
  [[0], 'sun', 'Ciel clair'],
  [[1, 2], 'cloud-sun', 'Partiellement nuageux'],
  [[3], 'cloud', 'Couvert'],
  [[45, 48], 'cloud-fog', 'Brouillard'],
  [[51, 53, 55, 56, 57], 'cloud-drizzle', 'Bruine'],
  [[61, 63, 65, 66, 67, 80, 81, 82], 'cloud-rain', 'Pluie'],
  [[71, 73, 75, 77, 85, 86], 'cloud-snow', 'Neige'],
  [[95, 96, 99], 'cloud-lightning', 'Orage'],
];
const hit = table.find(([codes]) => codes.includes(code)) ?? [[], 'cloud', 'Inconnu'];
return [{ json: { temperature_c: c.temperature_2m, icon: hit[1], condition: hit[2] } }];
```

(Noms d'icônes = set Lucide ; l'UI actuelle n'affiche que la température, mais la colonne `icon` est NOT NULL.)

### Node Postgres — Execute Query

```sql
INSERT INTO meteo (id, location, temperature_c, icon, condition, fetched_at)
VALUES (1, 'Paris', $1, $2, $3, NOW())
ON CONFLICT (id) DO UPDATE SET
  temperature_c = EXCLUDED.temperature_c,
  icon          = EXCLUDED.icon,
  condition     = EXCLUDED.condition,
  fetched_at    = EXCLUDED.fetched_at;
```

Query Parameters : `{{ [$json.temperature_c, $json.icon, $json.condition] }}`

**Test** : Execute Workflow → vérifier `SELECT * FROM meteo;` → le chip météo du header affiche la température.

---

## 3. `caldav-agenda` — CalDAV (Infomaniak) → `calendar`

n8n n'a pas de node CalDAV natif. **Approche retenue : le node communautaire CalDAV** (Settings → Community Nodes), qui interroge directement le serveur CalDAV (ici Infomaniak, `sync.infomaniak.com` ; compatible Nextcloud, iCloud, etc.). Il remplace l'ancien export ICS : le node renvoie déjà les VEVENT en JSON, plus besoin de parser le brut.

**9 nodes : Schedule (15 min) → 3× CalDAV *Get Events in Range* (un node par calendrier : Perso / Maison / Pro) → Merge (3 entrées) → Code (normalise) → Postgres (upsert) → Code (collecte des uid) → Postgres (purge « ce qui n'est plus dans le fetch »).**

### Credential & node CalDAV

- Credential : **Basic Auth** — mot de passe d'application (pas le mot de passe principal du compte).
- Operation : **Get Events in Range**. Le node communautaire ne lit **qu'un calendrier à la fois** → **un node par calendrier** utile (**Perso / Maison / Pro**), réunis par un node **Merge** (3 entrées) avant la normalisation. **Exclus un éventuel « Jours fériés »**, sinon l'AgendaCard se remplit de fêtes. (Le node sait lister les calendriers via *Get Calendars*.)
- Fenêtre — c'est elle qui pilote ce qui remonte :
  - **Start** : `{{ $now.startOf('day').toISO() }}` — 00:00 aujourd'hui (fuseau du workflow ; vérifie `Europe/Paris` dans ⚙). Démarrer au début du jour, et non « maintenant », garde les événements du jour déjà commencés et les journées entières d'aujourd'hui.
  - **End** : `{{ $now.plus({ days: 30 }).toISO() }}` — horizon 30 j, large pour les 3 événements de l'AgendaCard et le countdown d'entretien.

### Sortie du node — 3 pièges

Un item par VEVENT, avec `uid`, `summary`, `start`/`end` (ISO UTC), `datetype`, parfois `location` / `description`. Trois quirks que le Code ci-dessous gère :

1. **Récurrences imbriquées** : les occurrences d'un récurrent sont rangées dans un objet `recurrences` *à l'intérieur* de l'item, et le niveau racine duplique la 1ʳᵉ → traiter `recurrences` **à la place** du racine quand il existe.
2. **`uid` partagé** : toutes les occurrences d'un récurrent ont le même `uid` (clé d'upsert) → uid synthétique `uid#date` par occurrence, sinon elles s'écrasent mutuellement.
3. **Champs polymorphes** : `url` est tantôt une string tantôt un objet `{val}` ; `location` parfois une URL de visio ; les journées entières ont `datetype: "date"` (minuit UTC) → on en tire le flag `all_day` pour les afficher « Toute la journée » plutôt qu'une heure parasite.

### Node Code (normalise → lignes `calendar`)

```js
// CalDAV "Get Events in Range" → lignes pour la table `calendar`
const NEXT_OCCURRENCE_ONLY = true;   // true = 1 seule (prochaine) occurrence par récurrent ; false = toutes
const now = Date.now();

const isInterview = (ev) =>
  /entretien|interview|recruteur|\brh\b|careers?\.|jobs\.|career-ops|video_meeting/i
    .test(`${ev.summary ?? ''}\n${ev.description ?? ''}`);

const rows = [];
function push(uid, ev, occKey) {
  if (!ev.start || !ev.summary) return;
  const start = new Date(ev.start);
  const end = ev.end ? new Date(ev.end) : start;
  rows.push({ json: {
    uid: occKey ? `${uid}#${occKey}` : uid,
    title: ev.summary.trim(),
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    location: typeof ev.location === 'string' ? ev.location : null,
    is_interview: isInterview(ev),
    all_day: ev.datetype === 'date',   // journée entière → affichée « Toute la journée »
  }});
}

for (const { json: e } of $input.all()) {
  if (e.type !== 'VEVENT') continue;

  if (e.recurrences && typeof e.recurrences === 'object') {
    let occs = Object.entries(e.recurrences)
      .filter(([, o]) => o.start)
      .sort((a, b) => new Date(a[1].start) - new Date(b[1].start));
    if (NEXT_OCCURRENCE_ONLY) {
      const next = occs.find(([, o]) => new Date(o.end ?? o.start) >= now) ?? occs[0];
      occs = next ? [next] : [];
    }
    for (const [key, o] of occs) push(e.uid, o, key);
  } else {
    push(e.uid, e);
  }
}
return rows;
```

> `NEXT_OCCURRENCE_ONLY = true` n'écrit que la prochaine occurrence d'un récurrent — sinon l'AgendaCard (3 événements) est noyée par les events quasi quotidiens (« Fixer objectifs + Brain dump »…). L'`is_interview` regarde titre **et** description (`careers.` / `jobs.` / `video_meeting`) : c'est ce qui attrape un entretien dont le titre ne dit pas « entretien » (ex. un événement « Prénom Nom / Société » dont la description pointe vers `careers.exemple.com`). Ajuste à ton vocabulaire.

### Node Postgres — upsert (s'exécute une fois par event)

```sql
INSERT INTO calendar (uid, title, starts_at, ends_at, location, is_interview, all_day, fetched_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
ON CONFLICT (uid) DO UPDATE SET
  title        = EXCLUDED.title,
  starts_at    = EXCLUDED.starts_at,
  ends_at      = EXCLUDED.ends_at,
  location     = EXCLUDED.location,
  is_interview = EXCLUDED.is_interview,
  all_day      = EXCLUDED.all_day,
  fetched_at   = EXCLUDED.fetched_at;
```

Query Parameters (node Postgres v2.6+ : **une expression renvoyant un tableau**, dans l'ordre des `$n`) : `{{ [$json.uid, $json.title, $json.starts_at, $json.ends_at, $json.location, $json.is_interview, $json.all_day] }}`

### Cleanup (événements supprimés / annulés dans l'agenda)

Un simple upsert ne retire jamais une ligne : un événement supprimé ou annulé côté agenda resterait un **fantôme** en base — visible dans l'AgendaCard jusqu'à son heure de fin d'origine (le filtre applicatif est `ends_at >= NOW()`), et jamais nettoyé. On applique donc le même cleanup que `notion-applications` (§4) : **supprime ce qui n'était pas dans le dernier fetch**.

Après l'upsert : node **Code** qui agrège les `uid` réellement écrits par la normalisation, puis node **Postgres**.

```js
// Code — collecte des uid du batch courant (ceux produits par le node de normalisation).
// Garde-fou : jamais de DELETE sur un batch vide.
const uids = $('Code in JavaScript').all().map(({ json }) => json.uid).filter(Boolean);
if (uids.length === 0) return [];
return [{ json: { uids } }];
```

```sql
DELETE FROM calendar WHERE uid <> ALL($1::text[]);
```

Query Parameters : `{{ [$json.uids] }}`

> **Garde-fous anti-wipe (3 couches)** : (1) si les 3 calendriers renvoient un fetch vide, la normalisation sort `[]` et la chaîne s'arrête avant le DELETE ; (2) le node Code renvoie `[]` quand `uids` est vide — **indispensable**, car `uid <> ALL('{}'::text[])` est vrai pour **toutes** les lignes et viderait la table ; (3) un calendrier CalDAV en **erreur** dure stoppe le workflow avant le Merge. **Risque résiduel accepté** (identique à `notion-applications`) : si **un seul** des 3 calendriers renvoie vide *sans* lever d'erreur (souci transitoire), ses événements sont supprimés puis **réinsérés au tick suivant** — impact faible, auto-réparé.

**Test** : Execute Workflow → `SELECT uid, title, starts_at, is_interview, all_day FROM calendar ORDER BY starts_at;` → l'AgendaCard affiche les 3 prochains événements. Puis **supprime un événement** dans l'agenda et relance : sa ligne disparaît de la table (purge « pas dans le fetch »).

---

## 4. `notion-applications` — Notion → `applications`

**4 nodes : Schedule (10 min) → Notion (Get Many) → Code (mapping) → Postgres (upsert) — puis cleanup (2 nodes), voir plus bas.**

### Node Notion

- Resource `Database Page`, Operation `Get Many`
- Database : `<NOTION_DB_ID>`
- Return All : ON ; Options → « Simplify Output » : **ON**. Avec Simplify, le node renvoie un item plat par page : `id`, `name` (titre = le poste), `url`, et **une clé `property_<nom>` par propriété** (nom snake_case, sans accent). Les dates arrivent comme objet `{ start, end, time_zone }`, les checkbox comme booléen, les relations comme tableau d'ids. C'est cette forme qu'on mappe ci-dessous.

> Propriétés réelles de la DB (constatées sur la sortie) : `property_entreprise`, `property_poste`, `property_status`, `property_date_prochaine_action`, `property_application_date`, `property_commentaire`, `property_relance` (checkbox), `property_url`, `property_alerte`, `property_dashboard` (relation). Pas de propriété `Score`.

### Node Code (mapping propriétés)

⚠️ **Point de compatibilité critique — la canonicalisation du statut.** La DB Notion est en français (`Candidature envoyée`, `Entretien RH`, `Refus`), mais l'app code en dur des clés **anglaises** : `JobCard` lit `kpis['Applied']` / `kpis['Evaluated']` / `kpis['Interview']`, et `getPendingFollowups()` filtre `WHERE status = 'Applied'`. Sans la table de correspondance ci-dessous, tous les KPI restent à 0 et « Relances dues » ne se déclenche jamais. (Alternative : franciser l'app à la place — mais tant qu'elle attend `Applied`, on traduit ici.)

```js
// Notion "Get Many" (Simplify Output: ON) → lignes pour la table `applications`.
// On traduit les statuts FR de Notion vers les clés canoniques attendues par l'app.
const STATUS = {
  'Candidature envoyée': 'Applied',
  'Entretien RH':        'Interview',
  'Refus':               'Rejected',
  // 'En cours d’évaluation': 'Evaluated',  // ajoute tes statuts au fur et à mesure
};

const date = (d) => (d && d.start) ? d.start : null;   // {start,end,time_zone} → "2026-06-16"

return $input.all()
  .filter(({ json: p }) => p.property_entreprise || p.property_status)  // ignore la page vide/brouillon
  .map(({ json: p }) => ({ json: {
    notion_id:    p.id,
    company:      p.property_entreprise || '—',
    role:         p.property_poste || p.name || null,
    status:       STATUS[p.property_status] ?? p.property_status ?? 'Unknown',
    score:        null,                                  // pas de propriété Score dans cette DB
    last_contact: date(p.property_application_date),     // colonne DATE
    next_event:   date(p.property_date_prochaine_action),// colonne TIMESTAMPTZ (date → minuit)
    notes:        p.property_commentaire || null,
  }}));
```

> Notes : `property_application_date` → `last_contact` (c'est la date d'envoi, qui pilote l'âge des relances dans `getPendingFollowups`). La checkbox `property_relance` n'a **pas** de colonne dédiée : l'app recalcule elle-même les relances dues (statut `Applied` + `last_contact` > 7 j), donc elle n'est pas synchronisée — c'est volontaire. `property_alerte` (⚠️) n'est pas un score et reste ignoré.

### Node Postgres — upsert (une fois par page)

```sql
INSERT INTO applications (notion_id, company, role, status, score, last_contact, next_event, notes, fetched_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
ON CONFLICT (notion_id) DO UPDATE SET
  company      = EXCLUDED.company,
  role         = EXCLUDED.role,
  status       = EXCLUDED.status,
  score        = EXCLUDED.score,
  last_contact = EXCLUDED.last_contact,
  next_event   = EXCLUDED.next_event,
  notes        = EXCLUDED.notes,
  fetched_at   = EXCLUDED.fetched_at;
```

Query Parameters : `{{ [$json.notion_id, $json.company, $json.role, $json.status, $json.score, $json.last_contact, $json.next_event, $json.notes] }}`

### Cleanup (pages supprimées dans Notion)

Après l'upsert : node **Code** (Execute Once = ON) qui agrège les ids du batch, puis node **Postgres** :

```js
// Code node — collecte des ids du batch courant (Simplify ON : id au niveau racine)
const ids = $('Notion').all().map(({ json }) => json.id);
return [{ json: { ids } }];
```

```sql
DELETE FROM applications WHERE notion_id <> ALL($1::text[]);
```

Query Parameters : `{{ [$json.ids] }}`

> Garde-fou : si le node Notion renvoie 0 page (panne API), le `Get Many` échoue ou sort vide — dans ce cas le workflow s'arrête avant le DELETE (n8n ne lance pas les nodes suivants sans item). Ne change pas ce comportement, c'est lui qui protège d'un wipe.

**Test** : Execute Workflow → `SELECT status, COUNT(*) FROM applications GROUP BY status;` → la JobCard affiche les KPIs. Modifie une fiche dans Notion, relance, vérifie la mise à jour.

---

## 5. `uptime-services` — Uptime Kuma → `services`

La status page publique d'Uptime Kuma expose deux endpoints JSON (remplace `<slug>` par le slug de ta page, visible dans son URL) :

- `GET https://<kuma>/api/status-page/<slug>` → groupes + monitors (`id`, `name`, `url`)
- `GET https://<kuma>/api/status-page/heartbeat/<slug>` → `heartbeatList` (dernier statut par monitor) + `uptimeList` (clé `"<id>_24"`)

**5 nodes : Schedule (5 min) → 2× HTTP Request (en parallèle) → Merge → Code → Postgres.**

### Node Code (après Merge des deux réponses)

```js
const all = $input.all().map(i => i.json);
const meta = all.find(j => j.publicGroupList);
const hb   = all.find(j => j.heartbeatList);

const monitors = meta.publicGroupList.flatMap(g => g.monitorList);
return monitors.map(m => {
  const beats = hb.heartbeatList[m.id] ?? [];
  const last = beats[beats.length - 1];
  const uptime = hb.uptimeList[`${m.id}_24`];
  return { json: {
    name: m.name,
    status: last ? (last.status === 1 ? 'up' : 'down') : 'unknown',
    uptime_24h: uptime != null ? Math.round(uptime * 10000) / 100 : null,  // 0.9998 → 99.98
    url: m.url ?? null,
  }};
});
```

### Node Postgres — upsert (une fois par monitor)

```sql
INSERT INTO services (name, status, uptime_24h, url, fetched_at)
VALUES ($1, $2, $3, $4, NOW())
ON CONFLICT (name) DO UPDATE SET
  status     = EXCLUDED.status,
  uptime_24h = EXCLUDED.uptime_24h,
  url        = EXCLUDED.url,
  fetched_at = EXCLUDED.fetched_at;
```

Query Parameters : `{{ [$json.name, $json.status, $json.uptime_24h, $json.url] }}`

**Test** : Execute Workflow → la HomelabCard affiche `X/Y up`. Coupe un service de test, attends ≤ 5 min, vérifie le passage en `down`.

---

## 6. `github-commits` — GitHub → `signals.last_commit_*`

**4 nodes : Schedule (15 min) → HTTP Request (repo le plus récent) → HTTP Request (dernier commit) → Postgres.**

### Node HTTP 1 — repo le plus récemment poussé

- `GET https://api.github.com/user/repos?sort=pushed&direction=desc&per_page=1`
- Credential Header Auth GitHub + Header `Accept: application/vnd.github+json`

### Node HTTP 2 — dernier commit de ce repo

- `GET https://api.github.com/repos/{{ $json.full_name }}/commits?per_page=1`

### Node Postgres

```sql
INSERT INTO signals (id, last_commit_at, last_commit_message, last_commit_repo, fetched_at)
VALUES (1, $1, $2, $3, NOW())
ON CONFLICT (id) DO UPDATE SET
  last_commit_at      = EXCLUDED.last_commit_at,
  last_commit_message = EXCLUDED.last_commit_message,
  last_commit_repo    = EXCLUDED.last_commit_repo,
  fetched_at          = EXCLUDED.fetched_at;
```

Query Parameters :
`{{ [$json.commit.author.date, $json.commit.message.split('\n')[0], $('HTTP 1').first().json.name] }}`

> **Variante Gitea** (si tes repos actifs sont sur le Gitea du homelab) : l'API est compatible — `GET https://<gitea>/api/v1/repos/search?sort=updated&order=desc&limit=1&token=<token>` puis `GET /api/v1/repos/{owner}/{name}/commits?limit=1`. Même node Postgres.

**Test** : Execute Workflow → HomelabCard affiche le dernier commit.

---

## 7. `backups-status` — outil de backup → `signals.backups_*`

⚠️ **Outil source à confirmer** (open item du spec v1). Template générique, à brancher sur ce que tu utilises :

- **Healthchecks.io / self-hosted** : `GET https://<hc>/api/v3/checks/` (header `X-Api-Key`) → `status` du check backup (`up` → ok, `grace` → warning, `down` → fail), `last_ping` → `backups_last_run_at`.
- **restic / borgmatic via cron** : fais pinguer un check Healthchecks ou un monitor push Uptime Kuma à la fin du script, puis lis ce statut ici.

**3-4 nodes : Schedule (1 h) → HTTP Request → Code → Postgres.**

### Node Code (règle de décision recommandée)

```js
const j = $input.first().json;       // adapte à la réponse de ton outil
const lastRun = new Date(j.last_ping);
const ageH = (Date.now() - lastRun.getTime()) / 3600_000;
const status = j.status === 'down' ? 'fail' : ageH < 26 ? 'ok' : ageH < 48 ? 'warning' : 'fail';
return [{ json: { status, last_run_at: lastRun.toISOString() } }];
```

### Node Postgres

```sql
INSERT INTO signals (id, backups_status, backups_last_run_at, fetched_at)
VALUES (1, $1, $2, NOW())
ON CONFLICT (id) DO UPDATE SET
  backups_status      = EXCLUDED.backups_status,
  backups_last_run_at = EXCLUDED.backups_last_run_at,
  fetched_at          = EXCLUDED.fetched_at;
```

Query Parameters : `{{ [$json.status, $json.last_run_at] }}`

(Contrainte table : `backups_status` ∈ `ok` | `warning` | `fail`.)

---

## 8. `todo-notion-sync` — webhook app → Notion

Sens sortant : l'app pousse chaque mutation de todo (fire-and-forget, timeout 1 s — voir `src/lib/n8n.ts`). Contrat du payload :

```json
{
  "action": "created | updated | toggled | deleted",
  "todo": { "id": 7, "text": "…", "done": false, "is_focus": false, "position": 3 }
}
```

### Préparation côté Notion (une fois)

Dans ta DB todos Notion existante, ajoute une propriété **`Launcher ID`** (type *Number*) : c'est la clé de correspondance avec `todos.id` côté launcher. Partage la DB avec l'intégration.

### Node Webhook (trigger)

- HTTP Method `POST`, Path `todo-sync` → URL prod : `https://n8n.example.com/webhook/todo-sync` (doit égaler `N8N_TODO_WEBHOOK_URL`)
- Authentication : `Header Auth` — Name `X-Webhook-Token`, Value = `N8N_TODO_WEBHOOK_TOKEN` (`.env`)
- Respond : **Immediately** (l'app n'attend pas la réponse)

### Node Switch (sur `{{ $json.body.action }}`)

3 sorties : `created` / `updated` + `toggled` / `deleted`.

**Branche `created`** — node Notion :
- Resource `Database Page`, Operation `Create`
- Title ← `{{ $json.body.todo.text }}`
- Propriétés : `Launcher ID` ← `{{ $json.body.todo.id }}`, case à cocher « done » ← `{{ $json.body.todo.done }}` (adapte aux noms de tes propriétés)

**Branches `updated`/`toggled` et `deleted`** — d'abord retrouver la page :
- Node Notion : Operation `Get Many`, Filter → `Launcher ID` equals `{{ $json.body.todo.id }}`, Limit 1
- Puis node Notion `Update` (texte/done) — ou `Archive` pour `deleted`
- Si aucune page trouvée sur `updated` : branche optionnelle vers le node `Create` (auto-réparation) ; sinon ignore.

- Settings des nodes Notion : `Retry On Fail` 3×, 5 s (couvre le « Retry 3x sur 5xx » du spec).

**Test** : coche/ajoute une todo dans le launcher → la page apparaît/se met à jour dans Notion en < 5 s. Coupe n8n : l'app doit rester fluide (le push est fire-and-forget, échec loggé en `console.warn`).

---

## 9. Checklist de mise en service

1. ☐ Credential Postgres `n8n_writer` testé (`SELECT 1`)
2. ☐ Workflows importés/créés, timezone `Europe/Paris`, activés un par un
3. ☐ Pour chacun : exécution manuelle OK → ligne(s) en DB → carte du cockpit alimentée
4. ☐ `todo-notion-sync` : aller-retour testé depuis l'UI (created, toggled, deleted)
5. ☐ Mapping statuts vérifié : la table `STATUS` du §4 couvre tous les statuts FR de ta DB Notion → clés canoniques (`Applied` / `Interview` / …) ; un statut non traduit passe tel quel et fausse les KPI
6. ☐ Chaque workflow exporté (⋯ → Download) → remplace le stub dans `n8n/workflows/` → commit
7. ☐ Après 24 h : aucun badge stale sur le cockpit ; sinon ouvrir n8n → Executions du workflow concerné

## 10. Debug rapide

| Symptôme | Piste |
|---|---|
| Carte vide + badge stale | Workflow inactif ou en échec → n8n Executions ; vérifier `SELECT fetched_at FROM <table>;` |
| `permission denied for table …` | Mauvais credential (utiliser `n8n_writer`), ou table hors périmètre du rôle |
| `canceling statement due to statement timeout` | Requête > 10 s (timeout du rôle) — batcher ou simplifier |
| Webhook 403 | `X-Webhook-Token` ≠ `N8N_TODO_WEBHOOK_TOKEN` |
| Notion 404 | DB non partagée avec l'intégration |
| `connection refused` vers `postgres` | n8n pas sur le réseau `shared-n8n`, ou stack launcher down |
