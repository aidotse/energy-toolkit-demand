import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { generateParameters } from '../../scripts/endpoints/endpoint-parameters.js';
import { generateGeographies } from '../../scripts/endpoints/endpoint-geographies.js';
import { generateConfig } from '../../scripts/endpoints/endpoint-config.js';
import { generateScenarios } from '../../scripts/endpoints/endpoint-scenarios.js';
import { generateAggregations } from '../../scripts/endpoints/endpoint-aggregations.js';
import { buildStaticEndpoints } from '../../scripts/generate-endpoints.js';

describe('Endpoint Generation', () => {
  describe('generateParameters', () => {
    const mockOpenApiContent = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      parameters: []
components:
  parameters: {}
`;

    const mockParamsContent = `
components:
  parameters: {}
`;

    const mockParamsWithEntries = `
components:
  parameters:
    testParam:
      name: testParam
      in: query
      required: false
      schema:
        type: string
        enum: ['value1', 'value2']
`;

    test('should handle empty parameters document', async () => {
      const tempDir = '/tmp/endpoint-test';

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      fs.writeFileSync(path.join(tempDir, 'openapi.yaml'), mockOpenApiContent);
      fs.writeFileSync(path.join(tempDir, 'parameters.yaml'), mockParamsContent);

      const result = await generateParameters(
        path.join(tempDir, 'parameters.yaml'),
        path.join(tempDir, 'openapi.yaml')
      );

      expect(result).toHaveProperty('parameters');
      expect(Array.isArray(result.parameters)).toBe(true);
      expect(result.parameters).toHaveLength(0);

      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    test('should throw error for invalid parameters file', async () => {
      await expect(
        generateParameters('/nonexistent/parameters.yaml', '/nonexistent/openapi.yaml')
      ).rejects.toThrow();
    });

    test('should handle parameters file with entries', async () => {
      const tempDir = '/tmp/endpoint-test-params';

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const openApiWithParams = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      parameters:
        - $ref: '#/components/parameters/testParam'
components:
  parameters:
    testParam:
      name: testParam
      in: query
      required: false
      schema:
        type: string
        enum: ['value1', 'value2']
`;

      fs.writeFileSync(path.join(tempDir, 'openapi.yaml'), openApiWithParams);
      fs.writeFileSync(path.join(tempDir, 'parameters.yaml'), mockParamsWithEntries);

      const result = await generateParameters(
        path.join(tempDir, 'parameters.yaml'),
        path.join(tempDir, 'openapi.yaml')
      );

      expect(result).toHaveProperty('parameters');
      expect(Array.isArray(result.parameters)).toBe(true);

      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });

  describe('generateGeographies', () => {
    const mockConfig = {
      geography: {
        geographies: [
          { id: 'geo1', name: 'Geography 1', type: 'region' },
          { id: 'geo2', name: 'Geography 2', type: 'county' }
        ],
        file: 'test/geographies.geojson'
      }
    };

    test('should return JSON format geographies', async () => {
      const result = await generateGeographies(mockConfig, 'json');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id', 'geo1');
      expect(result[0]).toHaveProperty('name', 'Geography 1');
      expect(result[1]).toHaveProperty('id', 'geo2');
    });

    test('should return GeoJSON file path', async () => {
      const result = await generateGeographies(mockConfig, 'geojson');

      expect(typeof result).toBe('string');
      expect(result).toBe('test/geographies.geojson');
    });

    test('should throw error for invalid format', async () => {
      await expect(generateGeographies(mockConfig, 'invalid')).rejects.toThrow('Invalid format. Must be either "json" or "geojson"');
    });

    test('should throw error for missing config', async () => {
      await expect(generateGeographies(null, 'json')).rejects.toThrow('Invalid config: missing geography section');
    });

    test('should throw error for missing geography section', async () => {
      const invalidConfig = { name: 'test' };
      await expect(generateGeographies(invalidConfig, 'json')).rejects.toThrow('Invalid config: missing geography section');
    });

    test('should throw error for invalid geographies array in JSON format', async () => {
      const invalidConfig = {
        geography: {
          geographies: 'not-an-array'
        }
      };
      await expect(generateGeographies(invalidConfig, 'json')).rejects.toThrow('Invalid config: missing or invalid geography.geographies array');
    });

    test('should throw error for missing file path in GeoJSON format', async () => {
      const invalidConfig = {
        geography: {
          geographies: []
        }
      };
      await expect(generateGeographies(invalidConfig, 'geojson')).rejects.toThrow('Invalid config: missing geography.file path');
    });
  });

  describe('generateConfig', () => {
    const mockPublicConfig = {
      name: 'Test API',
      access: 'public',
      start: '2023-01-01',
      end: '2024-12-31',
      baseResolution: '1d',
      baseAggregation: 'sum',
      version: '1.0.0',
      geography: { test: true },
      useGenerator: true,
      useAPI: true,
      useExplorer: true
    };

    const mockPrivateConfig = {
      name: 'Private API',
      access: 'private',
      start: '2023-01-01',
      end: '2024-12-31',
      baseResolution: '1d',
      baseAggregation: 'sum'
    };

    test('should return public config without internal fields', async () => {
      const result = await generateConfig(mockPublicConfig);

      expect(result).toHaveProperty('name', 'Test API');
      expect(result).toHaveProperty('access', 'public');
      expect(result).toHaveProperty('version', '1.0.0');
      expect(result).toHaveProperty('geography');
      expect(result).not.toHaveProperty('useGenerator');
      expect(result).not.toHaveProperty('useAPI');
      expect(result).not.toHaveProperty('useExplorer');
    });

    test('should return private config with limited fields', async () => {
      const result = await generateConfig(mockPrivateConfig);

      expect(result).toHaveProperty('name', 'Private API');
      expect(result).toHaveProperty('access', 'private');
      expect(result).toHaveProperty('start', '2023-01-01');
      expect(result).toHaveProperty('end', '2024-12-31');
      expect(result).toHaveProperty('baseResolution', '1d');
      expect(result).toHaveProperty('baseAggregation', 'sum');

      // Should only have these 6 properties
      expect(Object.keys(result)).toHaveLength(6);
    });

    test('should throw error for null config', async () => {
      await expect(generateConfig(null)).rejects.toThrow('Invalid config: config object is null or undefined');
    });

    test('should throw error for missing access property', async () => {
      const invalidConfig = { name: 'Test' };
      await expect(generateConfig(invalidConfig)).rejects.toThrow('Invalid config: missing access property');
    });

    test('should throw error for invalid access level', async () => {
      const invalidConfig = { access: 'invalid' };
      await expect(generateConfig(invalidConfig)).rejects.toThrow('Invalid access level: invalid. Must be either "public" or "private"');
    });

    test('should throw error for private config missing required fields', async () => {
      const incompleteConfig = {
        access: 'private',
        name: 'Test'
        // Missing other required fields
      };
      await expect(generateConfig(incompleteConfig)).rejects.toThrow(/Invalid config: missing .* property required for private access/);
    });
  });

  describe('generateScenarios', () => {
    const mockConfig = {
      parameters: {
        baseScenarios: [
          { id: 'base-scenario', label: 'Base Scenario', default: true },
          { id: 'alt-scenario', label: 'Alternative Scenario', default: false }
        ]
      }
    };

    test('should generate scenario combinations', async () => {
      const result = await generateScenarios(mockConfig);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('scenario_id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('default', true);
    });

    test('should throw error for missing scenario config', async () => {
      const invalidConfig = { name: 'test' };
      await expect(generateScenarios(invalidConfig)).rejects.toThrow('Invalid config: missing parameters.baseScenarios list');
    });
  });

  describe('generateAggregations', () => {
    const mockConfig = {
      api: {
        resolutions: ['1d', '1M'],
        aggregations: ['sum', 'mean']
      }
    };

    test('should generate aggregation combinations', async () => {
      const result = await generateAggregations(mockConfig);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(4); // 2 resolutions * 2 aggregations
      expect(result[0]).toHaveProperty('resolution');
      expect(result[0]).toHaveProperty('aggregation');
    });

    test('should throw error for missing api config', async () => {
      const invalidConfig = { name: 'test' };
      await expect(generateAggregations(invalidConfig)).rejects.toThrow('Invalid config: missing api section');
    });
  });

  describe('buildStaticEndpoints integration', () => {
    let originalCwd;
    let tempDir;

    beforeEach(() => {
      originalCwd = process.cwd();
      tempDir = '/tmp/endpoint-integration-test';

      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      fs.mkdirSync(tempDir, { recursive: true });

      // Create minimal required files
      const configContent = `
name: "Test API"
version: "1.0.0"
access: "public"
start: "2023-01-01"
end: "2024-12-31"
baseResolution: "1d"
baseAggregation: "sum"
geography:
  geographies:
    - id: "test1"
      name: "Test Geography 1"
      type: "region"
  file: "test-geographies.geojson"
parameters:
  strategy: 2
  baseScenarios:
    - id: "test-scenario"
      label: "Test Scenario"
      default: true
api:
  resolutions: ["1d"]
  aggregations: ["sum"]
`;

      const openApiContent = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      parameters: []
components:
  parameters: {}
`;

      const paramsContent = `
components:
  parameters: {}
`;

      fs.writeFileSync(path.join(tempDir, 'config.yaml'), configContent);

      // Create api subdirectory
      const apiDir = path.join(tempDir, 'api');
      fs.mkdirSync(apiDir, { recursive: true });
      fs.writeFileSync(path.join(apiDir, 'openapi.yaml'), openApiContent);
      fs.writeFileSync(path.join(apiDir, 'parameters.yaml'), paramsContent);

      process.chdir(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('should create data directory if it does not exist', async () => {
      // getDataDir() resolves to {projectRoot}/data/ where projectRoot = tempDir
      const dataDir = path.join(tempDir, 'data');
      expect(fs.existsSync(dataDir)).toBe(false);

      const result = await buildStaticEndpoints();

      expect(result).toBe(true);
      expect(fs.existsSync(dataDir)).toBe(true);
    });

    test('should generate all required JSON files', async () => {
      const result = await buildStaticEndpoints();

      expect(result).toBe(true);

      const dataDir = path.join(tempDir, 'data');
      expect(fs.existsSync(path.join(dataDir, 'parameters.json'))).toBe(true);
      expect(fs.existsSync(path.join(dataDir, 'geographies.json'))).toBe(true);
      expect(fs.existsSync(path.join(dataDir, 'scenarios.json'))).toBe(true);
      expect(fs.existsSync(path.join(dataDir, 'aggregations.json'))).toBe(true);
      expect(fs.existsSync(path.join(dataDir, 'config.json'))).toBe(true);
    });

    test('should generate valid JSON content', async () => {
      const result = await buildStaticEndpoints();

      expect(result).toBe(true);

      const dataDir = path.join(tempDir, 'data');

      // Test parameters.json (now an object with a parameters array)
      const params = JSON.parse(fs.readFileSync(path.join(dataDir, 'parameters.json'), 'utf8'));
      expect(typeof params).toBe('object');
      expect(params).toHaveProperty('parameters');

      // Test geographies.json
      const geographies = JSON.parse(fs.readFileSync(path.join(dataDir, 'geographies.json'), 'utf8'));
      expect(Array.isArray(geographies)).toBe(true);
      expect(geographies).toHaveLength(1);
      expect(geographies[0]).toHaveProperty('id', 'test1');

      // Test config.json
      const config = JSON.parse(fs.readFileSync(path.join(dataDir, 'config.json'), 'utf8'));
      expect(config).toHaveProperty('name', 'Test API');
      expect(config).toHaveProperty('access', 'public');
    });

    test('should handle errors gracefully and return false', async () => {
      // Create a separate temporary directory without config.yaml
      const errorTestDir = '/tmp/error-test-dir';
      if (fs.existsSync(errorTestDir)) {
        fs.rmSync(errorTestDir, { recursive: true, force: true });
      }
      fs.mkdirSync(errorTestDir, { recursive: true });

      // Write a config.yaml so findProjectRoot succeeds, but omit required files
      fs.writeFileSync(path.join(errorTestDir, 'config.yaml'), 'name: broken\naccess: public\n');

      const savedCwd = process.cwd();
      process.chdir(errorTestDir);

      try {
        const result = await buildStaticEndpoints();
        expect(result).toBe(false);
      } finally {
        process.chdir(savedCwd);
        if (fs.existsSync(errorTestDir)) {
          fs.rmSync(errorTestDir, { recursive: true, force: true });
        }
      }
    });
  });
});