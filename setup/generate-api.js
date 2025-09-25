// generate-api.js

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { buildStaticEndpoints } from '../api/scripts/generate-endpoints.js';
import { createGeographiesFile } from '../api/scripts/create-geographies.js';
import { createSegmentsFile } from '../api/scripts/create-segments.js';

export async function generateAPISupport(cfg) {
  // Write config.yaml for reference (optional)
  fs.writeFileSync('config.yaml', yaml.dump(cfg, { sortKeys: false, lineWidth: -1 }), 'utf8');

  // Generate supporting parameter files
  await createGeographiesFile(cfg);
  await createSegmentsFile(cfg);

  // Generate parameters.yaml from template
  const template = fs.readFileSync(path.resolve('api/scripts/parameters-template.yaml'), 'utf8');

  const params = template
    .replace('{{RESOLUTIONS}}', JSON.stringify(cfg.api.resolutions))
    .replace('{{AGGREGATIONS}}', JSON.stringify(cfg.api.aggregations))

  fs.writeFileSync(path.resolve('api/parameters.yaml'), params, 'utf8');

  // Generate parameters.json from openapi + parameters.yaml
  console.log('Generating parameters.json...');
  try {
    await buildStaticEndpoints(path.resolve('api'));
    console.log('✅ parameters.json generated successfully.');
  } catch (error) {
    console.error('❌ Error generating parameters.json:', error);
  }
}
