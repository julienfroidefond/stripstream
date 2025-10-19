#!/bin/sh
set -e

echo "🔄 Pushing Prisma schema to database..."
npx prisma db push --skip-generate --accept-data-loss

echo "🔧 Initializing database..."
node scripts/init-db.mjs

echo "🚀 Starting application..."
exec pnpm start

