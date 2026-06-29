-- Up Migration

CREATE TABLE habits (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  icon        TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE habit_checks (
  habit_id    BIGINT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  day         DATE NOT NULL,
  checked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (habit_id, day)
);

CREATE INDEX habit_checks_day ON habit_checks(day);

GRANT SELECT                         ON habits, habit_checks TO app_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON habits, habit_checks TO app_writer;
GRANT USAGE, SELECT ON SEQUENCE habits_id_seq TO app_writer;
