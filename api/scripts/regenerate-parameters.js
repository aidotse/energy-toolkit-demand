// api/scripts/regenerate-parameters.js
// Regenerates parameter parquet files from base scenario data + curve files.
// Also regenerates housing_growth curves.parquet if it's missing indices 4-6.

import duckdb from 'duckdb';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { findProjectRoot, getDataDir } from '../../paths.js';

const projectRoot = findProjectRoot();
const dataDir = getDataDir();
const baseDir = path.join(dataDir, 'base');
const parametersDir = path.join(dataDir, 'parameters');

// S-curve generation parameters (matches generator/library/curves.py)
const SCURVE_CONFIG = {
  startYear: 2025,
  endYear: 2050,
  midpointYear: 2037,
  transitionYears: 10, // steepness = "10y"
  scenarios: [
    { index: 1, endMultiplier: 0.85, label: '-15%' },
    { index: 2, endMultiplier: 0.90, label: '-10%' },
    { index: 3, endMultiplier: 0.95, label: '-5%' },
    { index: 4, endMultiplier: 1.05, label: '+5%' },
    { index: 5, endMultiplier: 1.10, label: '+10%' },
    { index: 6, endMultiplier: 1.15, label: '+15%' },
  ]
};

function runQuery(conn, sql) {
  return new Promise((resolve, reject) =>
    conn.run(sql, (err) => (err ? reject(err) : resolve()))
  );
}

function allQuery(conn, sql) {
  return new Promise((resolve, reject) =>
    conn.all(sql, (err, rows) => (err ? reject(err) : resolve(rows)))
  );
}

/**
 * Regenerate housing_growth curves.parquet with all 6 S-curve indices.
 * Uses DuckDB to generate hourly timestamps and compute the logistic S-curve.
 */
async function regenerateHousingCurves(conn) {
  const curvesPath = path.join(projectRoot, 'generator/input/scenarios/housing_growth/curves.parquet');

  // Check if housing already has 6 indices
  const indices = await allQuery(conn,
    `SELECT DISTINCT CAST(index AS INTEGER) as idx FROM read_parquet('${curvesPath}') ORDER BY idx`
  );
  const existingIndices = indices.map(r => r.idx);

  if (existingIndices.length === 6 && existingIndices[5] === 6) {
    console.log('  housing_growth curves already have 6 indices, skipping');
    return;
  }

  console.log(`  housing_growth has indices [${existingIndices}], regenerating with [1-6]...`);

  const { startYear, endYear, midpointYear, transitionYears, scenarios } = SCURVE_CONFIG;

  // Logistic S-curve formula (matching Python implementation):
  //   seconds_for_90pct = transitionYears * 365.25 * 24 * 3600
  //   x = 6 * (seconds_from_midpoint) / seconds_for_90pct
  //   value = y0 + (y1 - y0) / (1 + exp(-x))
  const secondsFor90pct = transitionYears * 365.25 * 24 * 3600;

  // Generate hourly timestamps from 2025-01-01 00:00 to 2050-12-31 23:00
  // Then for each scenario, compute the S-curve value
  const unionParts = scenarios.map(({ index, endMultiplier }) => {
    const y0 = 1.0;
    const y1 = endMultiplier;
    return `
      SELECT
        ts AS timestamp,
        ${index} AS index,
        CAST(${y0} + (${y1} - ${y0}) / (1.0 + exp(-(6.0 * EXTRACT(EPOCH FROM (ts - TIMESTAMP '${midpointYear}-01-01')) / ${secondsFor90pct}))) AS DOUBLE) AS value
      FROM generate_series(
        TIMESTAMP '${startYear}-01-01 00:00:00',
        TIMESTAMP '${endYear}-12-31 23:00:00',
        INTERVAL '1 hour'
      ) t(ts)
    `;
  });

  const sql = `
    COPY (
      ${unionParts.join('\n      UNION ALL\n      ')}
    )
    TO '${curvesPath}'
    (FORMAT PARQUET, COMPRESSION ZSTD)
  `;

  await runQuery(conn, sql);

  // Verify
  const verify = await allQuery(conn,
    `SELECT CAST(index AS INTEGER) as idx, CAST(MIN(value) AS DOUBLE) as min_val, CAST(MAX(value) AS DOUBLE) as max_val FROM read_parquet('${curvesPath}') GROUP BY index ORDER BY idx`
  );
  console.log('  Verification:');
  for (const row of verify) {
    console.log(`    Index ${row.idx}: ${row.min_val.toFixed(4)} -> ${row.max_val.toFixed(4)}`);
  }
}

/**
 * Generate parameter parquet files for all growth parameters.
 * For each segment and each curve index, combines base data with curve multiplier.
 */
async function generateParameterParquets(conn, config) {
  const baseScenario = config.parameters.baseScenario;

  // Find slugified base scenario directory
  const mappingPath = path.join(dataDir, 'scenario-mapping.json');
  let baseSlug = baseScenario.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (fs.existsSync(mappingPath)) {
    const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    // Find the slug that maps to our base scenario
    for (const [slug, name] of Object.entries(mapping)) {
      if (name === baseScenario) {
        baseSlug = slug;
        break;
      }
    }
  }

  const definitions = config.parameters.definitions;
  let totalGenerated = 0;

  for (const [paramName, paramDef] of Object.entries(definitions)) {
    // Only process growth parameters
    if (!paramName.endsWith('_growth')) continue;

    const segment = paramDef.segments[0];
    const curvesPath = path.join(projectRoot, `generator/input/scenarios/${paramName}/curves.parquet`);
    const basePath = path.join(baseDir, baseSlug, segment, 'data.parquet');

    if (!fs.existsSync(curvesPath)) {
      console.log(`  SKIP ${paramName}: curves file not found at ${curvesPath}`);
      continue;
    }
    if (!fs.existsSync(basePath)) {
      console.log(`  SKIP ${paramName}: base file not found at ${basePath}`);
      continue;
    }

    console.log(`  ${paramName} (segment: ${segment})`);

    // Get non-zero indices from config values
    const nonZeroValues = paramDef.values.filter(v => v.index > 0);

    for (const valDef of nonZeroValues) {
      const idx = valDef.index;
      const outDir = path.join(parametersDir, paramName, String(idx), segment);
      const outFile = path.join(outDir, 'data.parquet');

      fs.mkdirSync(outDir, { recursive: true });

      // SQL: multiply base value by curve multiplier
      const sql = `
        COPY (
          WITH curve_data AS (
            SELECT timestamp, value
            FROM read_parquet('${curvesPath}')
            WHERE index = ${idx}
          )
          SELECT
            b.timestamp,
            b.value * COALESCE(c.value, 1.0) AS value,
            b.geography,
            b.segment
          FROM read_parquet('${basePath}') b
          LEFT JOIN curve_data c ON b.timestamp = c.timestamp
        )
        TO '${outFile}'
        (FORMAT PARQUET, COMPRESSION ZSTD)
      `;

      await runQuery(conn, sql);
      totalGenerated++;
    }

    console.log(`    Generated ${nonZeroValues.length} index files`);
  }

  return totalGenerated;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Regenerating parameter parquet files');
  console.log('='.repeat(60));
  console.log(`Project root: ${projectRoot}`);
  console.log(`Data directory: ${dataDir}`);
  console.log('');

  // Load config
  const configPath = path.join(projectRoot, 'config.yaml');
  const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

  // Create DuckDB connection
  const db = new duckdb.Database(':memory:');
  const conn = db.connect();

  try {
    // Step 1: Regenerate housing curves if needed
    console.log('Step 1: Check/regenerate housing_growth curves');
    await regenerateHousingCurves(conn);
    console.log('');

    // Step 2: Generate parameter parquets for all growth parameters
    console.log('Step 2: Generate parameter parquet files');
    const count = await generateParameterParquets(conn, config);
    console.log('');

    console.log('='.repeat(60));
    console.log(`Done! Generated ${count} parameter parquet files.`);
    console.log('='.repeat(60));
  } finally {
    conn.close();
    db.close();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
