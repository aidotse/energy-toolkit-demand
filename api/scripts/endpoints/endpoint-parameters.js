// api/scripts/endpoint-parameters.js

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import $RefParser from 'json-schema-ref-parser';

/**
 * Reads parameters.yaml and openapi.yaml to generate parameter values from actual data files.
 * Generates parameters.json with actual parameter values available in the API.
 * Each entry has:
 *   - name: the parameter key or nested key
 *   - required: boolean
 *   - values: enum array
 *   - endpoints: [path, …]
 *
 * @param {string} paramsPath - Path to parameters.yaml
 * @param {string} openapiPath - Path to openapi.yaml
 * @param {object} config - Config object from config.yaml (optional)
 */
export async function generateParameters(paramsPath, openapiPath, config = null) {
  console.log(`Generating parameters from parameters.yaml: ${paramsPath}`);

  let paramsDoc;

  try {
    // Read the parameters.yaml file
    if (fs.existsSync(paramsPath)) {
      const rawParams = fs.readFileSync(paramsPath, 'utf8');
      paramsDoc = yaml.load(rawParams);
      console.log(`Loaded parameters.yaml with ${Object.keys(paramsDoc.components?.parameters || {}).length} parameter definitions`);
    } else {
      throw new Error(`Parameters file not found: ${paramsPath}`);
    }

    // Use $RefParser to resolve all $ref dependencies in parameters.yaml
    const fullParams = await $RefParser.dereference(paramsDoc);
    
    // 2) Load and parse openapi.yaml
    const rawApi = fs.readFileSync(openapiPath, 'utf8');
    const apiDoc = yaml.load(rawApi);

  // 3) Map each parameter key to the paths that reference it
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

  // Helper function to load actual parameter values from data files
  const loadParameterValues = (paramName) => {
    const dataDir = path.resolve(path.dirname(openapiPath), 'data');

    try {
      switch (paramName) {
        case 'geography': {
          const geoFile = path.join(dataDir, 'parameters.json');
          if (fs.existsSync(geoFile)) {
            const data = JSON.parse(fs.readFileSync(geoFile, 'utf8'));
            return data.geographies || [];
          }
          break;
        }
        case 'segment': {
          const segFile = path.join(dataDir, 'parameters.json');
          if (fs.existsSync(segFile)) {
            const data = JSON.parse(fs.readFileSync(segFile, 'utf8'));
            return data.segments || [];
          }
          break;
        }
        case 'scenarioId': {
          const scenFile = path.join(dataDir, 'parameters.json');
          if (fs.existsSync(scenFile)) {
            const data = JSON.parse(fs.readFileSync(scenFile, 'utf8'));
            return data.scenario_ids || [];
          }
          break;
        }
        case 'format':
        case 'responseFormat': {
          const paramFile = path.join(dataDir, 'parameters.json');
          if (fs.existsSync(paramFile)) {
            const data = JSON.parse(fs.readFileSync(paramFile, 'utf8'));
            return data.formats || ['json', 'csv'];
          }
          break;
        }
        case 'geoFormat': {
          const paramFile = path.join(dataDir, 'parameters.json');
          if (fs.existsSync(paramFile)) {
            const data = JSON.parse(fs.readFileSync(paramFile, 'utf8'));
            return data.geo_formats || ['json', 'geojson'];
          }
          break;
        }
        default:
          return [];
      }
    } catch (err) {
      console.warn(`Could not load values for parameter ${paramName}: ${err.message}`);
      return [];
    }

    return [];
  };

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

    // If no enum in schema, try to load from data files
    const actualValues = loadParameterValues(baseName);
    if (actualValues.length > 0 && !schema.properties) {
      out.push({
        name: baseName,
        required: reqRoot,
        values: actualValues,
        endpoints
      });
      continue;
    }

    // recurse nested properties
    function traverse(props, requiredList = [], path = []) {
      for (const [key, sub] of Object.entries(props)) {
        const fullPath = [...path, key];
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
        } else {
          // Try to get values based on the property name for nested parameters
          const propertyPath = `${baseName}.${fullPath.join('.')}`;
          if (key === 'resolution') {
            const dataDir = path.resolve(path.dirname(openapiPath), 'data');
            const paramFile = path.join(dataDir, 'parameters.json');
            if (fs.existsSync(paramFile)) {
              const data = JSON.parse(fs.readFileSync(paramFile, 'utf8'));
              values = data.resolutions || ['1h', '1d', '1M', '1Y'];
            }
          } else if (key === 'aggregation') {
            const dataDir = path.resolve(path.dirname(openapiPath), 'data');
            const paramFile = path.join(dataDir, 'parameters.json');
            if (fs.existsSync(paramFile)) {
              const data = JSON.parse(fs.readFileSync(paramFile, 'utf8'));
              values = data.aggregations || ['sum', 'mean'];
            }
          }
        }

        const isLeaf = !sub.properties;
        // emit all leaves, even if values===[]
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

  // Add scenario parameters metadata from config.yaml
  const scenarioParameters = {};
  if (config && config.scenario && config.scenario.scenarios) {
    config.scenario.scenarios.forEach(param => {
      if (param.name && Array.isArray(param.items)) {
        scenarioParameters[param.name] = {
          type: param.type || 'index',
          description: param.description || '',
          options: param.items.map(item => ({
            value: item.value,
            label: item.label || String(item.value)
          }))
        };
      }
    });
  }

  // Build final output object with all metadata
  const result = {
    ...topLevelParams,
    parameters: out,
    scenarioParameters: Object.keys(scenarioParameters).length > 0 ? scenarioParameters : undefined
  };

  return result;
  } catch (err) {
    console.error(`Error in generateParameters: ${err.message}`);
    console.error(err.stack);
    throw err;
  }
}
