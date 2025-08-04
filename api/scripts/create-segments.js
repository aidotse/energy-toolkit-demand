// api/scripts/create-segments.js

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getApiDir } from '../../paths.js';

/**
 * Writes a parameters-segment.yaml file with OpenAPI-compatible enums
 * @param {object} config - Parsed config.yaml
 */
export async function createSegmentsFile(config) {
  try {
    const apiDir = getApiDir();
    const outputPath = path.join(apiDir, 'parameters-segment.yaml');

    const segmentsOutput = {};

    if (config.segments?.level1?.values) {
      const level1Values = config.segments.level1.values.map(v => typeof v === 'string' ? v : v.name);
      segmentsOutput.level1 = {
        type: 'string',
        enum: level1Values
      };
    }

    if (config.segments?.level2?.values) {
      const level2Values = config.segments.level2.values;

      if (Array.isArray(level2Values)) {
        const values = level2Values.map(v => typeof v === 'string' ? v : v.name);
        segmentsOutput.level2 = {
          type: 'string',
          enum: values
        };
      } else {
        const perSegmentSchemas = {};
        for (const [segName, subvalues] of Object.entries(level2Values)) {
          perSegmentSchemas[segName] = {
            type: 'string',
            enum: subvalues.map(v => typeof v === 'string' ? v : v.name)
          };
        }
        segmentsOutput.level2 = perSegmentSchemas;
      }
    }

    const outputContent = yaml.dump(segmentsOutput, { lineWidth: -1 });
    fs.writeFileSync(outputPath, outputContent, 'utf8');
    console.log(`✅ parameters-segment.yaml written to ${outputPath}`);
  } catch (error) {
    console.error('❌ Error creating segments file:', error);
    throw error;
  }
}

// CLI usage (fallback to config.yaml if run directly)
if (import.meta.url === `file://${process.argv[1]}`) {
  import('../../paths.js').then(({ resolveFromRoot }) => {
    const configPath = resolveFromRoot('config.yaml');
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(configContent);
    createSegmentsFile(config);
  }).catch(err => {
    console.error('❌ Failed to load config or paths:', err);
    process.exit(1);
  });
}
