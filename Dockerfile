# Use Node.js LTS version
FROM node:20-alpine

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

# Expose the port the app runs on
EXPOSE 3000

# Start the application in production mode by default
CMD ["yarn", "dev"] 