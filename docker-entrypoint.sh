#!/bin/sh
set -e

echo "🔄 Applying database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "🔧 Initializing database..."
./node_modules/.bin/tsx scripts/init-db.ts

echo "🚀 Starting application..."
exec node server.js
