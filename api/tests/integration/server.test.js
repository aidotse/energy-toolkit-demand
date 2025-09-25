import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { OpenAPIBackend } from 'openapi-backend';
import fs from 'fs';
import path from 'path';

// Create a test instance of the server
let app;
let api;

beforeAll(async () => {
  // Set up test app similar to local-server.js
  app = express();
  api = new OpenAPIBackend({ definition: './openapi.yaml' });

  // Make sure data files exist before running tests
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    throw new Error('Data directory not found. Run npm run build:static-endpoints first.');
  }

  await api.init();

  app.use(cors());
  app.use(express.json());

  // Register static endpoints like in local-server.js
  api.register('getGeographies', (c, req, res) => {
    const fmt = (c.request.query.format === 'geojson' ? 'geojson' : 'json');
    const filename = `geographies.${fmt}`;
    const filepath = path.join(process.cwd(), 'data', filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (fmt === 'geojson') res.type('application/geo+json');
    else res.type('application/json');

    res.send(fs.readFileSync(filepath));
  });

  // Register other static endpoints
  const staticOps = ['getConfig', 'getParameters', 'getScenarios', 'getAggregations'];
  staticOps.forEach((op) => {
    api.register(op, (c, req, res) => {
      const base = op.replace(/^get/, '').toLowerCase();
      const filepath = path.join(process.cwd(), 'data', `${base}.json`);
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.type('application/json').send(fs.readFileSync(filepath));
    });
  });

  // Basic error handlers
  api.register('notFound', (c, req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  api.register('unauthorizedHandler', (c, req, res) => {
    res.status(401).json({ error: 'Unauthorized' });
  });

  api.register('validationFail', (c, req, res, err) => {
    res.status(400).json({ error: 'Validation failed', details: err.validation.errors });
  });

  // Route everything through OpenAPI Backend
  app.use((req, res) => {
    api.handleRequest(
      {
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.body,
        headers: req.headers,
      },
      req,
      res
    );
  });
});

afterAll(() => {
  // Cleanup if needed
});

describe('API Server Integration Tests', () => {
  describe('GET /geographies', () => {
    test('should return JSON format by default', async () => {
      const response = await request(app)
        .get('/geographies')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toBeInstanceOf(Array);

      // Check structure of geography objects
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('name');
        expect(response.body[0]).toHaveProperty('type');
      }
    });

    test('should return GeoJSON format when requested', async () => {
      const response = await request(app)
        .get('/geographies?format=geojson')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/geo+json');
      // GeoJSON should have type and features properties
      expect(response.body).toHaveProperty('type');
    });

    test('should handle 404 for missing files gracefully', async () => {
      // Temporarily rename the file to test 404
      const jsonPath = path.join(process.cwd(), 'data', 'geographies.json');
      const backupPath = `${jsonPath}.bak`;

      if (fs.existsSync(jsonPath)) {
        fs.renameSync(jsonPath, backupPath);
      }

      const response = await request(app)
        .get('/geographies')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');

      // Restore file
      if (fs.existsSync(backupPath)) {
        fs.renameSync(backupPath, jsonPath);
      }
    });
  });

  describe('GET /config', () => {
    test('should return configuration data', async () => {
      const response = await request(app)
        .get('/config')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('access');
    });
  });

  describe('GET /scenarios', () => {
    test('should return scenarios array', async () => {
      const response = await request(app)
        .get('/scenarios')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toBeInstanceOf(Array);

      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('scenario_id');
        expect(response.body[0]).toHaveProperty('name');
        expect(response.body[0]).toHaveProperty('parameters');
      }
    });
  });

  describe('GET /aggregations', () => {
    test('should return aggregations array', async () => {
      const response = await request(app)
        .get('/aggregations')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toBeInstanceOf(Array);

      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('resolution');
        expect(response.body[0]).toHaveProperty('aggregation');
      }
    });
  });

  describe('GET /parameters', () => {
    test('should return parameters array', async () => {
      const response = await request(app)
        .get('/parameters')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('Error handling', () => {
    test('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
    });

    test('should handle CORS headers', async () => {
      const response = await request(app)
        .get('/config')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });
});