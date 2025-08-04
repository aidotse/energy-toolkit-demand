// api/scripts/create-geographies.js

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getApiDir } from '../../paths.js';

/**
 * Writes a parameters-geography.yaml OpenAPI enum schema from config
 * @param {object} config - Parsed config.yaml
 */
export async function createGeographiesFile(config) {
  try {
    const apiDir = getApiDir();
    const outputPath = path.join(apiDir, 'parameters-geography.yaml');

    const geographyIds = config.geography.geographies.map(geo => geo.id);

    const outputContent = yaml.dump({
      geographies: {
        type: 'string',
        enum: geographyIds
      }
    }, { lineWidth: -1 });

    fs.writeFileSync(outputPath, outputContent, 'utf8');
    console.log(`✅ parameters-geography.yaml written to ${outputPath}`);
  } catch (error) {
    console.error('❌ Error creating geographies file:', error);
    throw error;
  }
}

// CLI usage (fallback to config.yaml if run directly)
if (import.meta.url === `file://${process.argv[1]}`) {
  import('../../paths.js').then(({ resolveFromRoot }) => {
    const configPath = resolveFromRoot('config.yaml');
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(configContent);
    createGeographiesFile(config);
  }).catch(err => {
    console.error('❌ Failed to load config or paths:', err);
    process.exit(1);
  });
}
