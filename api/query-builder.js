/**
 * @fileoverview SQL query builders for the Demand Toolkit API.
 *
 * Builds DuckDB SQL queries for Strategy 2 demand data with parameter combination,
 * and for pre-aggregated yearly tables.
 *
 * @module query-builder
 */

import path from 'path';
import fs from 'fs';

/**
 * Sanitize SQL identifier/value to prevent injection.
 * Only allows alphanumeric, hyphens, underscores.
 *
 * @param {string} value - The value to sanitize
 * @returns {string} The sanitized value
 * @throws {Error} If the value contains disallowed characters
 */
function sanitizeSqlValue(value) {
  if (typeof value !== 'string') return String(value);
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new Error(`Invalid SQL value: ${value}`);
  }
  return value;
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
 * @returns {string} SQL query
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

  // Sanitize filter values to prevent SQL injection
  const safeGeoFilter = sanitizeSqlValue(geoFilter);
  const safeSegFilter = sanitizeSqlValue(segFilter);
  const safeBaseScenario = sanitizeSqlValue(baseScenario);

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

  // Build queries for each segment
  const segmentQueries = [];

  for (const segment of segments) {
    // Skip if segment filter doesn't match
    if (safeSegFilter !== 'all' && safeSegFilter !== 'total' && safeSegFilter !== segment) {
      continue;
    }

    // Base parquet path for this segment
    const basePath = path.join(baseDir, safeBaseScenario, segment, 'data.parquet');

    if (!fs.existsSync(basePath)) {
      console.warn(`Base file not found: ${basePath}`);
      continue;
    }

    // Find relevant parameters for this segment
    const segmentParams = [];
    if (strategy2Config?.parameters) {
      for (const [paramName, paramDef] of Object.entries(strategy2Config.parameters)) {
        if (paramDef.segment === segment) {
          const paramIndex = parameterValues[paramName] || 0;
          if (paramIndex > 0) {
            // Only join if parameter is not baseline (0)
            const paramPath = path.join(parametersDir, paramName, String(paramIndex), segment, 'data.parquet');
            if (fs.existsSync(paramPath)) {
              segmentParams.push({ name: paramName, path: paramPath, alias: paramName.replace(/_/g, '') });
            }
          }
        }
      }
    }

    // Build the query for this segment
    let selectValue = 'b.value';
    let fromClause = `read_parquet('${basePath}') b`;
    const joins = [];

    // Add JOIN clauses for each parameter
    segmentParams.forEach((param, idx) => {
      const alias = `p${idx}`;
      joins.push(`LEFT JOIN read_parquet('${param.path}') ${alias} ON b.timestamp = ${alias}.timestamp AND b.geography = ${alias}.geography`);
      selectValue = `${selectValue} * COALESCE(${alias}.value / NULLIF(b.value, 0), 1.0)`;
    });

    const whereConditions = [
      `b.timestamp >= TIMESTAMP '${start}'`,
      `b.timestamp < TIMESTAMP '${end}'`
    ];

    if (safeGeoFilter !== 'all' && safeGeoFilter !== 'total') {
      whereConditions.push(`b.geography = '${safeGeoFilter}'`);
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

  // Build GROUP BY and SELECT based on filters
  const groupBy = [timeExpr];
  const selectExtras = [];

  // Geography handling
  if (safeGeoFilter === 'total') {
    selectExtras.push("'total' AS geography");
  } else if (safeGeoFilter === 'all') {
    selectExtras.push('combined.geography AS geography');
    groupBy.push('combined.geography');
  } else {
    selectExtras.push(`'${safeGeoFilter}' AS geography`);
  }

  // Segment handling
  if (safeSegFilter === 'total') {
    selectExtras.push("'total' AS segment");
  } else if (safeSegFilter === 'all') {
    selectExtras.push('combined.segment AS segment');
    groupBy.push('combined.segment');
  } else {
    selectExtras.push(`'${safeSegFilter}' AS segment`);
  }

  // Build final query
  const sql = `
    SELECT
      ${timeExpr} AS period,
      ${selectExtras.join(',\n      ')},
      '${safeBaseScenario}' AS scenario_id,
      ${aggFunc}(combined.value) AS value
    FROM ${combinedData}
    GROUP BY ${groupBy.join(', ')}
    ORDER BY period
  `;

  return sql;
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
 * @returns {string|null} SQL query or null if aggregated file doesn't exist
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

  // Sanitize filter values to prevent SQL injection
  const safeGeoFilter = sanitizeSqlValue(geoFilter);
  const safeSegFilter = sanitizeSqlValue(segFilter);
  const safeBaseScenario = sanitizeSqlValue(baseScenario);

  const paramYearlyPath = path.join(aggregatedDir, 'param_yearly.parquet');
  if (!fs.existsSync(paramYearlyPath)) return null;

  const scenarioName = getScenarioName(safeBaseScenario);

  // Build per-segment filter conditions based on parameter values
  const segmentConditions = [];

  for (const segment of segments) {
    if (safeSegFilter !== 'all' && safeSegFilter !== 'total' && safeSegFilter !== segment) continue;

    const growthParam = `${segment}_growth`;
    const flexParam = `${segment}_flex`;
    const growthIndex = parameterValues[growthParam] || 0;
    const flexIndex = parameterValues[flexParam] || 0;

    segmentConditions.push(
      `(segment = '${segment}' AND growth_index = ${growthIndex} AND flex_index = ${flexIndex})`
    );
  }

  if (segmentConditions.length === 0) return null;

  const wheres = [
    `CAST(year AS INTEGER) >= ${new Date(start).getFullYear()}`,
    `CAST(year AS INTEGER) < ${new Date(end).getFullYear()}`,
    `scenario_id = '${scenarioName}'`,
    `(${segmentConditions.join(' OR ')})`
  ];

  if (safeGeoFilter !== 'all' && safeGeoFilter !== 'total') {
    wheres.push(`geography = '${safeGeoFilter}'`);
  }

  // Build GROUP BY and SELECT based on filters
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

  return `
    SELECT
      MAKE_TIMESTAMP(CAST(year AS INTEGER), 1, 1, 0, 0, 0) AS period,
      ${selectExtras.join(', ')},
      '${safeBaseScenario}' AS scenario_id,
      SUM(total_value) AS value
    FROM read_parquet('${paramYearlyPath}')
    WHERE ${wheres.join(' AND ')}
    GROUP BY ${groupBy.join(', ')}
    ORDER BY period
  `;
}

export { sanitizeSqlValue, buildStrategy2Query, buildParamAggregatedQuery, getScenarioName };
