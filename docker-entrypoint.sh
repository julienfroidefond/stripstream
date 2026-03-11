#!/bin/sh
set -e

echo "🔄 Applying database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "🔧 Initializing database..."
node scripts/init-db.mjs

echo "🚀 Starting application..."
exec node server.js
