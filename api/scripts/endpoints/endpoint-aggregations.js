// api/scripts/endpoints/endpoint-aggregations.js

/**
 * Generates aggregation data from the config
 *
 * @param {Object} config - The configuration object from config.yaml
 * @returns {Array} - Array of aggregation objects
 */
export async function generateAggregations(config) {
  try {
    // Validate that config has the required api properties
    if (!config || !config.api) {
      throw new Error('Invalid config: missing api section');
    }
    
    if (!config.api.aggregations || !Array.isArray(config.api.aggregations)) {
      throw new Error('Invalid config: missing or invalid api.aggregations array');
    }
    
    if (!config.api.resolutions || !Array.isArray(config.api.resolutions)) {
      throw new Error('Invalid config: missing or invalid api.resolutions array');
    }
    
    // Generate all combinations of resolutions and aggregations
    const combinations = [];
    
    for (const resolution of config.api.resolutions) {
      for (const aggregation of config.api.aggregations) {
        combinations.push({
          resolution,
          aggregation
        });
      }
    }
    
    console.log(`Generated ${combinations.length} resolution-aggregation combinations`);
    return combinations;
  } catch (error) {
    console.error('Error generating aggregations:', error);
    throw error;
  }
}
