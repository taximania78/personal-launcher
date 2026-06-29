-- Up Migration
-- Décommissionnement de la collecte de stats blog : l'API stats Umami est passée
-- derrière le plan Pro, le workflow n8n `umami-blog` ne peut plus l'alimenter.
-- On retire la donnée morte plutôt que de la laisser se figer.
ALTER TABLE signals DROP COLUMN blog_visitors_today;
