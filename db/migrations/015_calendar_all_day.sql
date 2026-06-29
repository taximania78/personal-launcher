-- Up Migration
-- Journées entières : le node CalDAV les marque `datetype: "date"`. Sans ce
-- drapeau, l'AgendaCard les affiche avec une heure parasite (minuit UTC →
-- « 01:00 »/« 02:00 » Paris). On stocke le flag pour afficher « Toute la journée ».
ALTER TABLE calendar ADD COLUMN all_day BOOLEAN NOT NULL DEFAULT FALSE;
