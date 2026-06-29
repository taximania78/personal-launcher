-- Up Migration

DO $$
DECLARE
  v_reader_pwd  TEXT;
  v_writer_pwd  TEXT;
  v_n8n_pwd     TEXT;
BEGIN
  v_reader_pwd := current_setting('app.reader_pwd',  true);
  v_writer_pwd := current_setting('app.writer_pwd',  true);
  v_n8n_pwd    := current_setting('app.n8n_pwd',     true);

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_reader') THEN
    EXECUTE format('CREATE ROLE app_reader LOGIN PASSWORD %L', v_reader_pwd);
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_writer') THEN
    EXECUTE format('CREATE ROLE app_writer LOGIN PASSWORD %L', v_writer_pwd);
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'n8n_writer') THEN
    EXECUTE format('CREATE ROLE n8n_writer LOGIN PASSWORD %L', v_n8n_pwd);
  END IF;
END $$;

-- Le nom de la base diffère selon l'environnement (launcher en local/prod,
-- launcher_test en CI) : on accorde CONNECT sur la base courante, pas un nom figé.
DO $$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO app_reader, app_writer, n8n_writer',
    current_database()
  );
END $$;

GRANT USAGE ON SCHEMA public TO app_reader, app_writer, n8n_writer;

ALTER ROLE app_reader SET statement_timeout = '2s';
ALTER ROLE app_writer SET statement_timeout = '5s';
