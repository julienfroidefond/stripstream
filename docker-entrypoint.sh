#!/bin/sh
set -e

echo "📁 Ensuring data directory exists..."
mkdir -p /app/data

echo "🔄 Pushing Prisma schema to database..."
npx prisma db push --skip-generate --accept-data-loss

echo "🔧 Initializing database..."
node scripts/init-db.mjs

echo "🚀 Starting application..."
exec pnpm start

