-- Up Migration

CREATE TABLE calendar (
  uid           TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ NOT NULL,
  location      TEXT,
  is_interview  BOOLEAN NOT NULL DEFAULT FALSE,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full index on starts_at (no volatile NOW() predicate — see IMMUTABLE constraint)
CREATE INDEX calendar_upcoming  ON calendar(starts_at);
CREATE INDEX calendar_interview ON calendar(starts_at) WHERE is_interview = TRUE;

GRANT SELECT                         ON calendar TO app_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON calendar TO n8n_writer;
