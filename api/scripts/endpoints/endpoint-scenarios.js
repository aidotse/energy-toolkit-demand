// api/scripts/endpoints/endpoint-scenarios.js

import fs from 'fs';
import path from 'path';
import { getDataDir } from '../../../paths.js';

/**
 * Helper to convert scenario name to URL-safe slug
 */
function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generates scenarios list for Strategy 2 (base scenarios only)
 * Reads from scenario-mapping.json created by copy-generator-output.js
 *
 * @param {Object} config - The configuration object from config.yaml
 * @returns {Array} - Array of base scenario objects
 */
export async function generateScenarios(config) {
  try {
    const dataDir = getDataDir();
    const mappingPath = path.join(dataDir, 'scenario-mapping.json');

    // Check if we have the new Strategy 2 structure
    if (fs.existsSync(mappingPath)) {
      // Strategy 2: Read base scenarios from mapping file
      const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

      // Get default base scenario from config
      const defaultBaseScenario = config?.parameters?.baseScenario || 'Beslutad Policy';
      const defaultSlug = slugify(defaultBaseScenario);

      const scenarios = Object.entries(mapping).map(([slug, name]) => ({
        id: slug,
        scenario_id: slug,  // For backward compatibility
        name: name,
        default: slug === defaultSlug,
        description: `Base scenario: ${name}`
      }));

      // Sort so default is first
      scenarios.sort((a, b) => {
        if (a.default) return -1;
        if (b.default) return 1;
        return a.name.localeCompare(b.name);
      });

      console.log(`Generated ${scenarios.length} base scenarios (Strategy 2)`);
      return scenarios;
    }

    // Fallback: Legacy scenario generation (for backward compatibility)
    console.log('No scenario-mapping.json found, using legacy scenario generation');
    return generateLegacyScenarios(config);
  } catch (error) {
    console.error('Error generating scenarios:', error);
    throw error;
  }
}

/**
 * Legacy scenario generation (kept for backward compatibility)
 */
function generateLegacyScenarios(config) {
  if (!config || !config.scenario || !config.scenario.scenarios) {
    throw new Error('Invalid config: missing scenario.scenarios section');
  }

  const scenarios = config.scenario.scenarios;
  const useBaseAsDefault = config.scenario.useBaseAsDefaultScenario;

  // Build parameter combinations from config.yaml scenarios
  const parameterMap = {};
  scenarios.forEach(scenario => {
    if (scenario.items && Array.isArray(scenario.items)) {
      parameterMap[scenario.name] = scenario.items.map(item => item.value);
    }
  });

  // Generate all combinations
  const combinations = generateParameterCombinations(parameterMap);

  // Create scenario objects with metadata
  const scenarioObjects = combinations.map((combo, index) => {
    const scenarioId = createScenarioId(combo);
    return {
      scenario_id: scenarioId,
      name: createScenarioName(combo),
      parameters: combo,
      is_default: false,
      description: createScenarioDescription(combo, scenarios)
    };
  });

  // Add default scenario if useBaseAsDefaultScenario is true
  if (useBaseAsDefault) {
    const defaultScenario = {
      scenario_id: "default",
      name: "Default Scenario",
      parameters: createDefaultParameters(scenarios),
      is_default: true,
      description: "Base scenario with default parameter values"
    };
    scenarioObjects.unshift(defaultScenario);
  }

  console.log(`Generated ${scenarioObjects.length} scenario combinations (legacy)`);
  return scenarioObjects;
}

function cartesianProduct(arrays) {
  return arrays.reduce((acc, curr) =>
    acc.flatMap(a => curr.map(b => [...a, b])),
    [[]]
  );
}

function generateParameterCombinations(parameterMap) {
  const keys = Object.keys(parameterMap);
  const valueLists = keys.map(key => parameterMap[key]);

  return cartesianProduct(valueLists).map(values =>
    Object.fromEntries(keys.map((key, i) => [key, values[i]]))
  );
}

function createScenarioId(parameters) {
  return Object.entries(parameters)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
}

function createScenarioName(parameters) {
  const parts = Object.entries(parameters)
    .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`);
  return `Scenario (${parts.join(', ')})`;
}

function createScenarioDescription(parameters, scenarios) {
  const descriptions = Object.entries(parameters).map(([paramName, value]) => {
    const scenarioConfig = scenarios.find(s => s.name === paramName);
    const item = scenarioConfig?.items?.find(i => i.value === value);
    return `${paramName}: ${item?.label || value}`;
  });
  return descriptions.join(', ');
}

function createDefaultParameters(scenarios) {
  const defaultParams = {};
  scenarios.forEach(scenario => {
    defaultParams[scenario.name] = 0;
  });
  return defaultParams;
}

// Legacy function kept for compatibility
export function generateCombinations(scenarios) {
  const keys = Object.keys(scenarios);

  const valueLists = keys.map(key => {
    const schema = scenarios[key];
    if (!schema || !Array.isArray(schema.enum)) {
      throw new Error(`Scenario "${key}" must be an object with an "enum" array`);
    }
    return schema.enum;
  });

  return cartesianProduct(valueLists).map(values =>
    Object.fromEntries(keys.map((key, i) => [key, values[i]]))
  );
}
