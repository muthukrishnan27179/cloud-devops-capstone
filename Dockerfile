# ==============================================================================
# CloudPulse - Multi-Stage Production Dockerfile
# Security: Non-root user, minimal Alpine base, tini init (PID 1), healthcheck
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Dependency & Build Stage
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies if needed
RUN apk add --no-cache libc6-compat

# Copy package manifests for efficient layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# ------------------------------------------------------------------------------
# Stage 2: Lean Production Runtime
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Install tini init to handle PID 1 signal forwarding and prevent zombie processes
RUN apk add --no-cache tini curl

# Set production environment
ENV NODE_ENV=production \
    PORT=3000

# Create dedicated unprivileged system user for security compliance
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy node_modules from builder stage
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/node_modules ./node_modules

# Copy application source files
COPY --chown=nodejs:nodejs package.json server.js ./
COPY --chown=nodejs:nodejs src/ ./src/
COPY --chown=nodejs:nodejs public/ ./public/

# Switch to non-root user
USER nodejs

# Expose HTTP application port
EXPOSE 3000

# Docker Healthcheck probe
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/health || exit 1

# Use tini as PID 1 entrypoint
ENTRYPOINT ["/sbin/tini", "--"]

# Launch application
CMD ["node", "server.js"]
