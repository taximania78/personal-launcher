-- Up Migration

CREATE TABLE app_appearance (
  id                     SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  background_image_path  TEXT,
  background_dim_pct     SMALLINT NOT NULL DEFAULT 35 CHECK (background_dim_pct BETWEEN 0 AND 60),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_appearance (id) VALUES (1) ON CONFLICT DO NOTHING;

GRANT SELECT                  ON app_appearance TO app_reader;
GRANT SELECT, INSERT, UPDATE  ON app_appearance TO app_writer;
