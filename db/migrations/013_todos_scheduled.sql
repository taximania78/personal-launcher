-- Up Migration
ALTER TABLE todos ADD COLUMN scheduled_for DATE;

UPDATE todos SET scheduled_for = (created_at AT TIME ZONE 'Europe/Paris')::date;

ALTER TABLE todos
  ALTER COLUMN scheduled_for SET NOT NULL,
  ALTER COLUMN scheduled_for SET DEFAULT CURRENT_DATE;

CREATE INDEX todos_scheduled ON todos(scheduled_for) WHERE done = FALSE;
