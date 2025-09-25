// api/scripts/endpoints/endpoint-scenarios.js

/**
 * Generates all possible combinations of scenario parameters from config.yaml
 *
 * @param {Object} config - The configuration object from config.yaml
 * @returns {Array} - Array of scenario objects with full parameter combinations
 */
export async function generateScenarios(config) {
  try {
    // Validate inputs
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
      const isDefault = useBaseAsDefault && isBaseScenario(combo);

      return {
        scenario_id: scenarioId,
        name: createScenarioName(combo),
        parameters: combo,
        is_default: isDefault,
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

    console.log(`Generated ${scenarioObjects.length} scenario combinations`);
    return scenarioObjects;
  } catch (error) {
    console.error('Error generating scenarios:', error);
    throw error;
  }
}

function cartesianProduct(arrays) {
  return arrays.reduce((acc, curr) =>
    acc.flatMap(a => curr.map(b => [...a, b])),
    [[]]
  );
}

/**
 * Recursively generates all combinations of parameter values
 *
 * @param {Object} params - The parameters object with arrays of possible values
 * @param {Array} paramNames - Array of parameter names
 * @param {number} index - Current index in the paramNames array
 * @param {Object} current - Current combination being built
 * @param {Array} result - Array to store all combinations
 * @returns {Array} - Array of all possible combinations
 */

// Generate all parameter combinations from the parameter map
function generateParameterCombinations(parameterMap) {
  const keys = Object.keys(parameterMap);
  const valueLists = keys.map(key => parameterMap[key]);

  return cartesianProduct(valueLists).map(values =>
    Object.fromEntries(keys.map((key, i) => [key, values[i]]))
  );
}

// Create a unique scenario ID from parameters
function createScenarioId(parameters) {
  return Object.entries(parameters)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
}

// Create a human-readable scenario name
function createScenarioName(parameters) {
  const parts = Object.entries(parameters)
    .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`);
  return `Scenario (${parts.join(', ')})`;
}

// Create scenario description based on parameters and config
function createScenarioDescription(parameters, scenarios) {
  const descriptions = Object.entries(parameters).map(([paramName, value]) => {
    const scenarioConfig = scenarios.find(s => s.name === paramName);
    const item = scenarioConfig?.items?.find(i => i.value === value);
    return `${paramName}: ${item?.label || value}`;
  });
  return descriptions.join(', ');
}

// Check if this is a base scenario (all parameters at minimum values)
function isBaseScenario(parameters) {
  return Object.values(parameters).every(value => value === 0);
}

// Create default parameters (all set to 0)
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
