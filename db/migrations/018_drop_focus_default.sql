-- Up Migration
-- La bannière focus n'a plus de texte de repli (spec v2 §3.5) : l'état vide
-- est honnête (« Aucun focus défini »). Plus aucun code ne lit cette colonne.
ALTER TABLE app_config DROP COLUMN focus_default;
