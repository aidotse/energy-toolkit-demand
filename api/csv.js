/**
 * @fileoverview RFC 4180-compatible CSV serialization.
 *
 * The previous inline `rows.map(r => […].join(','))` approach corrupted any
 * value containing a comma, newline, or double quote. This helper quotes
 * those fields and escapes embedded double quotes as `""`.
 *
 * @module csv
 */

/**
 * Escape a single CSV field. Wraps the value in double quotes and escapes
 * embedded double quotes if the value contains any of `, " \n \r`.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeCsvField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Serialize rows to a CSV string.
 *
 * @param {Array<Record<string, unknown>>} rows - Records to serialize
 * @param {string[]} columns - Ordered column names (used as the header row)
 * @returns {string} CSV output including the header row, joined with `\n`
 */
export function toCsv(rows, columns) {
  const header = columns.map(escapeCsvField).join(',');
  if (!rows.length) return header;
  const lines = rows.map((row) =>
    columns.map((col) => escapeCsvField(row[col])).join(',')
  );
  return [header, ...lines].join('\n');
}
