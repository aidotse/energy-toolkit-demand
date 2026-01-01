# Behovskartan API
# Node.js + Express + DuckDB with bundled Parquet data

FROM node:20-slim

WORKDIR /app

# Install build dependencies for DuckDB native bindings
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first (for layer caching)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application source files
COPY local-server.js utils.js config.js ./
COPY openapi.yaml parameters.yaml ./
COPY schemas/ ./schemas/
COPY responses/ ./responses/
COPY scripts/ ./scripts/

# Copy data files (Parquet + JSON) - this is the large layer (~1.3 GB)
COPY data/ ./data/

# Set environment
ENV NODE_ENV=production
ENV PORT=4010

# Expose the API port
EXPOSE 4010

# Health check - verify API responds
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:4010/config').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the server
CMD ["node", "local-server.js"]
