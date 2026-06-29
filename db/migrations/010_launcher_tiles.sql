-- Up Migration

CREATE TABLE launcher_tiles (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 32),
  icon        TEXT NOT NULL,
  href        TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX launcher_tiles_position ON launcher_tiles(position);

GRANT SELECT                         ON launcher_tiles TO app_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON launcher_tiles TO app_writer;
GRANT USAGE, SELECT ON SEQUENCE launcher_tiles_id_seq TO app_writer;
