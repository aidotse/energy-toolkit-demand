# Behovskartan API
# Node.js + Express + DuckDB — data downloaded from S3 at startup
# Build context: repo root (docker build -f infrastructure/Dockerfile .)

FROM node:20-slim

WORKDIR /app

# Install build dependencies for DuckDB native bindings + AWS CLI for S3 data download
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    awscli \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first (for layer caching)
COPY api/package*.json ./api/

# Install production dependencies only
# Note: Using npm install instead of npm ci because api is part of a monorepo
# and doesn't have its own package-lock.json
RUN cd api && npm install --omit=dev

# Copy shared root files (paths.js import from api/ resolves to ../paths.js)
COPY paths.js ./paths.js
COPY config.yaml ./config.yaml

# Copy application source files
COPY api/local-server.js api/utils.js api/config.js ./api/
COPY api/openapi.yaml api/parameters.yaml ./api/
COPY api/schemas/ ./api/schemas/
COPY api/responses/ ./api/responses/
COPY api/scripts/ ./api/scripts/

# Copy entrypoint script (downloads data from S3 at startup)
COPY infrastructure/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Set environment
ENV NODE_ENV=production
ENV PORT=4010

# Expose the API port
EXPOSE 4010

# Health check - verify API responds
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD node -e "fetch('http://localhost:4010/config').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start via entrypoint (downloads data then starts server)
CMD ["/app/entrypoint.sh"]
