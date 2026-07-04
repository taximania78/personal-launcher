-- Up Migration
-- Refonte « miroir d'engagements » v2 (spec 2026-07-04) : compteur de reports,
-- focus unique PAR JOUR (poser demain sans écraser aujourd'hui), journal
-- quotidien (mémoire des rituels agent) et priorités de la semaine.

-- 1. Compteur de reports (incrémenté côté serveur au report explicite, cf. rescheduleTodo).
ALTER TABLE todos ADD COLUMN postponed_count INT NOT NULL DEFAULT 0;

-- 2. Focus unique par jour, et non plus global.
DROP INDEX todos_only_one_focus;
CREATE UNIQUE INDEX todos_one_focus_per_day
  ON todos (scheduled_for)
  WHERE is_focus = TRUE;

-- 3. Journal quotidien : une ligne par date. Écrit par l'agent ; deep_work aussi via l'UI.
CREATE TABLE day_journal (
  day            DATE PRIMARY KEY,
  focus_todo_id  BIGINT REFERENCES todos(id) ON DELETE SET NULL,
  focus_text     TEXT,
  why            TEXT,
  focus_outcome  TEXT NOT NULL DEFAULT 'not_set'
                   CHECK (focus_outcome IN ('done', 'reported', 'expired', 'not_set')),
  report_reason  TEXT CHECK (report_reason IN
                   ('trop_gros', 'imprevu', 'evite', 'plus_pertinent', 'autre')),
  report_comment TEXT,
  deep_work      BOOLEAN,
  shutdown_at    TIMESTAMPTZ,
  shutdown_mode  TEXT CHECK (shutdown_mode IN ('normal', 'degrade')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT                         ON day_journal TO app_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON day_journal TO app_writer;

-- 4. Priorités de la semaine (1 à 3 ; limite appliquée côté app, pas en SQL).
CREATE TABLE week_priorities (
  id         BIGSERIAL PRIMARY KEY,
  week_start DATE NOT NULL CHECK (EXTRACT(ISODOW FROM week_start) = 1),
  text       TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 120),
  done       BOOLEAN NOT NULL DEFAULT FALSE,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX week_priorities_week_idx ON week_priorities (week_start);

GRANT SELECT                         ON week_priorities TO app_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON week_priorities TO app_writer;
GRANT USAGE, SELECT ON SEQUENCE week_priorities_id_seq TO app_writer;
