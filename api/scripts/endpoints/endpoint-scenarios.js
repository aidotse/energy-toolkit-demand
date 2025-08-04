// api/scripts/endpoints/endpoint-scenarios.js

/**
 * Generates all possible combinations of scenario parameters
 *
 * @param {Object} config - The configuration object from config.yaml
 * @param {Object} scenarioParameters - The scenario parameters from parameters-scenario.yaml
 * @returns {Array} - Array of all possible scenario combinations
 */
export async function generateScenarios(config, scenarioParameters) {
  try {
    // Validate inputs
    if (!config || !config.scenario || !config.scenario.scenarios) {
      throw new Error('Invalid config: missing scenario.scenarios section');
    }
    
    if (!scenarioParameters || Object.keys(scenarioParameters).length === 0) {
      throw new Error('Invalid scenario parameters: object is empty or has no parameters');
    }
    
    // Generate all possible combinations of scenario parameters
    const paramNames = Object.keys(scenarioParameters);
    const combinations = generateCombinations(scenarioParameters, paramNames);
    
    console.log(`Generated ${combinations.length} scenario combinations`);
    return combinations;
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
