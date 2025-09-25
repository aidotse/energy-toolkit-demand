// api/scripts/endpoint-geographies.js

/**
 * Generates geography data based on the specified format
 *
 * @param {Object} config - The configuration object (similar to config.yaml)
 * @param {string} format - The output format ('json' or 'geojson')
 * @returns {Object|string} - JSON data of geographies or path to geojson file
 */
export async function generateGeographies(config, format = 'json') {
  try {
    // Validate the format parameter
    if (format !== 'json' && format !== 'geojson') {
      throw new Error('Invalid format. Must be either "json" or "geojson"');
    }
    
    // Validate that config has the required geography properties
    if (!config || !config.geography) {
      throw new Error('Invalid config: missing geography section');
    }
    
    // Return data based on the requested format
    if (format === 'json') {
      // For JSON format, return the geographies array
      if (!config.geography.geographies || !Array.isArray(config.geography.geographies)) {
        throw new Error('Invalid config: missing or invalid geography.geographies array');
      }
      return config.geography.geographies;
    } else {
      // For GeoJSON format, return the path to the geojson file
      if (!config.geography.file) {
        throw new Error('Invalid config: missing geography.file path');
      }
      return config.geography.file;
    }
  } catch (error) {
    console.error('Error generating geographies:', error);
    throw error;
  }
}