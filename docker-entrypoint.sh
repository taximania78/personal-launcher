#!/bin/sh
set -e

# Build the admin URL with GUC options for the migration to read passwords
# Required vars: PG_ADMIN_URL_BASE (e.g. postgres://postgres:pwd@postgres:5432/launcher)
# plus APP_READER_PWD, APP_WRITER_PWD, N8N_WRITER_PWD

if [ -z "$PG_ADMIN_URL_BASE" ]; then
  echo "ERROR: PG_ADMIN_URL_BASE not set" >&2
  exit 1
fi

# URL-encode the option string
OPTS="-c%20app.reader_pwd%3D${APP_READER_PWD}%20-c%20app.writer_pwd%3D${APP_WRITER_PWD}%20-c%20app.n8n_pwd%3D${N8N_WRITER_PWD}"
export DATABASE_URL_ADMIN="${PG_ADMIN_URL_BASE}?options=${OPTS}"

echo "Running migrations..."
node /migrate/node_modules/node-pg-migrate/bin/node-pg-migrate \
  -m db/migrations -j sql -d DATABASE_URL_ADMIN up

echo "Starting Next.js..."
exec node server.js
