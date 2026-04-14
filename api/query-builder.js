/**
 * @fileoverview SQL query builders for the Demand Toolkit API.
 *
 * Builds DuckDB SQL queries for Strategy 2 demand data with parameter combination,
 * and for pre-aggregated yearly tables.
 *
 * **SQL injection model:**
 * Every builder returns `{ sql, params }`. Literal *values* (dates, filter
 * strings, aggregation indices) are represented as `?` placeholders in the
 * SQL and bound via DuckDB's prepared statements (`conn.prepare(sql).all(...params, cb)`).
 * *Identifiers* (table names, column aliases, file paths) cannot be bound
 * and are still interpolated — but they either come from config (trusted)
 * or pass through `sanitizeSqlValue()` plus `safeDataPath()`, which are
 * whitelist checks.
 *
 * @module query-builder
 */

import path from 'path';
import fs from 'fs';

/**
 * Sanitize a SQL identifier (scenario name, segment, column alias) by
 * rejecting anything that isn't alphanumeric, hyphen, or underscore.
 *
 * Kept strictly for identifiers after the Phase 4 parameterization pass —
 * do NOT use this for value literals anymore; use `?` placeholders instead.
 *
 * @param {string} value - The identifier to sanitize
 * @returns {string} The sanitized value
 * @throws {Error} If the value contains disallowed characters
 */
function sanitizeSqlValue(value) {
  if (typeof value !== 'string') return String(value);
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }
  return value;
}

/**
 * Resolve a data-directory-relative path and verify the result is contained
 * within `baseDir`. Defense-in-depth against path traversal — the callers
 * already feed sanitized segments, but we still assert the boundary.
 *
 * @param {string} baseDir
 * @param {...string} segments
 * @returns {string} The absolute, contained path
 * @throws {Error} If the joined path escapes `baseDir`
 */
function safeDataPath(baseDir, ...segments) {
  const joined = path.join(baseDir, ...segments);
  const resolved = path.resolve(joined);
  const baseResolved = path.resolve(baseDir);
  if (!(resolved === baseResolved || resolved.startsWith(baseResolved + path.sep))) {
    throw new Error(`Path escape detected: ${segments.join('/')}`);
  }
  return resolved;
}

/**
 * Get scenario ID for aggregated table queries.
 * With English IDs, the slug is the scenario_id directly.
 */
function getScenarioName(slug) {
  return slug;
}

/**
 * Build SQL query for Strategy 2 demand data with parameter combination.
 *
 * @param {Object} opts - Query options
 * @param {string} opts.baseScenario - Base scenario ID
 * @param {string[]} opts.segments - List of segment names
 * @param {string} opts.geoFilter - Geography filter ('all', 'total', or specific geo)
 * @param {string} opts.segFilter - Segment filter ('all', 'total', or specific segment)
 * @param {string} opts.start - Start timestamp
 * @param {string} opts.end - End timestamp
 * @param {string} opts.resolution - Time resolution (1h, 1d, 1w, 1M, 1Y)
 * @param {string} opts.aggregation - Aggregation function (sum, max, avg)
 * @param {Object} opts.parameterValues - Parameter name to index mapping
 * @param {string} opts.baseDir - Base data directory
 * @param {string} opts.parametersDir - Parameters data directory
 * @param {Object|null} opts.strategy2Config - Strategy 2 configuration
 * @returns {{sql: string, params: Array<string>}} SQL query + bound values
 */
function buildStrategy2Query(opts) {
  const {
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
  } = opts;

  // Identifiers still need whitelisting because they end up in file paths
  // and column aliases (neither of which can be `?` placeholders).
  const safeGeoFilter = sanitizeSqlValue(geoFilter);
  const safeBaseScenario = sanitizeSqlValue(baseScenario);

  // Parse comma-separated segment filter (e.g. "housing,transport")
  let safeSegFilter;
  let segFilterList = null;
  if (segFilter.includes(',')) {
    segFilterList = segFilter.split(',').map(s => sanitizeSqlValue(s.trim()));
    safeSegFilter = segFilterList.join(',');
  } else {
    safeSegFilter = sanitizeSqlValue(segFilter);
  }

  const aggFunc = aggregation === 'sum' ? 'SUM' : aggregation === 'max' ? 'MAX' : 'AVG';

  // Map resolution to SQL truncation (using 'combined' as the outer alias)
  let timeExpr;
  switch (resolution) {
    case '1h': timeExpr = 'combined.timestamp'; break;
    case '1d': timeExpr = "DATE_TRUNC('day', combined.timestamp)"; break;
    case '1w': timeExpr = "DATE_TRUNC('week', combined.timestamp)"; break;
    case '1M': timeExpr = "DATE_TRUNC('month', combined.timestamp)"; break;
    case '1Y': timeExpr = "DATE_TRUNC('year', combined.timestamp)"; break;
    default: timeExpr = 'combined.timestamp';
  }

  // Build queries for each segment. Each subquery may bind (start, end,
  // geography) — we collect those in segmentParams in the same order they
  // appear textually.
  const segmentQueries = [];
  const segmentParams = [];

  for (const segment of segments) {
    // Skip if segment filter doesn't match
    if (safeSegFilter !== 'all' && safeSegFilter !== 'total') {
      if (segFilterList) {
        if (!segFilterList.includes(segment)) continue;
      } else if (safeSegFilter !== segment) {
        continue;
      }
    }

    // Base parquet path for this segment — goes into read_parquet() as an
    // identifier, not a bindable value. Path is built from sanitized input
    // and checked against the base dir for defense-in-depth.
    const basePath = safeDataPath(baseDir, safeBaseScenario, segment, 'data.parquet');

    if (!fs.existsSync(basePath)) {
      console.warn(`Base file not found: ${basePath}`);
      continue;
    }

    // Find relevant parameters for this segment
    const paramJoins = [];
    if (strategy2Config?.parameters) {
      for (const [paramName, paramDef] of Object.entries(strategy2Config.parameters)) {
        if (paramDef.segment === segment) {
          const paramIndex = parameterValues[paramName] || 0;
          if (paramIndex > 0) {
            // Only join if parameter is not baseline (0)
            const safeParamName = sanitizeSqlValue(paramName);
            const paramPath = safeDataPath(
              parametersDir,
              safeParamName,
              String(paramIndex),
              segment,
              'data.parquet'
            );
            if (fs.existsSync(paramPath)) {
              paramJoins.push({ name: paramName, path: paramPath, alias: safeParamName.replace(/_/g, '') });
            }
          }
        }
      }
    }

    // Build the query for this segment
    let selectValue = 'b.value';
    const fromClause = `read_parquet('${basePath}') b`;
    const joins = [];

    // Add JOIN clauses for each parameter
    paramJoins.forEach((param, idx) => {
      const alias = `p${idx}`;
      joins.push(`LEFT JOIN read_parquet('${param.path}') ${alias} ON b.timestamp = ${alias}.timestamp AND b.geography = ${alias}.geography`);
      selectValue = `${selectValue} * COALESCE(${alias}.value / NULLIF(b.value, 0), 1.0)`;
    });

    const whereConditions = [
      'b.timestamp >= ?::TIMESTAMP',
      'b.timestamp < ?::TIMESTAMP',
    ];
    segmentParams.push(start, end);

    if (safeGeoFilter !== 'all' && safeGeoFilter !== 'total') {
      whereConditions.push('b.geography = ?');
      segmentParams.push(safeGeoFilter);
    }

    const segmentQuery = `
      SELECT
        b.timestamp,
        b.geography,
        '${segment}' as segment,
        (${selectValue}) as value
      FROM ${fromClause}
      ${joins.join('\n      ')}
      WHERE ${whereConditions.join(' AND ')}
    `;

    segmentQueries.push(segmentQuery);
  }

  if (segmentQueries.length === 0) {
    throw new Error('No matching segments found');
  }

  // Combine all segment queries with UNION ALL
  const combinedData = segmentQueries.length > 1
    ? `(${segmentQueries.join('\n      UNION ALL\n      ')}) combined`
    : `(${segmentQueries[0]}) combined`;

  // Build GROUP BY and outer SELECT.
  const groupBy = [timeExpr];
  const selectExtras = [];
  const selectParams = [];

  // Geography handling
  if (safeGeoFilter === 'total') {
    selectExtras.push("'total' AS geography");
  } else if (safeGeoFilter === 'all') {
    selectExtras.push('combined.geography AS geography');
    groupBy.push('combined.geography');
  } else {
    selectExtras.push('? AS geography');
    selectParams.push(safeGeoFilter);
  }

  // Segment handling
  if (safeSegFilter === 'total') {
    selectExtras.push("'total' AS segment");
  } else if (safeSegFilter === 'all' || segFilterList) {
    // 'all' or comma-separated list: return individual segment rows
    selectExtras.push('combined.segment AS segment');
    groupBy.push('combined.segment');
  } else {
    selectExtras.push('? AS segment');
    selectParams.push(safeSegFilter);
  }

  // Final query. Placeholder order reading top-to-bottom:
  //   outer SELECT (selectExtras ?s) → outer scenario_id ? → each segment
  //   subquery's WHERE ?s
  const sql = `
    SELECT
      ${timeExpr} AS period,
      ${selectExtras.join(',\n      ')},
      ? AS scenario_id,
      ${aggFunc}(combined.value) AS value
    FROM ${combinedData}
    GROUP BY ${groupBy.join(', ')}
    ORDER BY period
  `;

  const params = [
    ...selectParams,
    safeBaseScenario,
    ...segmentParams,
  ];

  return { sql, params };
}

/**
 * Build SQL query using param_yearly aggregated table for parameter-aware yearly queries.
 * Each segment's growth_index and flex_index are looked up independently.
 *
 * @param {Object} opts - Query options
 * @param {string} opts.baseScenario - Base scenario ID
 * @param {string[]} opts.segments - List of segment names
 * @param {string} opts.geoFilter - Geography filter
 * @param {string} opts.segFilter - Segment filter
 * @param {string} opts.start - Start timestamp
 * @param {string} opts.end - End timestamp
 * @param {Object} opts.parameterValues - Parameter name to index mapping
 * @param {string} opts.aggregatedDir - Aggregated data directory
 * @returns {{sql: string, params: Array<string|number>}|null} SQL query + params, or null if aggregated file doesn't exist
 */
function buildParamAggregatedQuery(opts) {
  const {
    baseScenario,
    segments,
    geoFilter,
    segFilter,
    start,
    end,
    parameterValues,
    aggregatedDir
  } = opts;

  // Sanitize filter values (they end up in column aliases + file paths)
  const safeGeoFilter = sanitizeSqlValue(geoFilter);
  const safeBaseScenario = sanitizeSqlValue(baseScenario);

  // Parse comma-separated segment filter
  let safeSegFilter;
  let segFilterList = null;
  if (segFilter.includes(',')) {
    segFilterList = segFilter.split(',').map(s => sanitizeSqlValue(s.trim()));
    safeSegFilter = segFilterList.join(',');
  } else {
    safeSegFilter = sanitizeSqlValue(segFilter);
  }

  const paramYearlyPath = safeDataPath(aggregatedDir, 'param_yearly.parquet');
  if (!fs.existsSync(paramYearlyPath)) return null;

  const scenarioName = getScenarioName(safeBaseScenario);

  // Build SELECT extras first (they appear earliest in the SQL text).
  const selectExtras = [];
  const selectParams = [];
  const groupBy = ['year'];

  if (safeGeoFilter === 'total') {
    selectExtras.push("'total' AS geography");
  } else if (safeGeoFilter === 'all') {
    selectExtras.push('geography');
    groupBy.push('geography');
  } else {
    selectExtras.push('? AS geography');
    selectParams.push(safeGeoFilter);
  }

  if (safeSegFilter === 'total') {
    selectExtras.push("'total' AS segment");
  } else if (safeSegFilter === 'all' || segFilterList) {
    selectExtras.push('segment');
    groupBy.push('segment');
  } else {
    selectExtras.push('? AS segment');
    selectParams.push(safeSegFilter);
  }

  // Build WHERE clauses + their params in textual order.
  const whereParams = [];
  const wheres = [
    'CAST(year AS INTEGER) >= ?',
    'CAST(year AS INTEGER) < ?',
    'scenario_id = ?',
  ];
  whereParams.push(
    new Date(start).getFullYear(),
    new Date(end).getFullYear(),
    scenarioName
  );

  const segmentConditions = [];
  for (const segment of segments) {
    if (safeSegFilter !== 'all' && safeSegFilter !== 'total') {
      if (segFilterList) {
        if (!segFilterList.includes(segment)) continue;
      } else if (safeSegFilter !== segment) {
        continue;
      }
    }

    const growthParam = `${segment}_growth`;
    const flexParam = `${segment}_flex`;
    const growthIndex = parameterValues[growthParam] || 0;
    const flexIndex = parameterValues[flexParam] || 0;

    // segment is a config-controlled enum; safe to interpolate as identifier.
    // growth_index / flex_index are integers — bind them.
    segmentConditions.push(
      `(segment = '${sanitizeSqlValue(segment)}' AND growth_index = ? AND flex_index = ?)`
    );
    whereParams.push(growthIndex, flexIndex);
  }

  if (segmentConditions.length === 0) return null;

  wheres.push(`(${segmentConditions.join(' OR ')})`);

  if (safeGeoFilter !== 'all' && safeGeoFilter !== 'total') {
    wheres.push('geography = ?');
    whereParams.push(safeGeoFilter);
  }

  // Final SQL. Placeholder order reading top-to-bottom:
  //   selectExtras (geo/segment ?) → scenario_id ? → WHERE chain
  const sql = `
    SELECT
      MAKE_TIMESTAMP(CAST(year AS INTEGER), 1, 1, 0, 0, 0) AS period,
      ${selectExtras.join(', ')},
      ? AS scenario_id,
      SUM(total_value) AS value
    FROM read_parquet('${paramYearlyPath}')
    WHERE ${wheres.join(' AND ')}
    GROUP BY ${groupBy.join(', ')}
    ORDER BY period
  `;

  const params = [
    ...selectParams,
    safeBaseScenario,
    ...whereParams,
  ];

  return { sql, params };
}

/**
 * Build SQL for the pre-aggregated monthly parameter table (`param_monthly.parquet`).
 * Mirror of {@link buildParamAggregatedQuery} with `month` added to the grouping
 * and the period reconstructed via `MAKE_TIMESTAMP(year, month, 1, 0, 0, 0)`.
 *
 * Returns null if the parquet is missing, so the caller can fall back to the
 * raw-scan Strategy 2 path.
 *
 * @param {Object} opts
 * @param {string} opts.baseScenario
 * @param {string[]} opts.segments
 * @param {string} opts.geoFilter
 * @param {string} opts.segFilter
 * @param {string} opts.start
 * @param {string} opts.end
 * @param {Record<string, number>} opts.parameterValues
 * @param {string} opts.aggregatedDir
 */
function buildParamMonthlyAggregatedQuery(opts) {
  const {
    baseScenario,
    segments,
    geoFilter,
    segFilter,
    start,
    end,
    parameterValues,
    aggregatedDir
  } = opts;

  const safeGeoFilter = sanitizeSqlValue(geoFilter);
  const safeBaseScenario = sanitizeSqlValue(baseScenario);

  let safeSegFilter;
  let segFilterList = null;
  if (segFilter.includes(',')) {
    segFilterList = segFilter.split(',').map((s) => sanitizeSqlValue(s.trim()));
    safeSegFilter = segFilterList.join(',');
  } else {
    safeSegFilter = sanitizeSqlValue(segFilter);
  }

  const paramMonthlyPath = safeDataPath(aggregatedDir, 'param_monthly.parquet');
  if (!fs.existsSync(paramMonthlyPath)) return null;

  const scenarioName = getScenarioName(safeBaseScenario);

  const selectExtras = [];
  const selectParams = [];
  // Month grouping is the only structural difference from the yearly version.
  const groupBy = ['year', 'month'];

  if (safeGeoFilter === 'total') {
    selectExtras.push("'total' AS geography");
  } else if (safeGeoFilter === 'all') {
    selectExtras.push('geography');
    groupBy.push('geography');
  } else {
    selectExtras.push('? AS geography');
    selectParams.push(safeGeoFilter);
  }

  if (safeSegFilter === 'total') {
    selectExtras.push("'total' AS segment");
  } else if (safeSegFilter === 'all' || segFilterList) {
    selectExtras.push('segment');
    groupBy.push('segment');
  } else {
    selectExtras.push('? AS segment');
    selectParams.push(safeSegFilter);
  }

  const whereParams = [];
  const wheres = [
    'CAST(year AS INTEGER) >= ?',
    'CAST(year AS INTEGER) <= ?',
    'scenario_id = ?',
  ];
  // Inclusive upper bound on the year so a single-year query (e.g. 2030-01 to 2031-01)
  // still returns all 12 months for that year.
  whereParams.push(
    new Date(start).getFullYear(),
    new Date(end).getFullYear(),
    scenarioName
  );

  const segmentConditions = [];
  for (const segment of segments) {
    if (safeSegFilter !== 'all' && safeSegFilter !== 'total') {
      if (segFilterList) {
        if (!segFilterList.includes(segment)) continue;
      } else if (safeSegFilter !== segment) {
        continue;
      }
    }

    const growthParam = `${segment}_growth`;
    const flexParam = `${segment}_flex`;
    const growthIndex = parameterValues[growthParam] || 0;
    const flexIndex = parameterValues[flexParam] || 0;

    segmentConditions.push(
      `(segment = '${sanitizeSqlValue(segment)}' AND growth_index = ? AND flex_index = ?)`
    );
    whereParams.push(growthIndex, flexIndex);
  }

  if (segmentConditions.length === 0) return null;

  wheres.push(`(${segmentConditions.join(' OR ')})`);

  if (safeGeoFilter !== 'all' && safeGeoFilter !== 'total') {
    wheres.push('geography = ?');
    whereParams.push(safeGeoFilter);
  }

  const sql = `
    SELECT
      MAKE_TIMESTAMP(CAST(year AS INTEGER), CAST(month AS INTEGER), 1, 0, 0, 0) AS period,
      ${selectExtras.join(', ')},
      ? AS scenario_id,
      SUM(total_value) AS value
    FROM read_parquet('${paramMonthlyPath}')
    WHERE ${wheres.join(' AND ')}
    GROUP BY ${groupBy.join(', ')}
    ORDER BY period
  `;

  const params = [
    ...selectParams,
    safeBaseScenario,
    ...whereParams,
  ];

  return { sql, params };
}

/**
 * Build SQL for the baseline pre-aggregated yearly tables (no parameters).
 * Picks the right `national_yearly` / `geography_yearly` / `segment_yearly`
 * / `geo_segment_yearly` parquet depending on filter shape — the caller
 * resolves the exact path and passes it in.
 *
 * @param {Object} opts
 * @param {string} opts.aggregatedTable - Already-resolved parquet path
 * @param {string} opts.baseScenario
 * @param {string} opts.geoFilter
 * @param {string} opts.segFilter
 * @param {string} opts.start
 * @param {string} opts.end
 * @returns {{sql: string, params: Array<string|number>}}
 */
function buildBaselineAggregatedQuery(opts) {
  const { aggregatedTable, baseScenario, geoFilter, segFilter, start, end } = opts;

  const safeGeoFilter = sanitizeSqlValue(geoFilter);
  const safeBaseScenario = sanitizeSqlValue(baseScenario);

  let safeSegFilter;
  let segFilterList = null;
  if (segFilter.includes(',')) {
    segFilterList = segFilter.split(',').map((s) => sanitizeSqlValue(s.trim()));
    safeSegFilter = segFilterList.join(',');
  } else {
    safeSegFilter = sanitizeSqlValue(segFilter);
  }

  const scenarioName = getScenarioName(safeBaseScenario);

  // SELECT extras first (they appear earliest in the SQL text).
  const selectExtras = [];
  const selectParams = [];
  const groupBy = ['year'];

  if (safeGeoFilter === 'total') {
    selectExtras.push("'total' AS geography");
  } else if (safeGeoFilter === 'all') {
    selectExtras.push('geography');
    groupBy.push('geography');
  } else {
    selectExtras.push('? AS geography');
    selectParams.push(safeGeoFilter);
  }

  if (safeSegFilter === 'total') {
    selectExtras.push("'total' AS segment");
  } else if (safeSegFilter === 'all' || segFilterList) {
    selectExtras.push('segment');
    groupBy.push('segment');
  } else {
    selectExtras.push('? AS segment');
    selectParams.push(safeSegFilter);
  }

  // WHERE clause + params in textual order.
  const whereParams = [];
  const wheres = [
    'CAST(year AS INTEGER) >= ?',
    'CAST(year AS INTEGER) < ?',
    'scenario_id = ?',
  ];
  whereParams.push(
    new Date(start).getFullYear(),
    new Date(end).getFullYear(),
    scenarioName
  );

  if (safeGeoFilter !== 'all' && safeGeoFilter !== 'total') {
    wheres.push('geography = ?');
    whereParams.push(safeGeoFilter);
  }

  if (safeSegFilter !== 'all' && safeSegFilter !== 'total') {
    if (segFilterList) {
      const placeholders = segFilterList.map(() => '?').join(', ');
      wheres.push(`segment IN (${placeholders})`);
      whereParams.push(...segFilterList);
    } else {
      wheres.push('segment = ?');
      whereParams.push(safeSegFilter);
    }
  }

  const sql = `
    SELECT
      MAKE_TIMESTAMP(CAST(year AS INTEGER), 1, 1, 0, 0, 0) AS period,
      ${selectExtras.join(', ')},
      ? AS scenario_id,
      SUM(total_value) AS value
    FROM read_parquet('${aggregatedTable}')
    WHERE ${wheres.join(' AND ')}
    GROUP BY ${groupBy.join(', ')}
    ORDER BY period
  `;

  const params = [
    ...selectParams,
    safeBaseScenario,
    ...whereParams,
  ];

  return { sql, params };
}

export {
  sanitizeSqlValue,
  safeDataPath,
  buildStrategy2Query,
  buildParamAggregatedQuery,
  buildParamMonthlyAggregatedQuery,
  buildBaselineAggregatedQuery,
  getScenarioName
};
