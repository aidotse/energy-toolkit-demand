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
const aggregatedDir = path.join(dataDir, 'aggregated');

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

/**
 * Load scenario slug-to-name mapping for aggregated tables.
 */
function loadScenarioMapping() {
  const mappingPath = path.join(dataDir, 'scenario-mapping.json');
  if (fs.existsSync(mappingPath)) {
    return JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  }
  return {};
}

/**
 * Generate geo_segment_yearly.parquet - yearly totals broken down by geography AND segment.
 * Covers the geoFilter='all' + segFilter='all' query shape that previously had no aggregated table.
 * Schema: scenario_id (VARCHAR), geography (VARCHAR), segment (VARCHAR), year (VARCHAR), total_value (DOUBLE)
 */
async function generateGeoSegmentYearly(conn) {
  const scenarioMapping = loadScenarioMapping();
  const scenarios = Object.keys(scenarioMapping);
  const segments = ['housing', 'transport', 'industry', 'services', 'datacenters'];

  fs.mkdirSync(aggregatedDir, { recursive: true });
  const outFile = path.join(aggregatedDir, 'geo_segment_yearly.parquet');

  const unionParts = [];

  for (const scenarioSlug of scenarios) {
    const scenarioName = scenarioMapping[scenarioSlug];
    for (const segment of segments) {
      const basePath = path.join(baseDir, scenarioSlug, segment, 'data.parquet');
      if (!fs.existsSync(basePath)) {
        console.warn(`  SKIP ${scenarioSlug}/${segment}: base file not found`);
        continue;
      }
      unionParts.push(`
        SELECT
          '${scenarioName}' AS scenario_id,
          b.geography,
          '${segment}' AS segment,
          CAST(EXTRACT(YEAR FROM b.timestamp) AS VARCHAR) AS year,
          SUM(b.value) AS total_value
        FROM read_parquet('${basePath}') b
        GROUP BY b.geography, EXTRACT(YEAR FROM b.timestamp)
      `);
    }
  }

  if (unionParts.length === 0) {
    console.warn('  No data found for geo_segment_yearly');
    return;
  }

  const sql = `
    COPY (
      ${unionParts.join('\n      UNION ALL\n      ')}
    )
    TO '${outFile}'
    (FORMAT PARQUET, COMPRESSION ZSTD)
  `;

  await runQuery(conn, sql);

  // Verify
  const stats = await allQuery(conn,
    `SELECT COUNT(*) as cnt, COUNT(DISTINCT scenario_id) as scenarios, COUNT(DISTINCT geography) as geos, COUNT(DISTINCT segment) as segs
     FROM read_parquet('${outFile}')`
  );
  const s = stats[0];
  console.log(`  Generated: ${s.cnt} rows (${s.scenarios} scenarios × ${s.geos} geos × ${s.segs} segments)`);
}

/**
 * Generate param_yearly.parquet - yearly totals for every parameter combination.
 * Pre-computes base × growth_curve × flex_curve for all (growth_index, flex_index) combos.
 * Schema: scenario_id, geography, segment, year, growth_index, flex_index, total_value
 *
 * Processes each parameter combination individually to avoid expensive CROSS JOINs.
 */
async function generateParamYearly(conn, config) {
  const scenarioMapping = loadScenarioMapping();
  const scenarios = Object.keys(scenarioMapping);
  const segments = ['housing', 'transport', 'industry', 'services', 'datacenters'];
  const definitions = config.parameters.definitions;

  fs.mkdirSync(aggregatedDir, { recursive: true });
  const outFile = path.join(aggregatedDir, 'param_yearly.parquet');

  // Create a temporary table to accumulate results
  await runQuery(conn, `
    CREATE OR REPLACE TABLE param_yearly_tmp (
      scenario_id VARCHAR,
      geography VARCHAR,
      segment VARCHAR,
      year VARCHAR,
      growth_index INTEGER,
      flex_index INTEGER,
      total_value DOUBLE
    )
  `);

  let comboCount = 0;

  for (const scenarioSlug of scenarios) {
    const scenarioName = scenarioMapping[scenarioSlug];

    for (const segment of segments) {
      const basePath = path.join(baseDir, scenarioSlug, segment, 'data.parquet');
      if (!fs.existsSync(basePath)) {
        console.warn(`  SKIP ${scenarioSlug}/${segment}: base file not found`);
        continue;
      }

      const growthParam = `${segment}_growth`;
      const flexParam = `${segment}_flex`;
      const growthDef = definitions[growthParam];
      const flexDef = definitions[flexParam];

      const maxGrowth = growthDef ? Math.max(...growthDef.values.map(v => v.index)) : 0;
      const maxFlex = flexDef ? Math.max(...flexDef.values.map(v => v.index)) : 0;

      const growthCurvesPath = path.join(projectRoot, `generator/input/scenarios/${growthParam}/curves.parquet`);
      const flexCurvesPath = path.join(projectRoot, `generator/input/scenarios/${flexParam}/curves.parquet`);
      const hasGrowthCurves = fs.existsSync(growthCurvesPath);
      const hasFlexCurves = fs.existsSync(flexCurvesPath);

      const combos = (maxGrowth + 1) * (maxFlex + 1);
      console.log(`  ${scenarioSlug}/${segment}: ${combos} combos (growth 0-${maxGrowth} × flex 0-${maxFlex})`);

      // Process each (growth_index, flex_index) combination individually
      for (let gi = 0; gi <= maxGrowth; gi++) {
        for (let fi = 0; fi <= maxFlex; fi++) {
          let selectValue = 'b.value';
          let fromClause = `read_parquet('${basePath}') b`;
          const joins = [];

          if (gi > 0 && hasGrowthCurves) {
            joins.push(`LEFT JOIN (SELECT timestamp, value FROM read_parquet('${growthCurvesPath}') WHERE CAST(index AS INTEGER) = ${gi}) g ON b.timestamp = g.timestamp`);
            selectValue = `${selectValue} * COALESCE(g.value, 1.0)`;
          }

          if (fi > 0 && hasFlexCurves) {
            joins.push(`LEFT JOIN (SELECT timestamp, value FROM read_parquet('${flexCurvesPath}') WHERE CAST(index AS INTEGER) = ${fi}) f ON b.timestamp = f.timestamp`);
            selectValue = `${selectValue} * COALESCE(f.value, 1.0)`;
          }

          const sql = `
            INSERT INTO param_yearly_tmp
            SELECT
              '${scenarioName}' AS scenario_id,
              b.geography,
              '${segment}' AS segment,
              CAST(EXTRACT(YEAR FROM b.timestamp) AS VARCHAR) AS year,
              ${gi} AS growth_index,
              ${fi} AS flex_index,
              SUM(${selectValue}) AS total_value
            FROM ${fromClause}
            ${joins.join('\n            ')}
            GROUP BY b.geography, EXTRACT(YEAR FROM b.timestamp)
          `;

          await runQuery(conn, sql);
          comboCount++;
        }
      }
    }
  }

  // Write to parquet
  await runQuery(conn, `
    COPY (SELECT * FROM param_yearly_tmp ORDER BY scenario_id, segment, geography, year, growth_index, flex_index)
    TO '${outFile}'
    (FORMAT PARQUET, COMPRESSION ZSTD)
  `);

  // Verify
  const stats = await allQuery(conn,
    `SELECT COUNT(*) as cnt, COUNT(DISTINCT scenario_id) as scenarios,
            COUNT(DISTINCT segment) as segs, COUNT(DISTINCT geography) as geos
     FROM read_parquet('${outFile}')`
  );
  const s = stats[0];
  console.log(`  Generated: ${s.cnt} rows (${s.scenarios} scenarios × ${s.geos} geos × ${s.segs} segments, ${comboCount} combos)`);

  // Cleanup
  await runQuery(conn, 'DROP TABLE IF EXISTS param_yearly_tmp');

  return comboCount;
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

    // Step 3: Generate geo_segment_yearly aggregated table
    console.log('Step 3: Generate geo_segment_yearly aggregated table');
    await generateGeoSegmentYearly(conn);
    console.log('');

    // Step 4: Generate param_yearly aggregated table (all parameter combos)
    console.log('Step 4: Generate param_yearly aggregated table');
    await generateParamYearly(conn, config);
    console.log('');

    console.log('='.repeat(60));
    console.log(`Done! Generated ${count} parameter parquet files + aggregated tables.`);
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
