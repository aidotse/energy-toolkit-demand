import { describe, test, expect, vi, beforeEach } from 'vitest';
import { sanitizeSqlValue, buildStrategy2Query, buildParamAggregatedQuery } from '../../query-builder.js';
import path from 'path';
import fs from 'fs';

// Mock fs.existsSync for controlling file existence in tests
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(() => true),
    },
    existsSync: vi.fn(() => true),
  };
});

describe('query-builder.js', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  describe('sanitizeSqlValue', () => {
    test('should accept valid alphanumeric values', () => {
      expect(sanitizeSqlValue('total')).toBe('total');
      expect(sanitizeSqlValue('all')).toBe('all');
      expect(sanitizeSqlValue('housing')).toBe('housing');
    });

    test('should accept values with hyphens', () => {
      expect(sanitizeSqlValue('beslutad-policy')).toBe('beslutad-policy');
      expect(sanitizeSqlValue('SE-01')).toBe('SE-01');
    });

    test('should accept values with underscores', () => {
      expect(sanitizeSqlValue('housing_growth')).toBe('housing_growth');
    });

    test('should accept numeric strings', () => {
      expect(sanitizeSqlValue('2025')).toBe('2025');
    });

    test('should convert non-string values to strings', () => {
      expect(sanitizeSqlValue(42)).toBe('42');
      expect(sanitizeSqlValue(0)).toBe('0');
    });

    test('should reject SQL injection attempts with single quotes', () => {
      expect(() => sanitizeSqlValue("'; DROP TABLE --")).toThrow('Invalid SQL value');
    });

    test('should reject SQL injection attempts with semicolons', () => {
      expect(() => sanitizeSqlValue('value; DELETE')).toThrow('Invalid SQL value');
    });

    test('should reject values with spaces', () => {
      expect(() => sanitizeSqlValue('some value')).toThrow('Invalid SQL value');
    });

    test('should reject values with special characters', () => {
      expect(() => sanitizeSqlValue('value()')).toThrow('Invalid SQL value');
      expect(() => sanitizeSqlValue('value=1')).toThrow('Invalid SQL value');
      expect(() => sanitizeSqlValue('value\n')).toThrow('Invalid SQL value');
    });

    test('should reject empty string', () => {
      expect(() => sanitizeSqlValue('')).toThrow('Invalid SQL value');
    });
  });

  describe('buildStrategy2Query', () => {
    const baseOpts = {
      baseScenario: 'beslutad-policy',
      segments: ['housing', 'transport'],
      geoFilter: 'total',
      segFilter: 'total',
      start: '2025-01-01',
      end: '2030-01-01',
      resolution: '1Y',
      aggregation: 'sum',
      parameterValues: {},
      baseDir: '/data/base',
      parametersDir: '/data/parameters',
      strategy2Config: null
    };

    test('should generate valid SQL for basic query', () => {
      const sql = buildStrategy2Query(baseOpts);
      expect(sql).toContain('SELECT');
      expect(sql).toContain('FROM');
      expect(sql).toContain('GROUP BY');
      expect(sql).toContain('ORDER BY period');
      expect(sql).toContain("'total' AS geography");
      expect(sql).toContain("'total' AS segment");
      expect(sql).toContain('SUM(');
      expect(sql).toContain("'beslutad-policy' AS scenario_id");
    });

    test('should use DATE_TRUNC for yearly resolution', () => {
      const sql = buildStrategy2Query(baseOpts);
      expect(sql).toContain("DATE_TRUNC('year'");
    });

    test('should use correct aggregation function', () => {
      const sqlMax = buildStrategy2Query({ ...baseOpts, aggregation: 'max' });
      expect(sqlMax).toContain('MAX(');

      const sqlAvg = buildStrategy2Query({ ...baseOpts, aggregation: 'avg' });
      expect(sqlAvg).toContain('AVG(');
    });

    test('should handle geo filter for specific geography', () => {
      const sql = buildStrategy2Query({ ...baseOpts, geoFilter: 'SE-01' });
      expect(sql).toContain("'SE-01' AS geography");
      expect(sql).toContain("b.geography = 'SE-01'");
    });

    test('should handle geo filter "all"', () => {
      const sql = buildStrategy2Query({ ...baseOpts, geoFilter: 'all' });
      expect(sql).toContain('combined.geography AS geography');
      expect(sql).not.toContain("b.geography = ");
    });

    test('should handle segment filter for specific segment', () => {
      const sql = buildStrategy2Query({ ...baseOpts, segFilter: 'housing' });
      expect(sql).toContain("'housing' AS segment");
    });

    test('should handle segment filter "all"', () => {
      const sql = buildStrategy2Query({ ...baseOpts, segFilter: 'all' });
      expect(sql).toContain('combined.segment AS segment');
    });

    test('should use UNION ALL for multiple segments', () => {
      const sql = buildStrategy2Query({ ...baseOpts, segFilter: 'all' });
      expect(sql).toContain('UNION ALL');
    });

    test('should throw if no matching segments found', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      expect(() => buildStrategy2Query(baseOpts)).toThrow('No matching segments found');
    });

    test('should use hourly resolution without DATE_TRUNC', () => {
      const sql = buildStrategy2Query({ ...baseOpts, resolution: '1h' });
      expect(sql).toContain('combined.timestamp AS period');
      expect(sql).not.toContain('DATE_TRUNC');
    });

    test('should use monthly resolution', () => {
      const sql = buildStrategy2Query({ ...baseOpts, resolution: '1M' });
      expect(sql).toContain("DATE_TRUNC('month'");
    });
  });

  describe('buildParamAggregatedQuery', () => {
    const baseOpts = {
      baseScenario: 'beslutad-policy',
      segments: ['housing', 'transport'],
      geoFilter: 'total',
      segFilter: 'total',
      start: '2025-01-01',
      end: '2030-01-01',
      parameterValues: {},
      aggregatedDir: '/data/aggregated'
    };

    test('should generate valid SQL for basic query', () => {
      const sql = buildParamAggregatedQuery(baseOpts);
      expect(sql).toContain('SELECT');
      expect(sql).toContain('MAKE_TIMESTAMP');
      expect(sql).toContain("'total' AS geography");
      expect(sql).toContain("'total' AS segment");
      expect(sql).toContain('SUM(total_value)');
      expect(sql).toContain("scenario_id = 'beslutad-policy'");
      expect(sql).toContain('ORDER BY period');
    });

    test('should return null when aggregated file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const result = buildParamAggregatedQuery(baseOpts);
      expect(result).toBeNull();
    });

    test('should handle geo filter "all"', () => {
      const sql = buildParamAggregatedQuery({ ...baseOpts, geoFilter: 'all' });
      expect(sql).toContain('geography');
      expect(sql).not.toContain("'all' AS geography");
    });

    test('should handle specific geo filter', () => {
      const sql = buildParamAggregatedQuery({ ...baseOpts, geoFilter: 'SE-01' });
      expect(sql).toContain("'SE-01' AS geography");
      expect(sql).toContain("geography = 'SE-01'");
    });

    test('should handle segment filter "all"', () => {
      const sql = buildParamAggregatedQuery({ ...baseOpts, segFilter: 'all' });
      expect(sql).toContain('segment');
    });

    test('should return null when no segment conditions match', () => {
      const result = buildParamAggregatedQuery({
        ...baseOpts,
        segFilter: 'nonexistent'
      });
      expect(result).toBeNull();
    });

    test('should include growth and flex indices in conditions', () => {
      const sql = buildParamAggregatedQuery({
        ...baseOpts,
        segFilter: 'all',
        parameterValues: { housing_growth: 2, housing_flex: 1 }
      });
      expect(sql).toContain('growth_index = 2');
      expect(sql).toContain('flex_index = 1');
    });

    test('should use year boundaries from start/end dates', () => {
      const sql = buildParamAggregatedQuery(baseOpts);
      expect(sql).toContain('CAST(year AS INTEGER) >= 2025');
      expect(sql).toContain('CAST(year AS INTEGER) < 2030');
    });
  });
});
