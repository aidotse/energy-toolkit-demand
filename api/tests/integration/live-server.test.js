/**
 * Integration tests that exercise the real Express app from local-server.js
 * via supertest. Unlike server.test.js (which re-implements the app in the
 * test), this file catches regressions in the actual middleware stack:
 * request-id logging, CORS, rate limiting, error sanitization, and the
 * /_health endpoint.
 *
 * Tests are ordered so the rate-limit test (which bursts N requests) runs
 * last, and each suite resets state where possible.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import request from 'supertest';

let app;

beforeAll(async () => {
  // Import the actual server module. Because we don't set argv to match
  // import.meta.url, the module won't call app.listen() — we get the exported
  // Express app instance directly and drive it with supertest.
  const mod = await import('../../local-server.js');
  app = mod.app;
}, 60_000); // DuckDB init + parameters.json load can take > 10s in parallel test runs

describe('live server — request-id middleware', () => {
  test('every response carries an X-Request-Id header', async () => {
    const res = await request(app).get('/config');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('request-id is unique per request', async () => {
    const [a, b] = await Promise.all([
      request(app).get('/config'),
      request(app).get('/config'),
    ]);
    expect(a.headers['x-request-id']).not.toBe(b.headers['x-request-id']);
  });
});

describe('live server — /_health', () => {
  test('returns cache stats and uptime', async () => {
    const res = await request(app).get('/_health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      uptime_s: expect.any(Number),
      cache: {
        hits: expect.any(Number),
        misses: expect.any(Number),
        size: expect.any(Number),
        maxSize: expect.any(Number),
      },
    });
  });
});

describe('live server — error sanitization', () => {
  test('404 responses use the sanitized {error, requestId} envelope', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('requestId');
    expect(res.body.requestId).toMatch(/^[0-9a-f-]{36}$/);
    // And critically: no file paths, SQL, or stack traces.
    expect(JSON.stringify(res.body)).not.toMatch(/\/home\/|\.parquet|SELECT |FROM /i);
  });

  test('400 validation errors include structured details but no internal leakage', async () => {
    // /demand requires period[start] and period[end] — missing them trips
    // OpenAPI validation, which is handled by our sanitized validationFail.
    const res = await request(app).get('/demand');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('requestId');
    expect(res.body).toHaveProperty('details');
    expect(Array.isArray(res.body.details)).toBe(true);
    // Details come from AJV/OpenAPI Backend — they describe schema paths, not
    // filesystem paths or SQL.
    expect(JSON.stringify(res.body.details)).not.toMatch(/\/home\/|\.parquet/);
  });
});

describe('live server — rate limiting', () => {
  test('bursting past the /demand rate limit returns 429', async () => {
    // The default is 300 req/min. Blow through it with malformed requests
    // (which are cheap to serve — they 400 without hitting DuckDB).
    const bursts = 305;
    const results = [];
    for (let i = 0; i < bursts; i++) {
      const res = await request(app).get('/demand');
      results.push(res.status);
      // Short-circuit once we see a 429 to keep the test fast.
      if (res.status === 429) break;
    }
    expect(results).toContain(429);
    // The 429 body should still be sanitized.
    const lastResponse = await request(app).get('/demand');
    if (lastResponse.status === 429) {
      expect(lastResponse.body).toHaveProperty('error');
      expect(lastResponse.body).toHaveProperty('requestId');
    }
  }, 30_000);
});
