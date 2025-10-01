import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import duckdb from 'duckdb';
import fs from 'fs';
import path from 'path';
import { parsePeriod } from '../../utils.js';

/**
 * Integration tests for /demand endpoint and DuckDB queries
 *
 * These tests verify the core DuckDB query logic that powers the /demand endpoint.
 * They test against the actual Parquet files in the nested directory structure.
 */

let db;
let conn;
const dataDir = path.join(process.cwd(), 'data');
const baseDir = path.join(dataDir, 'base');
const scenariosDir = path.join(dataDir, 'scenarios');

beforeAll(() => {
  // Check if data exists
  if (!fs.existsSync(baseDir) && !fs.existsSync(scenariosDir)) {
    throw new Error('Parquet data not found. Run generator first.');
  }

  // Initialize DuckDB connection
  db = new duckdb.Database(':memory:');
  conn = db.connect();
});

afterAll(() => {
  if (db) {
    db.close();
  }
});

describe('DuckDB Parquet Query Tests', () => {
  describe('Data structure validation', () => {
    test('should find base scenario files', () => {
      const baseGlob = path.join(baseDir, '**', 'data.parquet');
      const query = `SELECT COUNT(*) as file_count FROM glob('${baseGlob}')`;

      const result = conn.prepare(query).all();
      expect(result[0].file_count).toBeGreaterThan(0);
    });

    test('should find scenario files', () => {
      if (!fs.existsSync(scenariosDir)) {
        console.log('⏭️  Skipping: No scenarios directory found');
        return;
      }

      const scenariosGlob = path.join(scenariosDir, '**', 'data.parquet');
      const query = `SELECT COUNT(*) as file_count FROM glob('${scenariosGlob}')`;

      const result = conn.prepare(query).all();
      expect(result[0].file_count).toBeGreaterThan(0);
    });

    test('base scenario should have required columns', () => {
      const baseGlob = path.join(baseDir, '**', 'data.parquet');
      const query = `
        SELECT * FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
        LIMIT 1
      `;

      const result = conn.prepare(query).all();
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
    test('should combine base and scenario files', () => {
      const baseGlob = path.join(baseDir, '**', 'data.parquet');
      const scenariosGlob = path.join(scenariosDir, '**', 'data.parquet');

      const unionQuery = `
        SELECT COUNT(*) as total_records FROM (
          SELECT timestamp, value, geography, segment, scenario_id
          FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
          UNION ALL
          SELECT timestamp, value, geography, segment, scenario_id
          FROM parquet_scan('${scenariosGlob}', hive_partitioning=FALSE)
        )
      `;

      const result = conn.prepare(unionQuery).all();
      expect(result[0].total_records).toBeGreaterThan(0);
    });

    test('should normalize schemas between base and scenarios', () => {
      const baseGlob = path.join(baseDir, '**', 'data.parquet');
      const scenariosGlob = path.join(scenariosDir, '**', 'data.parquet');

      // Base has no parameter columns, scenarios do
      // UNION should work with normalized schemas
      const normalizedQuery = `
        SELECT COUNT(*) as count FROM (
          SELECT
            timestamp, value, geography, segment, scenario_id,
            NULL as housing_electrification,
            true as is_base
          FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
          UNION ALL
          SELECT
            timestamp, value, geography, segment, scenario_id,
            housing_electrification,
            false as is_base
          FROM parquet_scan('${scenariosGlob}', hive_partitioning=FALSE)
        )
      `;

      const result = conn.prepare(normalizedQuery).all();
      expect(result[0].count).toBeGreaterThan(0);
    });
  });

  describe('Aggregation queries', () => {
    test('should aggregate national yearly totals', () => {
      const baseGlob = path.join(baseDir, '**', 'data.parquet');

      const query = `
        SELECT
          DATE_TRUNC('year', timestamp) as year,
          SUM(value) as total_value
        FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
        WHERE
          timestamp >= TIMESTAMP '2030-01-01'
          AND timestamp <= TIMESTAMP '2031-01-01'
          AND scenario_id = 'default'
        GROUP BY DATE_TRUNC('year', timestamp)
        ORDER BY year
      `;

      const result = conn.prepare(query).all();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('year');
      expect(result[0]).toHaveProperty('total_value');
      expect(typeof result[0].total_value).toBe('number');
    });

    test('should support geography=all aggregation', () => {
      const baseGlob = path.join(baseDir, '**', 'data.parquet');

      const query = `
        SELECT
          DATE_TRUNC('year', timestamp) as year,
          geography,
          SUM(value) as total_value
        FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
        WHERE
          timestamp >= TIMESTAMP '2030-01-01'
          AND timestamp <= TIMESTAMP '2031-01-01'
          AND scenario_id = 'default'
        GROUP BY DATE_TRUNC('year', timestamp), geography
        ORDER BY year, geography
      `;

      const result = conn.prepare(query).all();
      expect(result.length).toBeGreaterThan(1); // Multiple geographies

      // Check that we have different geographies
      const uniqueGeos = new Set(result.map(r => r.geography));
      expect(uniqueGeos.size).toBeGreaterThan(1);
    });

    test('should support segment=all aggregation', () => {
      const baseGlob = path.join(baseDir, '**', 'data.parquet');

      const query = `
        SELECT
          DATE_TRUNC('year', timestamp) as year,
          segment,
          SUM(value) as total_value
        FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
        WHERE
          timestamp >= TIMESTAMP '2030-01-01'
          AND timestamp <= TIMESTAMP '2031-01-01'
          AND scenario_id = 'default'
        GROUP BY DATE_TRUNC('year', timestamp), segment
        ORDER BY year, segment
      `;

      const result = conn.prepare(query).all();
      expect(result.length).toBeGreaterThan(1); // Multiple segments

      // Check that we have different segments
      const uniqueSegments = new Set(result.map(r => r.segment));
      expect(uniqueSegments.size).toBeGreaterThan(1);
    });

    test('should filter by specific geography', () => {
      const baseGlob = path.join(baseDir, '**', 'data.parquet');

      const query = `
        SELECT
          DATE_TRUNC('year', timestamp) as year,
          SUM(value) as total_value
        FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
        WHERE
          timestamp >= TIMESTAMP '2030-01-01'
          AND timestamp <= TIMESTAMP '2031-01-01'
          AND scenario_id = 'default'
          AND geography = '01'
        GROUP BY DATE_TRUNC('year', timestamp)
        ORDER BY year
      `;

      const result = conn.prepare(query).all();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('total_value');
    });
  });

  describe('Resolution support', () => {
    test('should support hourly resolution (1h)', () => {
      const baseGlob = path.join(baseDir, '**', 'data.parquet');

      const query = `
        SELECT
          timestamp,
          AVG(value) as avg_value
        FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
        WHERE
          timestamp >= TIMESTAMP '2030-01-01'
          AND timestamp < TIMESTAMP '2030-01-02'
          AND scenario_id = 'default'
          AND geography = '01'
        GROUP BY timestamp
        ORDER BY timestamp
        LIMIT 24
      `;

      const result = conn.prepare(query).all();
      expect(result.length).toBeLessThanOrEqual(24); // Up to 24 hours
      expect(result[0]).toHaveProperty('timestamp');
      expect(result[0]).toHaveProperty('avg_value');
    });

    test('should support yearly resolution (1Y)', () => {
      const baseGlob = path.join(baseDir, '**', 'data.parquet');

      const query = `
        SELECT
          DATE_TRUNC('year', timestamp) as year,
          SUM(value) as total_value
        FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
        WHERE
          timestamp >= TIMESTAMP '2025-01-01'
          AND timestamp <= TIMESTAMP '2035-01-01'
          AND scenario_id = 'default'
        GROUP BY DATE_TRUNC('year', timestamp)
        ORDER BY year
      `;

      const result = conn.prepare(query).all();
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(11); // Max 11 years (2025-2035)
    });

    test('should support monthly resolution (1M)', () => {
      const baseGlob = path.join(baseDir, '**', 'data.parquet');

      const query = `
        SELECT
          DATE_TRUNC('month', timestamp) as month,
          SUM(value) as total_value
        FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
        WHERE
          timestamp >= TIMESTAMP '2030-01-01'
          AND timestamp < TIMESTAMP '2031-01-01'
          AND scenario_id = 'default'
        GROUP BY DATE_TRUNC('month', timestamp)
        ORDER BY month
      `;

      const result = conn.prepare(query).all();
      expect(result.length).toBe(12); // 12 months
    });
  });

  describe('Performance - pre-aggregated tables', () => {
    test('should have pre-aggregated geography_yearly table', () => {
      const aggregatedFile = path.join(dataDir, 'aggregated', 'geography_yearly.parquet');

      if (!fs.existsSync(aggregatedFile)) {
        console.log('⏭️  Skipping: No aggregated tables found');
        return;
      }

      const query = `
        SELECT
          geography,
          year,
          total_value
        FROM parquet_scan('${aggregatedFile}')
        WHERE year = '2030' AND scenario_id = 'default'
        LIMIT 5
      `;

      const result = conn.prepare(query).all();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('geography');
      expect(result[0]).toHaveProperty('year');
      expect(result[0]).toHaveProperty('total_value');
    });

    test('aggregated queries should be faster than raw queries', () => {
      const aggregatedFile = path.join(dataDir, 'aggregated', 'geography_yearly.parquet');
      const baseGlob = path.join(baseDir, '**', 'data.parquet');

      if (!fs.existsSync(aggregatedFile)) {
        console.log('⏭️  Skipping: No aggregated tables found');
        return;
      }

      // Fast query using aggregated table
      const fastQuery = `
        SELECT geography, total_value
        FROM parquet_scan('${aggregatedFile}')
        WHERE year = '2030' AND scenario_id = 'default'
      `;

      const startFast = Date.now();
      const fastResult = conn.prepare(fastQuery).all();
      const fastTime = Date.now() - startFast;

      // Slow query using raw data
      const slowQuery = `
        SELECT geography, SUM(value) as total_value
        FROM parquet_scan('${baseGlob}', hive_partitioning=FALSE)
        WHERE
          timestamp >= TIMESTAMP '2030-01-01'
          AND timestamp < TIMESTAMP '2031-01-01'
          AND scenario_id = 'default'
        GROUP BY geography
      `;

      const startSlow = Date.now();
      const slowResult = conn.prepare(slowQuery).all();
      const slowTime = Date.now() - startSlow;

      console.log(`⚡ Fast query: ${fastTime}ms, Slow query: ${slowTime}ms, Speedup: ${(slowTime/fastTime).toFixed(1)}x`);

      // Results should be equivalent
      expect(fastResult.length).toBe(slowResult.length);

      // Fast should be faster (allow some variance for small datasets)
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
