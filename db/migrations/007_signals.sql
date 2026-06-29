-- Up Migration

CREATE TABLE signals (
  id                    SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  blog_visitors_today   INTEGER,
  last_commit_at        TIMESTAMPTZ,
  last_commit_message   TEXT,
  last_commit_repo      TEXT,
  backups_status        TEXT CHECK (backups_status IN ('ok','warning','fail')),
  backups_last_run_at   TIMESTAMPTZ,
  fetched_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT                  ON signals TO app_reader;
GRANT SELECT, INSERT, UPDATE  ON signals TO n8n_writer;
