import express from 'express';
import cors from 'cors';
import { OpenAPIBackend } from 'openapi-backend';
import duckdb from 'duckdb';
import { fileURLToPath } from 'url';
import path from 'path';
import qs from 'qs';
import fs from 'fs';
import { parsePeriod, formatPeriod } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const api = new OpenAPIBackend({ definition: './openapi.yaml' });

await api.init();

const app = express();

app.use(cors({
  origin: 'http://localhost:5173'
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

// 0) Bootstrap DuckDB once, reuse the same connection
/** @type {duckdb.Database} */
const db = new duckdb.Database(':memory:');
/** @type {duckdb.Connection} */
const conn = db.connect();

/**
 * Handler for geography endpoint - serves static files in JSON or GeoJSON format
 * @param {import('openapi-backend').Context} c - OpenAPI context
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
api.register('getGeographies', (c, req, res) => {
  // Pick the format from ?format=… or default to json
  const fmt = (c.request.query.format === 'geojson' ? 'geojson' : 'json');
  const filename = `geographies.${fmt}`;
  const filepath = path.join(__dirname, 'data', filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Set the right Content-Type
  if (fmt === 'geojson') res.type('application/geo+json');
  else              res.type('application/json');

  res.send(fs.readFileSync(filepath));
});

// Now all the other “getXXX” endpoints that just serve a static JSON
// We strip off the “get” prefix, lowercase it, and serve <name>.json
const staticOps = [
  'getConfig',
  'getParameters',
  'getScenarios',
  'getAggregations',
];
staticOps.forEach((op) => {
  api.register(op, (c, req, res) => {
    const base = op.replace(/^get/, '').toLowerCase();
    const filepath = path.join(__dirname, 'data', `${base}.json`);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.type('application/json').send(fs.readFileSync(filepath));
  });
});


api.register('getDemand', async (c, req, res) => {
  try {
    const { period, geography, segment, scenario_id } = c.request.query;
    const fmt = c.request.query.format || 'json';

    // 1) Pull out common filters
    const { start, end } = parsePeriod(c.request.query.period);
    const resolution   = period.resolution;   // '1h' | '1w' | '1M' | '1Y'
    const aggregation  = period.aggregation;  // 'mean' | 'sum'
    const geoFilter    = geography;
    const segFilter    = segment;
    const scenarioFilter = scenario_id;

    // 2) Map resolution → SQL truncation expression + alias
    let timeExpr, timeAlias;
    switch (resolution) {
      case '1h':
        timeExpr  = `t.timestamp`;
        timeAlias = 'period';
        break;
      case '1w':
        timeExpr = `DATE_TRUNC('week', t.timestamp)`;
        timeAlias = 'period';
        break;
      case '1M':
        timeExpr  = `DATE_TRUNC('month', t.timestamp)`;
        timeAlias = 'period';
        break;
      case '1Y':
        timeExpr  = `DATE_TRUNC('year', t.timestamp)`;
        timeAlias = 'period';
        break;
      default:
        throw new Error(`Unsupported resolution: ${resolution}`);
    }

    // 3) Choose aggregation function
    const aggFunc = aggregation === 'sum' ? 'SUM' : 'AVG';

    // 4) Build WHERE clauses
    const wheres = [
      `t.timestamp >= TIMESTAMP '${start}'`,
      `t.timestamp <=  TIMESTAMP '${end}'`
    ];

    // geography filter
    if (geoFilter !== 'all' && geoFilter !== 'total') {
      wheres.push(`t.geography = '${geoFilter}'`);
    }

    // segment filter
    if (segFilter !== 'all' && segFilter !== 'total') {
      wheres.push(`t.segment = '${segFilter}'`);
    }

    // scenario filter
    if (scenarioFilter !== undefined && scenarioFilter !== 'all') {
      wheres.push(`t.scenario_id = '${scenarioFilter}'`);
    }

    // 5) Decide GROUP BY keys and SELECT clause parts
    const groupBy = [ timeExpr ];
    const selectExtras = [];

    // geography
    if (geoFilter === 'total') {
      // national total
      selectExtras.push(`'total' AS geography`);
      // no GROUP BY
    }
    else if (geoFilter === 'all') {
      selectExtras.push(`t.geography AS geography`);
      groupBy.push(`t.geography`);
    }
    else {
      // single geography (already WHERE'd above)
      selectExtras.push(`'${geoFilter}' AS geography`);
    }

    // segment
    if (segFilter === 'total') {
      selectExtras.push(`'total' AS segment`);
    }
    else if (segFilter === 'all') {
      selectExtras.push(`t.segment AS segment`);
      groupBy.push(`t.segment`);
    }
    else {
      selectExtras.push(`'${segFilter}' AS segment`);
    }

    // scenario
    if (scenarioFilter === 'all') {
      selectExtras.push(`t.scenario_id AS scenario_id`);
      groupBy.push(`t.scenario_id`);
    }
    else {
      selectExtras.push(`'${scenarioFilter}' AS scenario_id`);
    }

    // 6) Put it all together
    const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
    const sql = `
      SELECT
        ${timeExpr}               AS "${timeAlias}",
        ${selectExtras.join(', ')},
        ${aggFunc}(t.value)       AS value
      FROM read_parquet('${dataDir}/**/*.parquet') AS t
      WHERE ${wheres.join(' AND ')}
      GROUP BY ${groupBy.join(', ')}
      ORDER BY ${timeAlias}
    `;

    console.log('SQL Query:', sql);
    console.log('Period start/end:', start, end);

    // 7) Execute
    const rawRows = await new Promise((ok, nok) =>
      conn.all(sql, (err, rows) => (err ? nok(err) : ok(rows)))
    );

    // 8) Clean BigInt
    const rows = rawRows.map(r =>
      Object.fromEntries(Object.entries(r).map(([k,v]) =>
        typeof v === 'bigint' ? [k, Number(v)] : [k,v]
      ))
    );

    // 9) Send back JSON or CSV
    if (fmt === 'csv') {
      const header = Object.keys(rows[0] || {}).join(',');
      const lines = rows.map(r => {
          return [
            // ensure ISO format for the period
            formatPeriod(r.period, resolution),
            r.geography,
            r.segment,
            r.scenario_id,
            r.value
          ].join(',');
      });
      res.type('text/csv').send([header, ...lines].join('\n'));
    } else {
      res.json(rows);
    }
  } catch (err) {
    console.error(err);
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

const port = 4010;
app.listen(port, () => {
  console.log(`✅ Local server running at http://localhost:${port}`);
});
