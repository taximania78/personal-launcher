-- Up Migration

CREATE TABLE todos (
  id          BIGSERIAL PRIMARY KEY,
  text        TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 280),
  done        BOOLEAN NOT NULL DEFAULT FALSE,
  position    INTEGER NOT NULL DEFAULT 0,
  is_focus    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX todos_only_one_focus
  ON todos ((1))
  WHERE is_focus = TRUE;

CREATE INDEX todos_active ON todos(position) WHERE done = FALSE;

GRANT SELECT                         ON todos TO app_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON todos TO app_writer;
GRANT USAGE, SELECT ON SEQUENCE todos_id_seq TO app_writer;
