# Contribuer

Ce dépôt est un **projet personnel mono-utilisateur**, publié pour servir
d'exemple et parce que le code peut être utile à d'autres. Il n'est pas conçu
comme un projet communautaire.

## Pull requests

**Les pull requests externes ne sont pas acceptées.** Ce n'est rien de personnel :
je n'ai pas la bande passante pour les relire, et le launcher est taillé pour un
homelab précis. Une PR ouverte ici sera fermée sans être relue.

Si le projet t'est utile, **forke-le**. La licence MIT te le permet sans condition.

## Bugs et questions

Les issues sont désactivées, pour la même raison.

## Failles de sécurité

C'est le seul canal ouvert, et il est traité. Voir [SECURITY.md](SECURITY.md) :
utilise le signalement privé de GitHub (onglet *Security* → *Report a vulnerability*).
N'ouvre pas de discussion publique pour une faille.

## Si tu forkes

Deux choses valent la peine d'être sues avant de lancer le code :

- Le front n'a **aucune authentification**, par choix. Il est destiné à un LAN de
  confiance ou à un reverse-proxy avec auth en amont. Lis [SECURITY.md](SECURITY.md).
- Pour lancer en local, c'est `pnpm dev:up`, et rien d'autre. Le `docker-compose.yml`
  de la racine est le déploiement homelab et ne démarrera pas sur une machine de dev.
  Voir [AGENTS.md](AGENTS.md).
