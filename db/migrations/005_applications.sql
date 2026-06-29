-- Up Migration

CREATE TABLE applications (
  notion_id     TEXT PRIMARY KEY,
  company       TEXT NOT NULL,
  role          TEXT,
  status        TEXT NOT NULL,
  score         TEXT,
  last_contact  DATE,
  next_event    TIMESTAMPTZ,
  notes         TEXT,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX applications_status       ON applications(status);
CREATE INDEX applications_next_event   ON applications(next_event) WHERE next_event IS NOT NULL;
CREATE INDEX applications_last_contact ON applications(last_contact);

GRANT SELECT                         ON applications TO app_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON applications TO n8n_writer;
