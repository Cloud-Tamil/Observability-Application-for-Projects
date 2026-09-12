#!/bin/sh
set -e

echo "▶ Running prisma migrate deploy..."
npx prisma migrate deploy

if [ "${SEED_ON_START}" = "true" ]; then
  echo "▶ Seeding database (idempotent upserts)..."
  node dist/prisma/seed.js || echo "⚠ Seed skipped/failed (non-fatal)"
fi

echo "▶ Starting API on :${PORT:-4000}"
exec node dist/index.js
