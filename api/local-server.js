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
import { getCachedQuery, setCachedQuery } from './cache.js';
import { sanitizeSqlValue, buildStrategy2Query, buildParamAggregatedQuery, getScenarioName } from './query-builder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Server start time used for ETag generation (data is static until restart) */
const serverStartTime = Date.now();

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

// CORS configuration - allow localhost in dev, configurable origins in production
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: allowedOrigins
}));

app.use(express.json());

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
    return res.status(404).json({ error: 'Not found' });
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
      return res.status(404).json({ error: 'Not found' });
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
    if (config.segments) {
      _cachedSegments = config.segments;
      return _cachedSegments;
    }
  }
  _cachedSegments = ['housing', 'transport', 'industry', 'services', 'datacenters'];
  return _cachedSegments;
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

    // Collect parameter values from query
    const parameterValues = {};
    if (strategy2Config?.parameters) {
      for (const paramName of Object.keys(strategy2Config.parameters)) {
        const value = parseInt(query[paramName], 10);
        parameterValues[paramName] = isNaN(value) ? 0 : value;
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
      console.log('📊 Cache hit for demand query');
      res.set('ETag', etag);
      res.set('Cache-Control', 'public, max-age=300');
      if (fmt === 'csv') {
        return res.type('text/csv').send(cachedResult);
      }
      return res.json(cachedResult);
    }

    console.log('📊 Demand query:', {
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

    let sql;

    if (canUseAggregated && hasNonZeroParams) {
      // Parameter-aware aggregated query (param_yearly.parquet)
      const segments = getSegments();
      sql = buildParamAggregatedQuery({
        baseScenario, segments, geoFilter, segFilter, start, end, parameterValues, aggregatedDir
      });
      if (sql) console.log('📊 Using param-aware aggregated tables');
    }

    if (!sql && canUseAggregated && !hasNonZeroParams) {
      // Baseline aggregated tables (no parameters active)
      let aggregatedTable;
      if (geoFilter === 'total' && segFilter === 'total') {
        aggregatedTable = path.join(aggregatedDir, 'national_yearly.parquet');
      } else if (geoFilter === 'all' && segFilter === 'all') {
        aggregatedTable = path.join(aggregatedDir, 'geo_segment_yearly.parquet');
      } else if (geoFilter === 'all') {
        aggregatedTable = path.join(aggregatedDir, 'geography_yearly.parquet');
      } else if (segFilter === 'all') {
        aggregatedTable = path.join(aggregatedDir, 'segment_yearly.parquet');
      }

      if (aggregatedTable && fs.existsSync(aggregatedTable)) {
        console.log('📊 Using pre-aggregated tables');
        const safeGeoFilter = sanitizeSqlValue(geoFilter);
        const safeSegFilter = sanitizeSqlValue(segFilter);
        const safeBaseScenario = sanitizeSqlValue(baseScenario);
        const scenarioName = getScenarioName(safeBaseScenario);
        const wheres = [
          `CAST(year AS INTEGER) >= ${new Date(start).getFullYear()}`,
          `CAST(year AS INTEGER) < ${new Date(end).getFullYear()}`,
          `scenario_id = '${scenarioName}'`
        ];

        if (safeGeoFilter !== 'all' && safeGeoFilter !== 'total') {
          wheres.push(`geography = '${safeGeoFilter}'`);
        }
        if (safeSegFilter !== 'all' && safeSegFilter !== 'total') {
          wheres.push(`segment = '${safeSegFilter}'`);
        }

        const groupBy = ['year'];
        const selectExtras = [];

        if (safeGeoFilter === 'total') {
          selectExtras.push("'total' AS geography");
        } else if (safeGeoFilter === 'all') {
          selectExtras.push('geography');
          groupBy.push('geography');
        } else {
          selectExtras.push(`'${safeGeoFilter}' AS geography`);
        }

        if (safeSegFilter === 'total') {
          selectExtras.push("'total' AS segment");
        } else if (safeSegFilter === 'all') {
          selectExtras.push('segment');
          groupBy.push('segment');
        } else {
          selectExtras.push(`'${safeSegFilter}' AS segment`);
        }

        sql = `
          SELECT
            MAKE_TIMESTAMP(CAST(year AS INTEGER), 1, 1, 0, 0, 0) AS period,
            ${selectExtras.join(', ')},
            '${safeBaseScenario}' AS scenario_id,
            SUM(total_value) AS value
          FROM read_parquet('${aggregatedTable}')
          WHERE ${wheres.join(' AND ')}
          GROUP BY ${groupBy.join(', ')}
          ORDER BY period
        `;
      }
    }

    if (!sql) {
      // Fallback: full raw parquet scan with parameter JOINs
      const segments = getSegments();
      sql = buildStrategy2Query({
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
    }

    console.log('SQL:', sql);

    // Execute query
    const rawRows = await new Promise((resolve, reject) =>
      conn.all(sql, (err, rows) => (err ? reject(err) : resolve(rows)))
    );

    // Clean BigInt values
    const rows = rawRows.map(r =>
      Object.fromEntries(Object.entries(r).map(([k, v]) =>
        typeof v === 'bigint' ? [k, Number(v)] : [k, v]
      ))
    );

    // Set HTTP cache headers on fresh responses
    res.set('ETag', etag);
    res.set('Cache-Control', 'public, max-age=300');

    // Send response and cache result
    if (fmt === 'csv') {
      const header = 'period,geography,segment,scenario_id,value';
      const lines = rows.map(r => [
        formatPeriod(r.period, resolution),
        r.geography,
        r.segment,
        r.scenario_id,
        r.value
      ].join(','));
      const csvResult = [header, ...lines].join('\n');
      setCachedQuery(cacheKey, csvResult);
      res.type('text/csv').send(csvResult);
    } else {
      setCachedQuery(cacheKey, rows);
      res.json(rows);
    }
  } catch (err) {
    console.error('Error in getDemand:', err);
    res.status(500).json({ error: err.message });
  }
});

// Fallbacks
api.register('notFound', (c, req, res) =>
  res.status(404).json({ error: 'Not found' })
);
api.register('validationFail', (c, req, res) =>
  res
    .status(400)
    .json({ error: 'Bad request', details: c.validation.errors })
);

/**
 * Pre-warm cache with common queries for faster initial page loads
 */
async function warmupCache() {
  const baseScenarios = strategy2Config?.baseScenarios?.map(s => s.id) || ['current-policy'];
  const years = Array.from({ length: 26 }, (_, i) => 2025 + i); // 2025-2050

  console.log('🔥 Warming up cache...');
  let cached = 0;

  for (const baseScenario of baseScenarios) {
    // 1. National yearly totals (most common query)
    try {
      const nationalKey = JSON.stringify({
        baseScenario, start: '2025-01-01', end: '2051-01-01',
        resolution: '1Y', aggregation: 'sum',
        geoFilter: 'total', segFilter: 'total', parameterValues: {}, fmt: 'json'
      });

      if (!getCachedQuery(nationalKey)) {
        const segments = getSegments();
        const sql = buildStrategy2Query({
          baseScenario, segments, geoFilter: 'total', segFilter: 'total',
          start: '2025-01-01', end: '2051-01-01', resolution: '1Y', aggregation: 'sum',
          parameterValues: {}, baseDir, parametersDir, strategy2Config
        });
        const rows = await new Promise((resolve, reject) =>
          conn.all(sql, (err, rows) => err ? reject(err) : resolve(rows))
        );
        const cleaned = rows.map(r =>
          Object.fromEntries(Object.entries(r).map(([k, v]) =>
            typeof v === 'bigint' ? [k, Number(v)] : [k, v]
          ))
        );
        setCachedQuery(nationalKey, cleaned);
        cached++;
      }
    } catch (e) {
      console.warn(`  Warning: Could not warm national totals for ${baseScenario}`);
    }

    // 2. Geographic yearly data (for map)
    for (const year of years) {
      try {
        const geoKey = JSON.stringify({
          baseScenario, start: `${year}-01-01`, end: `${year + 1}-01-01`,
          resolution: '1Y', aggregation: 'sum',
          geoFilter: 'all', segFilter: 'total', parameterValues: {}, fmt: 'json'
        });

        if (!getCachedQuery(geoKey)) {
          const segments = getSegments();
          const sql = buildStrategy2Query({
            baseScenario, segments, geoFilter: 'all', segFilter: 'total',
            start: `${year}-01-01`, end: `${year + 1}-01-01`, resolution: '1Y', aggregation: 'sum',
            parameterValues: {}, baseDir, parametersDir, strategy2Config
          });
          const rows = await new Promise((resolve, reject) =>
            conn.all(sql, (err, rows) => err ? reject(err) : resolve(rows))
          );
          const cleaned = rows.map(r =>
            Object.fromEntries(Object.entries(r).map(([k, v]) =>
              typeof v === 'bigint' ? [k, Number(v)] : [k, v]
            ))
          );
          setCachedQuery(geoKey, cleaned);
          cached++;
        }
      } catch (e) {
        console.warn(`  Warning: Could not warm geo data for ${baseScenario} year ${year}`);
      }
    }

    // 3. Segment yearly data (for pie chart)
    for (const year of years) {
      try {
        const segKey = JSON.stringify({
          baseScenario, start: `${year}-01-01`, end: `${year + 1}-01-01`,
          resolution: '1Y', aggregation: 'sum',
          geoFilter: 'total', segFilter: 'all', parameterValues: {}, fmt: 'json'
        });

        if (!getCachedQuery(segKey)) {
          const segments = getSegments();
          const sql = buildStrategy2Query({
            baseScenario, segments, geoFilter: 'total', segFilter: 'all',
            start: `${year}-01-01`, end: `${year + 1}-01-01`, resolution: '1Y', aggregation: 'sum',
            parameterValues: {}, baseDir, parametersDir, strategy2Config
          });
          const rows = await new Promise((resolve, reject) =>
            conn.all(sql, (err, rows) => err ? reject(err) : resolve(rows))
          );
          const cleaned = rows.map(r =>
            Object.fromEntries(Object.entries(r).map(([k, v]) =>
              typeof v === 'bigint' ? [k, Number(v)] : [k, v]
            ))
          );
          setCachedQuery(segKey, cleaned);
          cached++;
        }
      } catch (e) {
        console.warn(`  Warning: Could not warm segment data for ${baseScenario} year ${year}`);
      }
    }

    // 4. All geographies with all segments (for SectorPieChart & GeoSegmentChart)
    for (const year of years) {
      try {
        const allAllKey = JSON.stringify({
          baseScenario, start: `${year}-01-01`, end: `${year + 1}-01-01`,
          resolution: '1Y', aggregation: 'sum',
          geoFilter: 'all', segFilter: 'all', parameterValues: {}, fmt: 'json'
        });

        if (!getCachedQuery(allAllKey)) {
          const segments = getSegments();
          const sql = buildStrategy2Query({
            baseScenario, segments, geoFilter: 'all', segFilter: 'all',
            start: `${year}-01-01`, end: `${year + 1}-01-01`, resolution: '1Y', aggregation: 'sum',
            parameterValues: {}, baseDir, parametersDir, strategy2Config
          });
          const rows = await new Promise((resolve, reject) =>
            conn.all(sql, (err, rows) => err ? reject(err) : resolve(rows))
          );
          const cleaned = rows.map(r =>
            Object.fromEntries(Object.entries(r).map(([k, v]) =>
              typeof v === 'bigint' ? [k, Number(v)] : [k, v]
            ))
          );
          setCachedQuery(allAllKey, cleaned);
          cached++;
        }
      } catch (e) {
        console.warn(`  Warning: Could not warm all-geo/all-seg data for ${baseScenario} year ${year}`);
      }
    }
  }

  console.log(`🔥 Cache warmed: ${cached} queries pre-cached`);
}

const port = process.env.PORT || 4010;
const server = app.listen(port, () => {
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

// Graceful shutdown handler
function shutdown(signal) {
  console.log(`\n${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed');
    try {
      conn.close();
      db.close();
      console.log('DuckDB connection closed');
    } catch (e) {
      // Ignore errors during shutdown
    }
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
