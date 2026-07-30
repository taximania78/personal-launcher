@AGENTS.md

## Ce repo est public

Tout ce que tu écris ici est indexable : code, commentaires, docs, **messages de commit**, titres et corps de PR, issues, noms de branches.

Avant d'écrire sur l'un de ces supports, vérifie qu'il ne contient pas :

- **des identités issues des données perso** — entreprises de la recherche d'emploi, personnes, recruteurs. Désigne-les par leur statut ou leur forme (« une candidature en `Case study` »), jamais par leur nom. Vaut aussi pour un exemple qui « illustre mieux » : c'est exactement là que ça fuit ;
- **des données réelles** tirées de la base ou d'une exécution n8n — contenus de notes, dates d'entretien, montants, volumes de candidatures. Anonymise ou invente un jeu d'exemple ;
- **des éléments d'infra** — hostnames et IP du homelab, tokens, mots de passe, même de dev.

Une fuite ne se rattrape pas. Sur GitHub, un force-push rend l'ancien commit orphelin mais il reste atteignable par son SHA, souvent indéfiniment ; seul le support GitHub peut le purger. Le seul moment où ça ne coûte rien, c'est avant d'écrire.

En cas de doute sur une donnée à publier, demande — ne tranche pas seul.

Côté code, les valeurs personnelles d'affichage passent par `NEXT_PUBLIC_*` et `src/lib/site-config.ts`, jamais en dur.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
