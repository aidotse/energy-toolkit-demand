/**
 * @fileoverview Local API server for Demand Toolkit
 *
 * This server provides OpenAPI 3.1 compliant endpoints for demand forecasting data.
 * It uses Express + OpenAPI Backend for routing/validation and DuckDB for querying Parquet files.
 *
 * **Architecture (Strategy 2 - Independent Parameters):**
 * - Static endpoints serve pre-generated JSON files (config, parameters, scenarios, globals)
 * - Dynamic /demand endpoint uses DuckDB to query and combine Parquet files at runtime
 * - Parameters are combined multiplicatively with base scenario data
 *
 * **Data Structure:**
 * - Base scenarios: /data/base/{scenario-id}/{segment}/data.parquet
 * - Parameters: /data/parameters/{param}/{index}/{segment}/data.parquet
 * - Aggregated tables: /data/aggregated/*.parquet (pre-computed for performance)
 *
 * **Performance:**
 * - Uses DuckDB in-memory database with persistent connection
 * - JOIN queries combine base and parameter files with efficient predicate pushdown
 * - Pre-aggregated tables provide 50-100x speedup for yearly queries
 *
 * @module local-server
 */

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { OpenAPIBackend } from 'openapi-backend';
import addFormats from 'ajv-formats';
import duckdb from 'duckdb';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';
import qs from 'qs';
import fs from 'fs';
import { parsePeriod, formatPeriod } from './utils.js';
import { getDataDir } from '../paths.js';
import { getCachedQuery, setCachedQuery, getCacheStats } from './cache.js';
import {
  sanitizeSqlValue,
  safeDataPath,
  buildStrategy2Query,
  buildParamAggregatedQuery,
  buildParamMonthlyAggregatedQuery,
  buildBaselineAggregatedQuery,
  getScenarioName,
} from './query-builder.js';
import { toCsv } from './csv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Server start time used for ETag generation (data is static until restart) */
const serverStartTime = Date.now();

/**
 * Send a sanitized error response. The full error is logged server-side
 * (with request ID for correlation) but the client only sees a short
 * public message — never file paths, SQL, or stack traces.
 *
 * @param {Object} req - Express request (must have req.id from requestId middleware)
 * @param {Object} res - Express response
 * @param {number} status - HTTP status code
 * @param {string} publicMessage - Safe message to return to the client
 * @param {Error|unknown} [err] - Internal error to log (not sent to client)
 * @param {Array} [details] - Optional structured details (only use for safe-to-return data like validation errors)
 */
function sendError(req, res, status, publicMessage, err, details) {
  const requestId = req.id || 'unknown';
  if (err) {
    console.error(JSON.stringify({
      event: 'error',
      requestId,
      status,
      publicMessage,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }));
  }
  const body = { error: publicMessage, requestId };
  if (details) body.details = details;
  res.status(status).json(body);
}

const api = new OpenAPIBackend({
  definition: path.join(__dirname, 'openapi.yaml'),
  customizeAjv: (ajv) => {
    addFormats(ajv);
    return ajv;
  }
});

/**
 * Generate ETag from file stats
 * @param {string} filepath - Path to file
 * @returns {string|null} ETag string or null if file doesn't exist
 */
function getFileEtag(filepath) {
  try {
    const stats = fs.statSync(filepath);
    return `"${stats.mtime.getTime().toString(16)}-${stats.size.toString(16)}"`;
  } catch {
    return null;
  }
}

/**
 * Send cached response with ETag and Cache-Control headers
 * @param {Object} res - Express response
 * @param {Object} req - Express request
 * @param {string} filepath - Path to file
 * @param {string} contentType - Content type
 * @param {number} maxAge - Cache max-age in seconds (default 1 hour)
 * @returns {boolean} true if 304 was sent, false if full response needed
 */
function sendCachedFile(res, req, filepath, contentType, maxAge = 3600) {
  const etag = getFileEtag(filepath);

  if (etag) {
    // Check If-None-Match for conditional request
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      res.status(304).end();
      return true;
    }

    res.set('ETag', etag);
  }

  res.set('Cache-Control', `public, max-age=${maxAge}`);
  res.type(contentType);
  res.send(fs.readFileSync(filepath));
  return false;
}

await api.init();

const app = express();

// App Runner terminates TLS and forwards via a single hop; trust one proxy
// layer so req.ip reflects the real client for rate limiting and logging.
app.set('trust proxy', 1);

// CORS configuration - permissive in dev, configurable allowlist in production
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : null;

// Per-request debug logs are noisy on App Runner; opt in via DEBUG_REQUESTS=1.
const debugRequests = !isProduction || process.env.DEBUG_REQUESTS === '1';
const debugLog = (...args) => { if (debugRequests) console.log(...args); };

if (isProduction && !allowedOrigins) {
  console.warn('⚠️  NODE_ENV=production but ALLOWED_ORIGINS is unset — all cross-origin requests will be rejected.');
}

// Request ID + latency log middleware. Runs before everything else so even
// rejected CORS requests get an ID in the logs.
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.set('X-Request-Id', req.id);
  const startTime = Date.now();
  res.on('finish', () => {
    const entry = {
      event: 'request',
      id: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      latency_ms: Date.now() - startTime,
    };
    // Tagged by /demand handler to show which query strategy ran.
    if (req.queryPath) entry.query_path = req.queryPath;
    console.log(JSON.stringify(entry));
  });
  next();
});

app.use(compression());

// CORS: in prod, check against allowlist and log rejections. In dev, allow all.
app.use(cors({
  origin: (origin, callback) => {
    // Same-origin or non-browser requests have no Origin header — always allow.
    if (!origin) return callback(null, true);
    if (!isProduction) return callback(null, true);
    if (allowedOrigins && allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(JSON.stringify({ event: 'cors_reject', origin }));
    return callback(new Error('CORS: origin not allowed'));
  }
}));

app.use(express.json());

// Rate limit /demand only (static endpoints are ETag-cached and cheap).
// Defaults: 300 requests / minute / IP. Override via env vars.
const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60_000;
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX, 10) || 300;
const demandRateLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false,
  handler: (req, res /* , next, options */) => {
    sendError(req, res, 429, 'Too many requests');
  },
});
app.use('/demand', demandRateLimiter);

// Internal /_health endpoint — not in the OpenAPI spec, used by deploy smoke
// tests and for cache observability. Must be registered BEFORE the OpenAPI
// catch-all so it's not routed through api.handleRequest.
app.get('/_health', (req, res) => {
  res.json({
    status: 'ok',
    uptime_s: Math.floor((Date.now() - serverStartTime) / 1000),
    cache: getCacheStats(),
  });
});

// route everything through OpenAPI‐Backend
app.use((req, res) =>
  api.handleRequest(
    {
      method: req.method,
      path: req.path,
      query: qs.parse(req.url.split('?')[1] || ''),
      body: req.body,
      headers: req.headers,
    },
    req,
    res
  )
);

/**
 * DuckDB database and connection (in-memory, persistent for session)
 * @type {duckdb.Database}
 */
const db = new duckdb.Database(':memory:');

/**
 * Persistent DuckDB connection for Parquet queries
 * @type {duckdb.Connection}
 */
const conn = db.connect();

/**
 * Data directory paths
 */
const dataDir = getDataDir();
const baseDir = path.join(dataDir, 'base');
const parametersDir = path.join(dataDir, 'parameters');
const aggregatedDir = path.join(dataDir, 'aggregated');

/**
 * Load Strategy 2 configuration from parameters.json
 */
function loadStrategy2Config() {
  const paramsPath = path.join(dataDir, 'parameters.json');
  if (fs.existsSync(paramsPath)) {
    const data = JSON.parse(fs.readFileSync(paramsPath, 'utf8'));
    return data.strategy2 || null;
  }
  return null;
}

const strategy2Config = loadStrategy2Config();

/**
 * Handler for geography endpoint
 */
api.register('getGeographies', (c, req, res) => {
  const fmt = (c.request.query.format === 'geojson' ? 'geojson' : 'json');
  const filename = `geographies.${fmt}`;
  const filepath = path.join(dataDir, filename);

  if (!fs.existsSync(filepath)) {
    return sendError(req, res, 404, 'Endpoint data unavailable');
  }

  const contentType = fmt === 'geojson' ? 'application/geo+json' : 'application/json';
  // GeoJSON is large, cache for 1 hour
  sendCachedFile(res, req, filepath, contentType, 3600);
});

/**
 * Register static endpoint handlers
 */
const staticOps = [
  'getConfig',
  'getParameters',
  'getScenarios',
  'getAggregations',
  'getGlobals',
];
staticOps.forEach((op) => {
  api.register(op, (c, req, res) => {
    const base = op.replace(/^get/, '').toLowerCase();
    const filepath = path.join(dataDir, `${base}.json`);
    if (!fs.existsSync(filepath)) {
      return sendError(req, res, 404, 'Endpoint data unavailable');
    }
    // Static config files rarely change, cache for 1 hour
    sendCachedFile(res, req, filepath, 'application/json', 3600);
  });
});

/**
 * Get all segments from config (cached at module level)
 */
let _cachedSegments = null;
function getSegments() {
  if (_cachedSegments) return _cachedSegments;
  const configPath = path.join(dataDir, 'config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    // config.segment.values[] is the shape emitted by endpoint-config.js.
    // Accept the legacy top-level config.segments too for backwards compat.
    if (Array.isArray(config.segment?.values)) {
      _cachedSegments = config.segment.values.map((s) => s.name);
      return _cachedSegments;
    }
    if (Array.isArray(config.segments)) {
      _cachedSegments = config.segments;
      return _cachedSegments;
    }
  }
  throw new Error('Unable to resolve segment list from config.json');
}

/* Query builders imported from ./query-builder.js */

/* buildParamAggregatedQuery imported from ./query-builder.js */

/**
 * Handler for /demand endpoint with Strategy 2 support
 */
api.register('getDemand', async (c, req, res) => {
  try {
    const query = c.request.query;
    const fmt = query.format || 'json';

    // Parse period parameters
    const { start, end } = parsePeriod(query.period);
    const resolution = query.period.resolution;
    const aggregation = query.period.aggregation;

    // Get filter parameters
    const geoFilter = query.geography || 'total';
    const segFilter = query.segment || 'total';

    // Strategy 2 parameters
    const defaultScenario = strategy2Config?.baseScenarios?.find(s => s.default)?.id || 'current-policy';
    let baseScenario = query.baseScenario || defaultScenario;

    // Handle legacy scenarioId parameter for backward compatibility
    if (query.scenarioId && query.scenarioId !== 'default' && query.scenarioId !== 'all') {
      // Map old scenario IDs to new base scenarios
      baseScenario = query.scenarioId;
    } else if (query.scenarioId === 'default') {
      baseScenario = defaultScenario;
    }

    // Collect parameter values from query, bounds-checked against the
    // parameter config. Out-of-range values return 400.
    const parameterValues = {};
    if (strategy2Config?.parameters) {
      for (const [paramName, paramDef] of Object.entries(strategy2Config.parameters)) {
        const raw = query[paramName];
        if (raw === undefined || raw === null || raw === '') {
          parameterValues[paramName] = 0;
          continue;
        }
        const value = parseInt(raw, 10);
        if (Number.isNaN(value) || value < 0 || value >= paramDef.values.length) {
          return sendError(
            req,
            res,
            400,
            `Parameter "${paramName}" must be an integer index in [0, ${paramDef.values.length - 1}]`
          );
        }
        parameterValues[paramName] = value;
      }
    }

    // Build cache key from all query parameters
    const cacheKey = JSON.stringify({
      baseScenario, start, end, resolution, aggregation,
      geoFilter, segFilter, parameterValues, fmt
    });

    // HTTP cache: check ETag before anything else
    const etag = `"${crypto.createHash('md5').update(cacheKey + serverStartTime).digest('hex')}"`;
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      return res.status(304).end();
    }

    // Check in-memory cache
    const cachedResult = getCachedQuery(cacheKey);
    if (cachedResult) {
      debugLog('📊 Cache hit for demand query');
      res.set('ETag', etag);
      res.set('Cache-Control', 'public, max-age=300');
      res.set('Vary', 'Accept-Encoding');
      if (fmt === 'csv') {
        res.set('Content-Disposition', `attachment; filename="${csvFilename(baseScenario, start, end)}"`);
        return res.type('text/csv').send(cachedResult);
      }
      return res.json(cachedResult);
    }

    debugLog('📊 Demand query:', {
      baseScenario,
      start,
      end,
      resolution,
      aggregation,
      geoFilter,
      segFilter,
      parameterValues
    });

    // Try aggregated tables for yearly resolution queries
    const hasNonZeroParams = Object.values(parameterValues).some(v => v > 0);
    const canUseAggregated = resolution === '1Y' && fs.existsSync(aggregatedDir);
    const canUseMonthlyAggregated = resolution === '1M' && fs.existsSync(aggregatedDir);

    // `preparedQuery` is `{ sql, params }` — a parameterized statement body.
    let preparedQuery;

    if (canUseAggregated && hasNonZeroParams) {
      // Parameter-aware aggregated query (param_yearly.parquet)
      const segments = getSegments();
      preparedQuery = buildParamAggregatedQuery({
        baseScenario, segments, geoFilter, segFilter, start, end, parameterValues, aggregatedDir
      });
      if (preparedQuery) {
        debugLog('📊 Using param-aware aggregated tables');
        req.queryPath = 'param_yearly';
      }
    }

    if (!preparedQuery && canUseMonthlyAggregated && hasNonZeroParams) {
      // Parameter-aware monthly aggregated query (param_monthly.parquet)
      const segments = getSegments();
      preparedQuery = buildParamMonthlyAggregatedQuery({
        baseScenario, segments, geoFilter, segFilter, start, end, parameterValues, aggregatedDir
      });
      if (preparedQuery) {
        debugLog('📊 Using param-aware monthly aggregated table');
        req.queryPath = 'param_monthly';
      }
    }

    if (!preparedQuery && canUseAggregated && !hasNonZeroParams) {
      // Baseline aggregated tables (no parameters active). Pick the right
      // pre-aggregated parquet depending on the filter shape.
      let aggregatedTable;
      let aggregatedTag;
      if (geoFilter === 'total' && segFilter === 'total') {
        aggregatedTable = safeDataPath(aggregatedDir, 'national_yearly.parquet');
        aggregatedTag = 'national_yearly';
      } else if (geoFilter === 'all' && segFilter === 'all') {
        aggregatedTable = safeDataPath(aggregatedDir, 'geo_segment_yearly.parquet');
        aggregatedTag = 'geo_segment_yearly';
      } else if (geoFilter === 'all') {
        aggregatedTable = safeDataPath(aggregatedDir, 'geography_yearly.parquet');
        aggregatedTag = 'geography_yearly';
      } else if (segFilter === 'all') {
        aggregatedTable = safeDataPath(aggregatedDir, 'segment_yearly.parquet');
        aggregatedTag = 'segment_yearly';
      }

      if (aggregatedTable && fs.existsSync(aggregatedTable)) {
        debugLog('📊 Using pre-aggregated tables');
        preparedQuery = buildBaselineAggregatedQuery({
          aggregatedTable,
          baseScenario,
          geoFilter,
          segFilter,
          start,
          end,
        });
        req.queryPath = aggregatedTag;
      }
    }

    if (!preparedQuery) {
      // Fallback: full raw parquet scan with parameter JOINs
      const segments = getSegments();
      preparedQuery = buildStrategy2Query({
        baseScenario,
        segments,
        geoFilter,
        segFilter,
        start,
        end,
        resolution,
        aggregation,
        parameterValues,
        baseDir,
        parametersDir,
        strategy2Config
      });
      req.queryPath = 'raw_scan';
    }

    debugLog('SQL:', preparedQuery.sql);

    // Execute query via prepared statement so values are bound, not interpolated.
    const rows = await runPrepared(preparedQuery);

    // Set HTTP cache headers on fresh responses
    res.set('ETag', etag);
    res.set('Cache-Control', 'public, max-age=300');
    res.set('Vary', 'Accept-Encoding');

    // Send response and cache result
    if (fmt === 'csv') {
      // Format period column via formatPeriod for each row, then serialize.
      const csvRows = rows.map((r) => ({
        period: formatPeriod(r.period, resolution),
        geography: r.geography,
        segment: r.segment,
        scenario_id: r.scenario_id,
        value: r.value,
      }));
      const csvResult = toCsv(csvRows, ['period', 'geography', 'segment', 'scenario_id', 'value']);
      setCachedQuery(cacheKey, csvResult);
      res.set('Content-Disposition', `attachment; filename="${csvFilename(baseScenario, start, end)}"`);
      res.type('text/csv').send(csvResult);
    } else {
      setCachedQuery(cacheKey, rows);
      res.json(rows);
    }
  } catch (err) {
    sendError(req, res, 500, 'Query failed', err);
  }
});

/**
 * Build a safe CSV filename for Content-Disposition.
 */
function csvFilename(baseScenario, start, end) {
  const safe = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '');
  return `demand-${safe(baseScenario)}-${safe(start).slice(0, 10)}-${safe(end).slice(0, 10)}.csv`;
}


// Fallbacks
api.register('notFound', (c, req, res) =>
  sendError(req, res, 404, 'Not found')
);
api.register('validationFail', (c, req, res) =>
  sendError(req, res, 400, 'Bad request', null, c.validation.errors)
);

/** Execute a prepared `{sql, params}` pair and return cleaned rows. */
async function runPrepared(query) {
  const rows = await new Promise((resolve, reject) => {
    const stmt = conn.prepare(query.sql);
    stmt.all(...query.params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
  return rows.map((r) =>
    Object.fromEntries(
      Object.entries(r).map(([k, v]) => (typeof v === 'bigint' ? [k, Number(v)] : [k, v]))
    )
  );
}

/**
 * Pre-warm cache with common queries for faster initial page loads
 */
async function warmupCache() {
  const baseScenarios = strategy2Config?.baseScenarios?.map(s => s.id) || ['current-policy'];
  const years = Array.from({ length: 26 }, (_, i) => 2025 + i); // 2025-2050

  console.log('🔥 Warming up cache...');
  let cached = 0;

  const warmQuery = async (cacheKey, opts, label) => {
    if (getCachedQuery(cacheKey)) return;
    try {
      const segments = getSegments();
      const query = buildStrategy2Query({
        segments,
        parameterValues: {},
        baseDir,
        parametersDir,
        strategy2Config,
        resolution: '1Y',
        aggregation: 'sum',
        ...opts,
      });
      const cleaned = await runPrepared(query);
      setCachedQuery(cacheKey, cleaned);
      cached++;
    } catch (e) {
      console.warn(`  Warning: Could not warm ${label}`);
    }
  };

  for (const baseScenario of baseScenarios) {
    // 1. National yearly totals
    await warmQuery(
      JSON.stringify({
        baseScenario, start: '2025-01-01', end: '2051-01-01',
        resolution: '1Y', aggregation: 'sum',
        geoFilter: 'total', segFilter: 'total', parameterValues: {}, fmt: 'json'
      }),
      { baseScenario, geoFilter: 'total', segFilter: 'total', start: '2025-01-01', end: '2051-01-01' },
      `national totals for ${baseScenario}`
    );

    for (const year of years) {
      // 2. Geographic yearly data (for map)
      await warmQuery(
        JSON.stringify({
          baseScenario, start: `${year}-01-01`, end: `${year + 1}-01-01`,
          resolution: '1Y', aggregation: 'sum',
          geoFilter: 'all', segFilter: 'total', parameterValues: {}, fmt: 'json'
        }),
        { baseScenario, geoFilter: 'all', segFilter: 'total', start: `${year}-01-01`, end: `${year + 1}-01-01` },
        `geo data for ${baseScenario} year ${year}`
      );

      // 3. Segment yearly data (for pie chart)
      await warmQuery(
        JSON.stringify({
          baseScenario, start: `${year}-01-01`, end: `${year + 1}-01-01`,
          resolution: '1Y', aggregation: 'sum',
          geoFilter: 'total', segFilter: 'all', parameterValues: {}, fmt: 'json'
        }),
        { baseScenario, geoFilter: 'total', segFilter: 'all', start: `${year}-01-01`, end: `${year + 1}-01-01` },
        `segment data for ${baseScenario} year ${year}`
      );

      // 4. All geographies with all segments
      await warmQuery(
        JSON.stringify({
          baseScenario, start: `${year}-01-01`, end: `${year + 1}-01-01`,
          resolution: '1Y', aggregation: 'sum',
          geoFilter: 'all', segFilter: 'all', parameterValues: {}, fmt: 'json'
        }),
        { baseScenario, geoFilter: 'all', segFilter: 'all', start: `${year}-01-01`, end: `${year + 1}-01-01` },
        `all-geo/all-seg data for ${baseScenario} year ${year}`
      );
    }
  }

  console.log(`🔥 Cache warmed: ${cached} queries pre-cached`);
}

// The Express app is exported so integration tests can import it without
// starting a TCP listener. The `listen()` call only runs when this module is
// the process entry point (`node api/local-server.js`) — vitest imports the
// module via `import()` so `import.meta.url` won't equal argv[1].
export { app };

const isMain = (() => {
  if (!process.argv[1]) return false;
  const entryUrl = `file://${path.resolve(process.argv[1])}`;
  return import.meta.url === entryUrl;
})();

let server;
if (isMain) {
  const port = process.env.PORT || 4010;
  server = app.listen(port, '0.0.0.0', () => {
    console.log(`✅ API server running at http://localhost:${port}`);
    if (strategy2Config) {
      console.log(`📊 Strategy 2 enabled: ${strategy2Config.baseScenarios?.length || 0} base scenarios, ${Object.keys(strategy2Config.parameters || {}).length} parameters`);
    }
    if (process.env.ALLOWED_ORIGINS) {
      console.log(`🌐 CORS origins: ${allowedOrigins.join(', ')}`);
    }

    // Warm up cache after server starts
    warmupCache().catch(err => console.error('Cache warmup failed:', err));
  });
}

// Graceful shutdown handler — only relevant when we actually started a
// listener (not when imported from a test).
if (isMain) {
  let isShuttingDown = false;
  const shutdown = (reason, exitCode = 0) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n${reason} — shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed');
      try {
        conn.close();
        db.close();
        console.log('DuckDB connection closed');
      } catch (e) {
        // Ignore errors during shutdown
      }
      process.exit(exitCode);
    });

    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(exitCode || 1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Last-resort handlers: log the full error and shut down cleanly. Without
  // these, a single unhandled rejection anywhere in the server (e.g. a missing
  // await on a DuckDB call) would tear down the process with no context.
  process.on('uncaughtException', (err) => {
    console.error(JSON.stringify({
      event: 'uncaught_exception',
      message: err?.message,
      stack: err?.stack,
    }));
    shutdown('uncaughtException', 1);
  });
  process.on('unhandledRejection', (reason) => {
    console.error(JSON.stringify({
      event: 'unhandled_rejection',
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    }));
    shutdown('unhandledRejection', 1);
  });
}
