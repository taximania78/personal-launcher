-- Up Migration

CREATE TABLE meteo (
  id             SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  location       TEXT NOT NULL,
  temperature_c  NUMERIC(4,1) NOT NULL,
  icon           TEXT NOT NULL,
  condition      TEXT,
  fetched_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT                  ON meteo TO app_reader;
GRANT SELECT, INSERT, UPDATE  ON meteo TO n8n_writer;
