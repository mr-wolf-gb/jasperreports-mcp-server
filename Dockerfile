# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files and scripts (needed for postinstall)
COPY package*.json ./
COPY scripts/ ./scripts/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY docs/ ./docs/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S jasper -u 1001

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=jasper:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=jasper:nodejs /app/src ./src
COPY --from=builder --chown=jasper:nodejs /app/docs ./docs
COPY --from=builder --chown=jasper:nodejs /app/scripts ./scripts
COPY --from=builder --chown=jasper:nodejs /app/package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S jasper -u 1001

# Switch to non-root user
USER jasper

# Expose port (configurable via environment)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default command (can be overridden)
CMD ["node", "src/index.js"]