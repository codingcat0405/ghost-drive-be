# Stage 1: Dependencies
FROM oven/bun:1-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY package.json bun.lock* bun.lockb* package-lock.json* ./

# Install all dependencies (including dev dependencies for potential build steps)
RUN bun install --frozen-lockfile

# Stage 2: Production dependencies
FROM oven/bun:1-alpine AS production-deps

WORKDIR /app

# Copy package files
COPY package.json bun.lock* bun.lockb* package-lock.json* ./

# Install only production dependencies
RUN bun install --frozen-lockfile --production

# Stage 3: Production
FROM oven/bun:1-alpine AS production

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy production dependencies from production-deps stage
COPY --from=production-deps /app/node_modules ./node_modules

# Copy application source code
COPY package.json ./
COPY tsconfig.json ./
COPY src ./src

# Set environment variables
ENV NODE_ENV=production

# Expose application port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD bun run -e "fetch('http://localhost:8080').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Use non-root user for security
USER bun

# Start the application
CMD ["bun", "run", "start"]
