#!/bin/sh
set -e

echo "🔄 Applying database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "🔧 Initializing database..."
# Exit code 3 = admin account missing and ADMIN_DEFAULT_PASSWORD empty: the
# admin is not created (no default password), but the app still starts so the
# container does not restart in a loop. Any other failure stops the boot.
set +e
./node_modules/.bin/tsx scripts/init-db.ts
init_status=$?
set -e
if [ "$init_status" -eq 3 ]; then
  echo "⚠️  Admin account not created (set ADMIN_DEFAULT_PASSWORD and restart). Starting anyway."
elif [ "$init_status" -ne 0 ]; then
  exit "$init_status"
fi

echo "🚀 Starting application..."
exec node server.js
