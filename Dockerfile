# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Enable Yarn
RUN corepack enable

# Copy package files
COPY package.json yarn.lock* ./

# Install dependencies with Yarn
RUN yarn install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application
RUN yarn build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Enable Yarn
RUN corepack enable

# Copy package files and install production dependencies only
COPY package.json yarn.lock* ./
RUN yarn install --production --frozen-lockfile

# Copy built application from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Expose the port the app runs on
EXPOSE 3000

# Start the application in production mode
CMD ["yarn", "start"] 