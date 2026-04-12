import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import duckdb from 'duckdb';
import fs from 'fs';
import path from 'path';
import { parsePeriod } from '../../utils.js';
import { findProjectRoot } from '../../../paths.js';

/**
 * Integration tests for /demand endpoint and DuckDB queries
 *
 * These tests verify the core DuckDB query logic that powers the /demand endpoint.
 * They test against the actual Parquet files in the nested directory structure.
 */

let db;
let conn;
let dataDir;
let baseDir;
let scenariosDir;
let testScenarioId;
let singleScenarioGlob;

/** Promisified wrapper for conn.all() (DuckDB 1.x callback API) */
function query(sql) {
  return new Promise((resolve, reject) => {
    conn.all(sql, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

beforeAll(async () => {
  // Use the same data directory as the server (project root /data/)
  let projectRoot;
  try {
    projectRoot = findProjectRoot();
  } catch {
    projectRoot = path.resolve(process.cwd(), '..');
  }
  dataDir = path.join(projectRoot, 'data');
  baseDir = path.join(dataDir, 'base');
  scenariosDir = path.join(dataDir, 'scenarios');

  // Check if data exists
  if (!fs.existsSync(baseDir) && !fs.existsSync(scenariosDir)) {
    throw new Error('Parquet data not found. Run generator first.');
  }

  // Initialize DuckDB connection
  db = new duckdb.Database(':memory:');
  conn = db.connect();

  // Discover an actual scenario_id from the data
  const baseGlob = path.join(baseDir, '**', 'data.parquet');
  const rows = await query(`SELECT DISTINCT scenario_id FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE) LIMIT 1`);
  testScenarioId = rows.length > 0 ? rows[0].scenario_id : 'default';

  // Use a single scenario subdirectory for UNION tests (scanning all 15GB+ is too slow)
  if (fs.existsSync(scenariosDir)) {
    const firstSubdir = fs.readdirSync(scenariosDir).find(d =>
      fs.statSync(path.join(scenariosDir, d)).isDirectory()
    );
    if (firstSubdir) {
      singleScenarioGlob = path.join(scenariosDir, firstSubdir, '**', 'data.parquet');
    }
  }
});

afterAll(() => {
  if (db) {
    db.close();
  }
});

describe('DuckDB Parquet Query Tests', { timeout: 30_000 }, () => {
  describe('Data structure validation', () => {
    test('should find base scenario files', async () => {
      const baseGlob = path.join(baseDir, '**', 'data.parquet');
      const result = await query(`SELECT COUNT(*) as file_count FROM glob('${baseGlob}')`);
      expect(result[0].file_count).toBeGreaterThan(0);
    });

    test('should find scenario files', async () => {
      if (!fs.existsSync(scenariosDir)) {
        console.log('⏭️  Skipping: No scenarios directory found');
        return;
      }

      const scenariosGlob = path.join(scenariosDir, '**', 'data.parquet');
      const result = await query(`SELECT COUNT(*) as file_count FROM glob('${scenariosGlob}')`);
      expect(result[0].file_count).toBeGreaterThan(0);
    });

    test('base scenario should have required columns', async () => {
      const baseGlob = path.join(baseDir, '**', 'data.parquet');
      const result = await query(`
        SELECT * FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
        LIMIT 1
      `);
      expect(result.length).toBeGreaterThan(0);

      const row = result[0];
      expect(row).toHaveProperty('timestamp');
      expect(row).toHaveProperty('value');
      expect(row).toHaveProperty('geography');
      expect(row).toHaveProperty('segment');
      expect(row).toHaveProperty('scenario_id');
    });
  });

  describe('UNION query for base + scenarios', () => {
    test('should combine base and scenario files', async () => {
      if (!singleScenarioGlob) {
        console.log('⏭️  Skipping: No scenario data found');
        return;
      }

      const baseGlob = path.join(baseDir, '**', 'data.parquet');

      // Use a single scenario subdirectory to keep query time reasonable
      const result = await query(`
        SELECT COUNT(*) as total_records FROM (
          SELECT timestamp, value, geography, segment, scenario_id
          FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
          UNION ALL
          SELECT timestamp, value, geography, segment, scenario_id
          FROM parquet_scan('${singleScenarioGlob}', hive_partitioning=FALSE)
        )
      `);
      expect(result[0].total_records).toBeGreaterThan(0);
    });

    test('should normalize schemas between base and scenarios', async () => {
      if (!singleScenarioGlob) {
        console.log('⏭️  Skipping: No scenario data found');
        return;
      }

      const baseGlob = path.join(baseDir, '**', 'data.parquet');

      const result = await query(`
        SELECT COUNT(*) as count FROM (
          SELECT
            timestamp, value, geography, segment, scenario_id,
            true as is_base
          FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
          UNION ALL
          SELECT
            timestamp, value, geography, segment, scenario_id,
            false as is_base
          FROM parquet_scan('${singleScenarioGlob}', hive_partitioning=FALSE)
        )
      `);
      expect(result[0].count).toBeGreaterThan(0);
    });
  });

  describe('Aggregation queries', () => {
    test('should aggregate national yearly totals', async () => {
      const baseGlob = path.join(baseDir, '**', 'data.parquet');

      const result = await query(`
        SELECT
          DATE_TRUNC('year', timestamp) as year,
          SUM(value) as total_value
        FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
        WHERE
          timestamp >= TIMESTAMP '2030-01-01'
          AND timestamp <= TIMESTAMP '2031-01-01'
          AND scenario_id = '${testScenarioId}'
        GROUP BY DATE_TRUNC('year', timestamp)
        ORDER BY year
      `);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('year');
      expect(result[0]).toHaveProperty('total_value');
      expect(typeof result[0].total_value).toBe('number');
    });

    test('should support geography=all aggregation', async () => {
      const baseGlob = path.join(baseDir, '**', 'data.parquet');

      const result = await query(`
        SELECT
          DATE_TRUNC('year', timestamp) as year,
          geography,
          SUM(value) as total_value
        FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
        WHERE
          timestamp >= TIMESTAMP '2030-01-01'
          AND timestamp <= TIMESTAMP '2031-01-01'
          AND scenario_id = '${testScenarioId}'
        GROUP BY DATE_TRUNC('year', timestamp), geography
        ORDER BY year, geography
      `);
      expect(result.length).toBeGreaterThan(1);

      const uniqueGeos = new Set(result.map(r => r.geography));
      expect(uniqueGeos.size).toBeGreaterThan(1);
    });

    test('should support segment=all aggregation', async () => {
      const baseGlob = path.join(baseDir, '**', 'data.parquet');

      const result = await query(`
        SELECT
          DATE_TRUNC('year', timestamp) as year,
          segment,
          SUM(value) as total_value
        FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
        WHERE
          timestamp >= TIMESTAMP '2030-01-01'
          AND timestamp <= TIMESTAMP '2031-01-01'
          AND scenario_id = '${testScenarioId}'
        GROUP BY DATE_TRUNC('year', timestamp), segment
        ORDER BY year, segment
      `);
      expect(result.length).toBeGreaterThan(1);

      const uniqueSegments = new Set(result.map(r => r.segment));
      expect(uniqueSegments.size).toBeGreaterThan(1);
    });

    test('should filter by specific geography', async () => {
      const baseGlob = path.join(baseDir, '**', 'data.parquet');

      const result = await query(`
        SELECT
          DATE_TRUNC('year', timestamp) as year,
          SUM(value) as total_value
        FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
        WHERE
          timestamp >= TIMESTAMP '2030-01-01'
          AND timestamp <= TIMESTAMP '2031-01-01'
          AND scenario_id = '${testScenarioId}'
          AND geography = '01'
        GROUP BY DATE_TRUNC('year', timestamp)
        ORDER BY year
      `);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('total_value');
    });
  });

  describe('Resolution support', () => {
    test('should support hourly resolution (1h)', async () => {
      const baseGlob = path.join(baseDir, '**', 'data.parquet');

      const result = await query(`
        SELECT
          timestamp,
          AVG(value) as avg_value
        FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
        WHERE
          timestamp >= TIMESTAMP '2030-01-01'
          AND timestamp < TIMESTAMP '2030-01-02'
          AND scenario_id = '${testScenarioId}'
          AND geography = '01'
        GROUP BY timestamp
        ORDER BY timestamp
        LIMIT 24
      `);
      expect(result.length).toBeLessThanOrEqual(24);
      expect(result[0]).toHaveProperty('timestamp');
      expect(result[0]).toHaveProperty('avg_value');
    });

    test('should support yearly resolution (1Y)', async () => {
      const baseGlob = path.join(baseDir, '**', 'data.parquet');

      const result = await query(`
        SELECT
          DATE_TRUNC('year', timestamp) as year,
          SUM(value) as total_value
        FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
        WHERE
          timestamp >= TIMESTAMP '2025-01-01'
          AND timestamp <= TIMESTAMP '2035-01-01'
          AND scenario_id = '${testScenarioId}'
        GROUP BY DATE_TRUNC('year', timestamp)
        ORDER BY year
      `);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(11);
    });

    test('should support monthly resolution (1M)', async () => {
      const baseGlob = path.join(baseDir, '**', 'data.parquet');

      const result = await query(`
        SELECT
          DATE_TRUNC('month', timestamp) as month,
          SUM(value) as total_value
        FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
        WHERE
          timestamp >= TIMESTAMP '2030-01-01'
          AND timestamp < TIMESTAMP '2031-01-01'
          AND scenario_id = '${testScenarioId}'
        GROUP BY DATE_TRUNC('month', timestamp)
        ORDER BY month
      `);
      expect(result.length).toBe(12);
    });
  });

  describe('Performance - pre-aggregated tables', () => {
    test('should have pre-aggregated geography_yearly table', async () => {
      const aggregatedFile = path.join(dataDir, 'aggregated', 'geography_yearly.parquet');

      if (!fs.existsSync(aggregatedFile)) {
        console.log('⏭️  Skipping: No aggregated tables found');
        return;
      }

      const result = await query(`
        SELECT
          geography,
          year,
          total_value
        FROM parquet_scan('${aggregatedFile}')
        WHERE year = '2030' AND scenario_id = '${testScenarioId}'
        LIMIT 5
      `);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('geography');
      expect(result[0]).toHaveProperty('year');
      expect(result[0]).toHaveProperty('total_value');
    });

    test('aggregated queries should be faster than raw queries', async () => {
      const aggregatedFile = path.join(dataDir, 'aggregated', 'geography_yearly.parquet');
      const baseGlob = path.join(baseDir, '**', 'data.parquet');

      if (!fs.existsSync(aggregatedFile)) {
        console.log('⏭️  Skipping: No aggregated tables found');
        return;
      }

      const startFast = Date.now();
      const fastResult = await query(`
        SELECT geography, total_value
        FROM parquet_scan('${aggregatedFile}')
        WHERE year = '2030' AND scenario_id = '${testScenarioId}'
      `);
      const fastTime = Date.now() - startFast;

      const startSlow = Date.now();
      const slowResult = await query(`
        SELECT geography, SUM(value) as total_value
        FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
        WHERE
          timestamp >= TIMESTAMP '2030-01-01'
          AND timestamp < TIMESTAMP '2031-01-01'
          AND scenario_id = '${testScenarioId}'
        GROUP BY geography
      `);
      const slowTime = Date.now() - startSlow;

      console.log(`⚡ Fast query: ${fastTime}ms, Slow query: ${slowTime}ms, Speedup: ${(slowTime/fastTime).toFixed(1)}x`);

      expect(fastResult.length).toBe(slowResult.length);
      expect(fastTime).toBeLessThanOrEqual(slowTime);
    });
  });

  describe('Utils integration', () => {
    test('parsePeriod should work with query parameters', () => {
      const period = {
        start: '2030',
        end: '2031',
        resolution: '1Y',
        aggregation: 'sum'
      };

      const { start, end } = parsePeriod(period);

      expect(start).toContain('2030');
      expect(end).toContain('2031');
    });

    test('parsePeriod should handle ISO date strings', () => {
      const period = {
        start: '2030-01-01',
        end: '2030-12-31',
        resolution: '1h',
        aggregation: 'mean'
      };

      const { start, end } = parsePeriod(period);

      expect(start).toContain('2030-01-01');
      expect(end).toContain('2030-12-31');
    });
  });
});
