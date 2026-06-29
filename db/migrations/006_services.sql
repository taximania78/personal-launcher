-- Up Migration

CREATE TABLE services (
  name        TEXT PRIMARY KEY,
  status      TEXT NOT NULL CHECK (status IN ('up','down','unknown')),
  uptime_24h  NUMERIC(5,2),
  url         TEXT,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT                         ON services TO app_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON services TO n8n_writer;
