-- Up Migration

CREATE TABLE agent_tokens (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  token_hash    TEXT NOT NULL UNIQUE,
  token_prefix  TEXT NOT NULL,
  last_used_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX agent_tokens_active ON agent_tokens(token_hash) WHERE revoked_at IS NULL;

GRANT SELECT                         ON agent_tokens TO app_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_tokens TO app_writer;
GRANT USAGE, SELECT ON SEQUENCE agent_tokens_id_seq TO app_writer;
