import {
  format as fmt,
  parseISO, isValid,
  startOfYear,  endOfYear,
  startOfMonth, endOfMonth,
  startOfWeek,  endOfWeek,
  startOfDay,   endOfDay,
  startOfHour,  endOfHour,
  startOfMinute,endOfMinute,
  startOfSecond,endOfSecond
} from 'date-fns';

/**
 * Normalize a period boundary into a JavaScript Date.
 * Supports granularities:
 *   - YYYY
 *   - YYYY-MM
 *   - YYYY-Www (ISO week number)
 *   - YYYY-MM-DD
 *   - YYYY-MM-DDTHH
 *   - YYYY-MM-DDTHH:mm
 *   - YYYY-MM-DDTHH:mm:ss
 * @param {string} raw - raw boundary value
 * @param {'start'|'end'} which - inclusive start vs exclusive end
 * @returns {Date}
 */
function normalizeBoundary(raw, which) {
  // Year only: 2025
  if (/^\d{4}$/.test(raw)) {
    const year = Number(raw);
    const dt0 = new Date(year, 0, 1);
    return which === 'start'
      ? startOfYear(dt0)
      : endOfYear(dt0);
  }
  // Month only: 2025-02
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split('-').map(Number);
    const dt0 = new Date(y, m - 1, 1);
    return which === 'start'
      ? startOfMonth(dt0)
      : endOfMonth(dt0);
  }
  // ISO week: 2025-W05
  if (/^\d{4}-W\d{2}$/.test(raw)) {
    const [y, w] = raw.split('-W').map(Number);
    // get first week of Jan, then offset
    const dt = startOfWeek(addWeeks(new Date(y, 0, 4), w - 1), { weekStartsOn: 1 });
    return which === 'start'
      ? dt
      : endOfWeek(dt, { weekStartsOn: 1 });
  }
  // Date only: 2025-02-10
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const dt = parseISO(raw);
    if (!isValid(dt)) throw new Error(`Invalid date boundary: ${raw}`);
    return which === 'start'
      ? startOfDay(dt)
      : endOfDay(dt);
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
 * Parse a period object with `start` and `end` strings into ISO strings for SQL.
 * @param {{ start: string, end?: string }} period
 * @returns {{ start: string, end: string }}
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
 * Format a JS Date to a string matching the desired resolution.
 * @param {Date|string} periodDate - the Date object or ISO string
 * @param {'1h'|'1d'|'1M'|'1Y'} resolution
 * @returns {string}
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