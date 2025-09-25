/**
 * @fileoverview Configuration endpoint generator for the Demand Toolkit API.
 *
 * This module generates configuration data for the API's /config endpoint based on
 * access levels. It filters configuration data to ensure sensitive information
 * is only exposed to appropriate access levels.
 *
 * @module endpoints/config
 * @version 0.0.1
 * @author Demand Toolkit Team
 */

/**
 * Generates configuration data based on access level and privacy requirements.
 *
 * This function takes the full configuration object from config.yaml and returns
 * a filtered version appropriate for the specified access level. Public configurations
 * expose most settings while private configurations only expose essential metadata.
 *
 * **Access Levels:**
 * - `public`: Returns full configuration excluding internal-only fields (useGenerator, useAPI, useExplorer)
 * - `private`: Returns only essential metadata fields for limited public access
 *
 * @param {Object} config - The complete configuration object from config.yaml
 * @param {string} config.name - Name of the demand forecasting configuration
 * @param {string} config.access - Access level ('public' or 'private')
 * @param {string} config.start - Start date/time for the forecasting period
 * @param {string} config.end - End date/time for the forecasting period
 * @param {string} config.baseResolution - Base temporal resolution (1h, 1d, 1M, 1Y)
 * @param {string} config.baseAggregation - Base aggregation method (sum, mean, etc.)
 * @param {string} [config.version] - Configuration version (public only)
 * @param {Object} [config.geography] - Geography definitions (public only)
 * @param {boolean} [config.useGenerator] - Internal flag (filtered out)
 * @param {boolean} [config.useAPI] - Internal flag (filtered out)
 * @param {boolean} [config.useExplorer] - Internal flag (filtered out)
 *
 * @returns {Object} Filtered configuration object appropriate for the access level
 *
 * @throws {Error} When config is null/undefined
 * @throws {Error} When access property is missing
 * @throws {Error} When access level is invalid (not 'public' or 'private')
 * @throws {Error} When required fields are missing for private access
 *
 * @example
 * // Generate public configuration
 * const publicConfig = await generateConfig({
 *   name: 'Sweden Energy Demand 2025-2044',
 *   access: 'public',
 *   version: '1.0.0',
 *   start: '2025-01-01',
 *   end: '2044-12-31',
 *   baseResolution: '1h',
 *   baseAggregation: 'sum',
 *   geography: { /* geography config * / },
 *   useGenerator: true // This will be filtered out
 * });
 * // Returns full config without useGenerator, useAPI, useExplorer
 *
 * @example
 * // Generate private configuration
 * const privateConfig = await generateConfig({
 *   name: 'Confidential Forecast',
 *   access: 'private',
 *   start: '2025-01-01',
 *   end: '2044-12-31',
 *   baseResolution: '1d',
 *   baseAggregation: 'mean'
 * });
 * // Returns only: name, access, start, end, baseResolution, baseAggregation
 *
 * @since 0.0.1
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