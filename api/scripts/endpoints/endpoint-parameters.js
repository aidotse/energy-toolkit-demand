// api/scripts/endpoints/endpoint-parameters.js

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import $RefParser from 'json-schema-ref-parser';
import { getDataDir } from '../../../paths.js';

/**
 * Reads parameters.yaml and config.yaml to generate parameter values.
 * For Strategy 2, includes independent parameter definitions.
 *
 * @param {string} paramsPath - Path to parameters.yaml
 * @param {string} openapiPath - Path to openapi.yaml
 * @param {object} config - Config object from config.yaml
 */
export async function generateParameters(paramsPath, openapiPath, config = null) {
  console.log(`Generating parameters from parameters.yaml: ${paramsPath}`);

  const dataDir = getDataDir();

  try {
    // Read the parameters.yaml file
    let paramsDoc;
    if (fs.existsSync(paramsPath)) {
      const rawParams = fs.readFileSync(paramsPath, 'utf8');
      paramsDoc = yaml.load(rawParams);
      console.log(`Loaded parameters.yaml with ${Object.keys(paramsDoc.components?.parameters || {}).length} parameter definitions`);
    } else {
      throw new Error(`Parameters file not found: ${paramsPath}`);
    }

    // Use $RefParser to resolve all $ref dependencies
    const fullParams = await $RefParser.dereference(paramsDoc);

    // Load and parse openapi.yaml
    const rawApi = fs.readFileSync(openapiPath, 'utf8');
    const apiDoc = yaml.load(rawApi);

    // Map each parameter key to the paths that reference it
    const paramUsage = {};
    for (const [route, methods] of Object.entries(apiDoc.paths || {})) {
      for (const op of Object.values(methods || {})) {
        (op.parameters || []).forEach(p => {
          const ref = p.$ref || `#/components/parameters/${p.name}`;
          const key = ref.split('/').pop();
          paramUsage[key] = paramUsage[key] || new Set();
          paramUsage[key].add(route);
        });
      }
    }

    const out = [];
    const paramsObj = fullParams.components?.parameters || {};

    const getEnum = arr => arr.map(v => v);

    for (const [paramKey, paramDef] of Object.entries(paramsObj)) {
      const { name: baseName, required: reqRoot = false, schema = {} } = paramDef;
      const endpoints = Array.from(paramUsage[paramKey] || []);

      // top-level scalar enum?
      if (Array.isArray(schema.enum)) {
        out.push({
          name: baseName,
          required: reqRoot,
          values: getEnum(schema.enum),
          endpoints
        });
        continue;
      }

      // recurse nested properties
      function traverse(props, requiredList = [], pathArr = []) {
        for (const [key, sub] of Object.entries(props)) {
          const fullPath = [...pathArr, key];
          const propName = `${baseName}.${fullPath.join('.')}`;
          const isReq = reqRoot && requiredList.includes(key);

          // collect any enum values
          let values = [];
          if (Array.isArray(sub.enum)) {
            values = getEnum(sub.enum);
          } else if (Array.isArray(sub.oneOf)) {
            sub.oneOf.forEach(branch => {
              if (Array.isArray(branch.enum)) {
                values.push(...getEnum(branch.enum));
              }
            });
          }

          const isLeaf = !sub.properties;
          if (isLeaf) {
            out.push({
              name: propName,
              required: isReq,
              values,
              endpoints
            });
          }

          // dive deeper
          if (sub.properties) {
            traverse(
              sub.properties,
              Array.isArray(sub.required) ? sub.required : [],
              fullPath
            );
          }
        }
      }

      if (schema.properties) {
        traverse(schema.properties, Array.isArray(schema.required) ? schema.required : [], []);
      }
    }

    // Extract top-level parameter arrays from config
    const topLevelParams = {};

    if (config) {
      // Years array from config start/end dates
      if (config.start && config.end) {
        const startYear = new Date(config.start).getFullYear();
        const endYear = new Date(config.end).getFullYear();
        const years = [];
        for (let year = startYear; year <= endYear; year++) {
          years.push(year);
        }
        topLevelParams.years = years;
      }

      // Geographies from config
      if (config.geography && config.geography.geographies) {
        topLevelParams.geographies = config.geography.geographies.map(g => g.id);
      }

      // Segments from config
      if (config.segment && config.segment.values) {
        topLevelParams.segments = config.segment.values.map(s => s.name);
      }

      // Resolutions from config
      if (config.api && config.api.resolutions) {
        topLevelParams.resolutions = config.api.resolutions;
      }

      // Aggregations from config
      if (config.api && config.api.aggregations) {
        topLevelParams.aggregations = config.api.aggregations;
      }

      // Formats
      topLevelParams.formats = ['json', 'csv'];
      topLevelParams.geo_formats = ['json', 'geojson'];
    }

    // Check for Strategy 2 independent parameters
    let strategy2Config = null;
    if (config?.parameters?.strategy === 2 && config?.parameters?.definitions) {
      strategy2Config = buildStrategy2Config(config, dataDir);
    }

    // Build final output object
    const result = {
      ...topLevelParams,
      parameters: out,
      ...(strategy2Config && { strategy2: strategy2Config })
    };

    return result;
  } catch (err) {
    console.error(`Error in generateParameters: ${err.message}`);
    console.error(err.stack);
    throw err;
  }
}

/**
 * Build Strategy 2 configuration from config.yaml
 */
function buildStrategy2Config(config, dataDir) {
  const definitions = config.parameters.definitions;

  // Read base scenarios directly from config
  const baseScenarios = (config.parameters.baseScenarios || []).map(s => ({
    id: s.id,
    name: s.label,
    default: !!s.default
  }));

  // Sort so default is first
  baseScenarios.sort((a, b) => {
    if (a.default) return -1;
    if (b.default) return 1;
    return a.name.localeCompare(b.name);
  });

  // Build parameter definitions for the API
  const parameters = {};
  for (const [paramName, paramDef] of Object.entries(definitions)) {
    const segment = Array.isArray(paramDef.segments) ? paramDef.segments[0] : paramDef.segments;

    // Find baseline index (first value without a curve, typically index 0)
    const baselineIndex = paramDef.values.find(v => v.curve === null)?.index ?? 0;

    parameters[paramName] = {
      segment: segment,
      description: paramDef.description || '',
      operation: paramDef.how || 'multiply',
      baselineIndex: baselineIndex,
      values: paramDef.values.map(v => ({
        index: v.index,
        label: v.label,
        value: v.value ?? v.index,  // Use explicit value if provided, else use index
        hasData: v.curve !== null && v.index !== 0
      }))
    };
  }

  // Group parameters by segment for easier UI rendering
  const bySegment = {};
  for (const [paramName, paramDef] of Object.entries(parameters)) {
    const segment = paramDef.segment;
    if (!bySegment[segment]) {
      bySegment[segment] = [];
    }
    bySegment[segment].push({
      name: paramName,
      ...paramDef
    });
  }

  console.log(`Built Strategy 2 config: ${baseScenarios.length} base scenarios, ${Object.keys(parameters).length} parameters`);

  return {
    strategy: 2,
    baseScenarios,
    parameters,
    bySegment,
    defaults: buildParameterDefaults(definitions)
  };
}

/**
 * Build default parameter values (all index 0)
 */
function buildParameterDefaults(definitions) {
  const defaults = {};
  for (const paramName of Object.keys(definitions)) {
    defaults[paramName] = 0;
  }
  return defaults;
}
