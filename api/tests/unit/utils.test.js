import { describe, test, expect } from 'vitest';
import { parsePeriod, formatPeriod } from '../../utils.js';

describe('utils.js', () => {
  describe('parsePeriod', () => {
    test('should parse year format YYYY', () => {
      const result = parsePeriod({ start: '2025' });
      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('end');
      expect(typeof result.start).toBe('string');
      expect(typeof result.end).toBe('string');
      expect(result.start).toMatch(/^2025-01-01/);
    });

    test('should parse month format YYYY-MM', () => {
      const result = parsePeriod({ start: '2025-03' });
      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('end');
      expect(result.start).toMatch(/^2025-03-01/);
    });

    test('should parse day format YYYY-MM-DD', () => {
      const result = parsePeriod({ start: '2025-03-15' });
      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('end');
      expect(result.start).toMatch(/^2025-03-15/);
    });

    test('should parse ISO datetime format', () => {
      const result = parsePeriod({ start: '2025-03-15T10:30:00Z' });
      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('end');
      expect(result.start).toMatch(/^2025-03-15T10:30:00/);
    });

    test('should handle week format YYYY-Www', () => {
      const result = parsePeriod({ start: '2025-W10' });
      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('end');
      expect(typeof result.start).toBe('string');
    });

    test('should throw error for invalid format', () => {
      expect(() => parsePeriod({ start: 'invalid-date' })).toThrow();
    });

    test('should throw error for null input', () => {
      expect(() => parsePeriod(null)).toThrow();
    });
  });

  describe('formatPeriod', () => {
    const testDate = new Date('2025-03-15T10:30:00Z');

    test('should format to year with 1Y resolution', () => {
      const result = formatPeriod(testDate, '1Y');
      expect(result).toBe('2025');
    });

    test('should format to month with 1M resolution', () => {
      const result = formatPeriod(testDate, '1M');
      expect(result).toBe('2025-03');
    });

    test('should format to week with 1w resolution', () => {
      const result = formatPeriod(testDate, '1w');
      // This will return the ISO string since 1w is not implemented
      expect(result).toBe('2025-03-15T10:30:00.000Z');
    });

    test('should format to day with 1d resolution', () => {
      const result = formatPeriod(testDate, '1d');
      expect(result).toBe('2025-03-15');
    });

    test('should format to hour with 1h resolution', () => {
      const result = formatPeriod(testDate, '1h');
      expect(result).toBe('2025-03-15T10:30:00Z');
    });

    test('should handle default resolution', () => {
      const result = formatPeriod(testDate);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('should throw error for invalid date', () => {
      expect(() => formatPeriod(new Date('invalid'), '1Y')).toThrow();
    });
  });
});