/**
 * @fileoverview Utilities for date parsing and period handling in the Demand Toolkit API.
 *
 * This module provides comprehensive date parsing and formatting utilities that support
 * various temporal granularities from years down to seconds. It's designed to work with
 * the OpenAPI specification and handle period boundaries for demand forecasting data.
 *
 * @module utils
 * @version 0.0.1
 * @author Demand Toolkit Team
 */

import {
  format as fmt,
  parseISO, isValid, addWeeks,
  startOfYear,  endOfYear,
  startOfMonth, endOfMonth,
  startOfWeek,  endOfWeek,
  startOfDay,   endOfDay,
  startOfHour,  endOfHour,
  startOfMinute,endOfMinute,
  startOfSecond,endOfSecond
} from 'date-fns';

/**
 * Normalize a period boundary into a JavaScript Date object.
 *
 * This function supports multiple temporal granularities and handles both inclusive
 * start boundaries and exclusive end boundaries. It's used throughout the API to
 * normalize various date formats into consistent Date objects for processing.
 *
 * **Supported formats:**
 * - `YYYY` - Year only (e.g., "2025")
 * - `YYYY-MM` - Year and month (e.g., "2025-03")
 * - `YYYY-Www` - ISO week number (e.g., "2025-W10")
 * - `YYYY-MM-DD` - Full date (e.g., "2025-03-15")
 * - `YYYY-MM-DDTHH` - Date with hour (e.g., "2025-03-15T10")
 * - `YYYY-MM-DDTHH:mm` - Date with hour and minute (e.g., "2025-03-15T10:30")
 * - `YYYY-MM-DDTHH:mm:ss` - Full timestamp (e.g., "2025-03-15T10:30:45")
 * - Full ISO 8601 strings with timezone information
 *
 * @param {string} raw - The raw boundary value to normalize
 * @param {'start'|'end'} which - Whether to normalize to inclusive start or exclusive end
 * @returns {Date} The normalized Date object
 *
 * @throws {Error} When the input format is invalid or cannot be parsed
 *
 * @example
 * // Year boundary
 * const startOf2025 = normalizeBoundary('2025', 'start');
 * const endOf2025 = normalizeBoundary('2025', 'end');
 *
 * @example
 * // Month boundary
 * const startOfMarch = normalizeBoundary('2025-03', 'start');
 * // Returns: 2025-03-01T00:00:00.000Z
 *
 * @example
 * // Week boundary (ISO week)
 * const startOfWeek10 = normalizeBoundary('2025-W10', 'start');
 *
 * @since 0.0.1
 */
export function normalizeBoundary(raw, which) {
  // Year only: 2025
  // For 'end' boundaries, return start of year (half-open interval convention)
  if (/^\d{4}$/.test(raw)) {
    const year = Number(raw);
    const dt0 = new Date(year, 0, 1);
    return startOfYear(dt0);
  }
  // Month only: 2025-02
  // For 'end' boundaries, return start of month (half-open interval convention)
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split('-').map(Number);
    const dt0 = new Date(y, m - 1, 1);
    return startOfMonth(dt0);
  }
  // ISO week: 2025-W05
  // For 'end' boundaries, return start of week (half-open interval convention)
  if (/^\d{4}-W\d{2}$/.test(raw)) {
    const [y, w] = raw.split('-W').map(Number);
    // get first week of Jan, then offset
    const dt = startOfWeek(addWeeks(new Date(y, 0, 4), w - 1), { weekStartsOn: 1 });
    return dt;
  }
  // Date only: 2025-02-10
  // For 'end' boundaries, return start of day (half-open interval convention)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const dt = parseISO(raw);
    if (!isValid(dt)) throw new Error(`Invalid date boundary: ${raw}`);
    return startOfDay(dt);
  }
  // Hour precision: 2025-02-10T03
  if (/^\d{4}-\d{2}-\d{2}T\d{2}$/.test(raw)) {
    const dt = parseISO(`${raw}:00:00`);
    return which === 'start'
      ? startOfHour(dt)
      : endOfHour(dt);
  }
  // Minute precision: 2025-02-10T03:15
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
    const dt = parseISO(`${raw}:00`);
    return which === 'start'
      ? startOfMinute(dt)
      : endOfMinute(dt);
  }
  // Second precision or full ISO: 2025-02-10T03:15:30
  const dt = parseISO(raw);
  if (!isValid(dt)) throw new Error(`Invalid date-time boundary: ${raw}`);
  return which === 'start'
    ? startOfSecond(dt)
    : endOfSecond(dt);
}

/**
 * Parse a period object with start and end boundaries into ISO strings suitable for SQL queries.
 *
 * This function takes a period object containing start and optionally end boundaries,
 * normalizes them using `normalizeBoundary()`, and returns ISO 8601 formatted strings
 * that are compatible with DuckDB and other SQL databases.
 *
 * If no end boundary is provided, the function automatically infers the end boundary
 * based on the granularity of the start boundary (e.g., if start is "2025", end becomes
 * the end of year 2025).
 *
 * @param {Object} period - The period object to parse
 * @param {string} period.start - The start boundary in any supported format
 * @param {string} [period.end] - The optional end boundary. If omitted, inferred from start
 * @returns {{start: string, end: string}} Object with start and end ISO strings (without trailing 'Z' for DuckDB)
 *
 * @throws {Error} When start boundary is invalid or cannot be parsed
 *
 * @example
 * // Parse a full year
 * const yearPeriod = parsePeriod({ start: '2025' });
 * // Returns: { start: '2025-01-01T00:00:00.000', end: '2025-12-31T23:59:59.999' }
 *
 * @example
 * // Parse specific date range
 * const datePeriod = parsePeriod({
 *   start: '2025-03-01',
 *   end: '2025-03-31'
 * });
 *
 * @example
 * // Parse with inferred end (month)
 * const monthPeriod = parsePeriod({ start: '2025-03' });
 * // End is inferred as end of March 2025
 *
 * @see {@link normalizeBoundary} for supported date formats
 * @since 0.0.1
 */
export function parsePeriod(period) {
  const startDt = normalizeBoundary(period.start, 'start');

  // if caller omitted end, default to one resolution-step after start
  const rawEnd = period.end != null
    ? period.end
    : (() => {
        // infer from the format of period.start
        // e.g. '2025' → one year later, '2025-02' → one month later, etc.
        // just reuse normalizeBoundary with 'end' flag on the same raw string
        return period.start;
      })();

  const endDt = normalizeBoundary(rawEnd, 'end');
  return {
    // strip trailing Z for DuckDB
    start: startDt.toISOString().replace(/Z$/, ''),
    end:   endDt  .toISOString().replace(/Z$/, '')
  };
}

/**
 * Format a JavaScript Date to a string matching the desired temporal resolution.
 *
 * This function takes a Date object (or ISO string) and formats it according to
 * the specified resolution. This is used throughout the API to ensure consistent
 * date formatting across different temporal granularities used in demand forecasting.
 *
 * **Supported resolutions:**
 * - `1Y` - Year only (YYYY format)
 * - `1M` - Year and month (YYYY-MM format)
 * - `1d` - Full date (YYYY-MM-DD format)
 * - `1h` - Date and time with timezone (YYYY-MM-DDTHH:mm:ssZ format)
 * - Default - Full ISO 8601 string
 *
 * @param {Date|string} dt - The Date object or ISO string to format
 * @param {'1Y'|'1M'|'1d'|'1h'} [resolution] - The desired temporal resolution
 * @returns {string} The formatted date string according to the specified resolution
 *
 * @throws {Error} When the date is invalid
 *
 * @example
 * const date = new Date('2025-03-15T10:30:00Z');
 *
 * formatPeriod(date, '1Y');  // '2025'
 * formatPeriod(date, '1M');  // '2025-03'
 * formatPeriod(date, '1d');  // '2025-03-15'
 * formatPeriod(date, '1h');  // '2025-03-15T10:30:00Z'
 * formatPeriod(date);        // '2025-03-15T10:30:00.000Z'
 *
 * @example
 * // Works with ISO strings too
 * formatPeriod('2025-03-15T10:30:00Z', '1M'); // '2025-03'
 *
 * @since 0.0.1
 */
export function formatPeriod(dt, resolution) {
  const d = dt instanceof Date ? dt : new Date(dt);
  switch (resolution) {
    case '1Y': return fmt(d, 'yyyy');
    case '1M': return fmt(d, 'yyyy-MM');
    case '1d': return fmt(d, 'yyyy-MM-dd');
    case '1h': return fmt(d, "yyyy-MM-dd'T'HH:mm:ss'Z'");
    default:   return d.toISOString();
  }
}