# Politique de sécurité

## Scope du projet

Ce launcher est un outil **mono-utilisateur** pensé pour un homelab. Il n'embarque
**aucune authentification** : toute personne pouvant joindre l'application peut
utiliser l'ensemble de ses routes, y compris `/api/config/*` (gestion des tokens
agent) et l'upload d'image de fond. C'est un choix d'architecture assumé.

➡️ À déployer **uniquement sur un réseau de confiance** (LAN) ou **derrière une
couche d'authentification en amont** (reverse proxy / Authelia / forward-auth).
Ne l'exposez pas directement sur Internet sans auth devant.

## Signaler une vulnérabilité

Merci de **ne pas ouvrir d'issue publique** pour un problème de sécurité.

Utilisez plutôt le signalement privé de GitHub :
**onglet _Security_ → _Report a vulnerability_** (Private vulnerability reporting).

Vous recevrez un accusé de réception et un suivi via l'advisory privé.

## Versions supportées

Seule la branche `main` (dernier état) est maintenue.
