// api/scripts/create-scenarios.js

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getApiDir } from '../../paths.js';

/**
 * Converts raw scenario items into an OpenAPI schema object
 * @param {Array} items - List of { value, label } pairs
 * @returns {Object} - OpenAPI-compatible schema object
 */
function inferSchemaFromItems(items) {
  const values = items.map(item => item.value);
  const type = typeof values[0] === 'boolean' ? 'boolean' :
               typeof values[0] === 'number' ? 'number' : 'string';

  return {
    type,
    enum: values
  };
}

/**
 * Builds parameters-scenario.yaml from a provided config object
 * @param {object} config - Parsed config.yaml
 */
export async function createScenariosFile(config) {
  try {
    const apiDir = getApiDir();
    const outputPath = path.join(apiDir, 'parameters-scenario.yaml');

    const scenariosOutput = {};

    config.scenario.scenarios.forEach(scenario => {
      const { name, items } = scenario;
      scenariosOutput[name] = inferSchemaFromItems(items);
    });

    const outputContent = yaml.dump(scenariosOutput, { lineWidth: -1 });
    fs.writeFileSync(outputPath, outputContent, 'utf8');
    console.log(`✅ parameters-scenario.yaml written to ${outputPath}`);
  } catch (error) {
    console.error('❌ Error creating parameters-scenario.yaml:', error);
    throw error;
  }
}

// If run directly, read config.yaml and run the generator
if (import.meta.url === `file://${process.argv[1]}`) {
  import('../../paths.js').then(({ resolveFromRoot }) => {
    const configPath = resolveFromRoot('config.yaml');
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(configContent);
    createScenariosFile(config);
  }).catch(err => {
    console.error('❌ Failed to load config or paths:', err);
    process.exit(1);
  });
}
