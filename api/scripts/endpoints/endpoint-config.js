// api/scripts/endpoints/endpoint-config.js

/**
 * Generates configuration data based on access level
 *
 * @param {Object} config - The configuration object from config.yaml
 * @returns {Object} - Configuration object with appropriate fields based on access level
 */
export async function generateConfig(config) {
  try {
    // Validate that config has the required properties
    if (!config) {
      throw new Error('Invalid config: config object is null or undefined');
    }
    
    if (!config.access) {
      throw new Error('Invalid config: missing access property');
    }
    
    // Check access level and return appropriate configuration
    if (config.access === 'public') {
      // For public access, return the entire config except for useGenerator, useAPI, useExplorer
      const { useGenerator, useAPI, useExplorer, ...publicConfig } = config;
      return publicConfig;
    } else if (config.access === 'private') {
      // For private access, return only specific fields
      const privateConfig = {
        name: config.name,
        access: config.access,
        start: config.start,
        end: config.end,
        baseResolution: config.baseResolution,
        baseAggregation: config.baseAggregation
      };
      
      // Validate that all required fields exist
      for (const field of Object.keys(privateConfig)) {
        if (privateConfig[field] === undefined) {
          throw new Error(`Invalid config: missing ${field} property required for private access`);
        }
      }
      
      return privateConfig;
    } else {
      throw new Error(`Invalid access level: ${config.access}. Must be either "public" or "private"`);
    }
  } catch (error) {
    console.error('Error generating config:', error);
    throw error;
  }
}