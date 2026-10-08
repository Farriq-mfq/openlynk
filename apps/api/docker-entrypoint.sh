#!/bin/sh
# Production entrypoint: apply pending migrations, then serve the api.
set -e

if [ -z "$JWT_SECRET" ]; then
  echo "ERROR: JWT_SECRET is empty. Set it in your .env (see .env.example)." >&2
  exit 1
fi

echo "Applying database migrations..."
bun src/db/migrate.ts

echo "Starting api..."
exec bun dist/index.js
