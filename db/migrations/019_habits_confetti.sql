-- Up Migration
-- Réglage on/off des confettis lancés quand toutes les habitudes du jour sont
-- cochées (déclenchement calculé côté client ; seule la préférence vit en DB).
-- La colonne hérite des GRANT déjà posés sur app_config (cf. 009_app_config.sql).

ALTER TABLE app_config ADD COLUMN confetti_enabled BOOLEAN NOT NULL DEFAULT TRUE;
