# Build stage
FROM node:25-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies for node-gyp
RUN apk add --no-cache python3 make g++

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy package files first to leverage Docker cache
COPY package.json pnpm-lock.yaml ./

# Copy Prisma schema
COPY prisma ./prisma

# Copy configuration files
COPY tsconfig.json eslint.config.mjs next.config.js ./
COPY postcss.config.js ./
COPY prisma.config.ts ./

# Install dependencies with pnpm using cache mount for store
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Generate Prisma Client
RUN pnpm prisma generate

# Copy source files
COPY src ./src
COPY public ./public
COPY scripts ./scripts

# Build the application
RUN pnpm build

# Production stage
FROM node:25-alpine AS runner

WORKDIR /app

# Install OpenSSL (required by Prisma)
RUN apk add --no-cache openssl libc6-compat

# Copy standalone output (server.js + minimal node_modules)
COPY --from=builder /app/.next/standalone ./

# Copy static assets and public directory
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy full node_modules for Prisma CLI (pnpm symlinks prevent cherry-picking)
COPY --from=builder /app/node_modules ./node_modules

# Copy prisma schema, config and init scripts
COPY prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY package.json ./
COPY prisma.config.ts ./

# Generated Prisma Client (imported by the tsx init script)
COPY --from=builder /app/src/generated ./src/generated

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/.cache /app/data && \
    chown -R nextjs:nodejs /app /app/.cache /app/data && \
    chown nextjs:nodejs docker-entrypoint.sh

USER nextjs

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"

# Expose the port the app runs on
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application (push schema, init DB, then start)
CMD ["./docker-entrypoint.sh"] 