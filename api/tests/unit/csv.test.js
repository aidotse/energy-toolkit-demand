/**
 * Tests for the RFC 4180 CSV serializer.
 *
 * The previous inline `rows.map(r => [...].join(','))` approach corrupted
 * any value containing a comma, newline, or double quote. These tests lock
 * the new behavior: quote/escape fields that need it, leave simple ones alone.
 */

import { describe, test, expect } from 'vitest';
import { toCsv } from '../../csv.js';

describe('toCsv', () => {
  test('returns just the header when no rows', () => {
    expect(toCsv([], ['a', 'b', 'c'])).toBe('a,b,c');
  });

  test('serializes simple values without quoting', () => {
    const out = toCsv(
      [
        { a: 1, b: 2, c: 3 },
        { a: 4, b: 5, c: 6 },
      ],
      ['a', 'b', 'c']
    );
    expect(out).toBe('a,b,c\n1,2,3\n4,5,6');
  });

  test('quotes fields containing commas', () => {
    const out = toCsv([{ name: 'Stockholm, Sweden', code: 'SE-AB' }], ['name', 'code']);
    expect(out).toBe('name,code\n"Stockholm, Sweden",SE-AB');
  });

  test('quotes fields containing newlines', () => {
    const out = toCsv([{ text: 'line1\nline2' }], ['text']);
    expect(out).toBe('text\n"line1\nline2"');
  });

  test('quotes fields containing carriage returns', () => {
    const out = toCsv([{ text: 'a\rb' }], ['text']);
    expect(out).toBe('text\n"a\rb"');
  });

  test('escapes embedded double quotes as two double quotes', () => {
    const out = toCsv([{ text: 'He said "hi"' }], ['text']);
    expect(out).toBe('text\n"He said ""hi"""');
  });

  test('handles all three escape cases in one field', () => {
    const out = toCsv([{ text: 'quote " comma , newline\n' }], ['text']);
    expect(out).toBe('text\n"quote "" comma , newline\n"');
  });

  test('renders null and undefined as empty strings', () => {
    const out = toCsv([{ a: null, b: undefined, c: 0 }], ['a', 'b', 'c']);
    expect(out).toBe('a,b,c\n,,0');
  });

  test('respects column order independent of row key order', () => {
    const out = toCsv([{ z: 1, a: 2, m: 3 }], ['a', 'm', 'z']);
    expect(out).toBe('a,m,z\n2,3,1');
  });

  test('round-trips adversarial input through a naive parser', () => {
    // A very permissive CSV parser that respects double quotes. This is
    // enough to prove that our escaping produces a parseable output.
    function parseCsv(input) {
      const rows = [];
      let row = [];
      let field = '';
      let inQuote = false;
      for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (inQuote) {
          if (ch === '"') {
            if (input[i + 1] === '"') {
              field += '"';
              i++;
            } else {
              inQuote = false;
            }
          } else {
            field += ch;
          }
        } else {
          if (ch === '"' && field === '') {
            inQuote = true;
          } else if (ch === ',') {
            row.push(field);
            field = '';
          } else if (ch === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
          } else {
            field += ch;
          }
        }
      }
      if (field !== '' || row.length > 0) {
        row.push(field);
        rows.push(row);
      }
      return rows;
    }

    const rows = [
      { period: '2030-01-01', label: 'Stockholm, Sweden', note: 'He said "hi"\nnext line' },
      { period: '2031-01-01', label: 'Västra Götaland', note: 'ok' },
    ];
    const csv = toCsv(rows, ['period', 'label', 'note']);
    const parsed = parseCsv(csv);
    expect(parsed[0]).toEqual(['period', 'label', 'note']);
    expect(parsed[1]).toEqual([
      '2030-01-01',
      'Stockholm, Sweden',
      'He said "hi"\nnext line',
    ]);
    expect(parsed[2]).toEqual(['2031-01-01', 'Västra Götaland', 'ok']);
  });
});
