# Build stage
FROM node:20-alpine AS builder

# Declare MONGODB_URI as an argument for the builder stage
ARG MONGODB_URI
ENV MONGODB_URI=$MONGODB_URI

# Set working directory
WORKDIR /app

# Install dependencies for node-gyp
RUN apk add --no-cache python3 make g++

# Enable Yarn
RUN corepack enable

# Copy package files first to leverage Docker cache
COPY package.json yarn.lock ./

# Copy configuration files
COPY tsconfig.json .eslintrc.json ./
COPY tailwind.config.ts postcss.config.js ./

# Install dependencies with Yarn
RUN yarn install --frozen-lockfile

# Copy source files
COPY src ./src
COPY public ./public

# Build the application
RUN yarn build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies only
COPY package.json yarn.lock ./
RUN corepack enable && \
    yarn install --production --frozen-lockfile && \
    yarn cache clean

# Copy built application from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next-env.d.ts ./
COPY --from=builder /app/tailwind.config.ts ./

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

USER nextjs

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Expose the port the app runs on
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["yarn", "start"] 