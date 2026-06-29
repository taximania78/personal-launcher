-- Up Migration

CREATE TABLE app_config (
  id             SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  whoogle_url    TEXT,
  focus_default  TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_config (id) VALUES (1) ON CONFLICT DO NOTHING;

GRANT SELECT                  ON app_config TO app_reader;
GRANT SELECT, INSERT, UPDATE  ON app_config TO app_writer;
