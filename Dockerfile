# Build stage
FROM node:20-alpine AS builder

# Declare MONGODB_URI as an argument for the builder stage
ARG MONGODB_URI
ENV MONGODB_URI=$MONGODB_URI

# Set working directory
WORKDIR /app

# Configure pnpm store location
ENV PNPM_HOME="/app/.pnpm-store"

# Install dependencies for node-gyp
RUN apk add --no-cache python3 make g++

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy package files first to leverage Docker cache
COPY package.json pnpm-lock.yaml ./

# Copy Prisma schema
COPY prisma ./prisma

# Copy configuration files
COPY tsconfig.json .eslintrc.json ./
COPY tailwind.config.ts postcss.config.js ./

# Install dependencies with pnpm
RUN pnpm config set store-dir /app/.pnpm-store && \
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
FROM node:20-alpine AS runner

WORKDIR /app

# Install OpenSSL (required by Prisma)
RUN apk add --no-cache openssl libc6-compat

# Copy package files and prisma schema
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy the entire node_modules from builder (includes Prisma Client)
COPY --from=builder /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next-env.d.ts ./
COPY --from=builder /app/tailwind.config.ts ./
COPY --from=builder /app/scripts ./scripts

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/.cache && \
    chown -R nextjs:nodejs /app /app/.cache && \
    chown nextjs:nodejs docker-entrypoint.sh

USER nextjs

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Expose the port the app runs on
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application (push schema, init DB, then start)
CMD ["./docker-entrypoint.sh"] 