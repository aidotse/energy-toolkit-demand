// api/scripts/generate-endpoints.js

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { findProjectRoot, getApiDir, getDataDir, resolveFromRoot, resolveFromApi } from '../../paths.js';
import { generateParameters, generateGeographies, generateScenarios, generateAggregations, generateConfig } from './endpoints.js';

/**
 * Builds all static endpoint data files from configuration sources
 * @returns {Promise<void>}
 */
export async function buildStaticEndpoints() {
  // Use our path utilities to ensure consistent paths
  const projectRoot = findProjectRoot();
  const apiDir = getApiDir();
  const dataDir = getDataDir();
  
  console.log(`Building static endpoints`);
  console.log(`Project root: ${projectRoot}`);
  console.log(`API directory: ${apiDir}`);
  console.log(`Data directory: ${dataDir}`);
  
  if (!fs.existsSync(dataDir)) {
    console.log(`Creating data directory: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
  }

  try {
    // Load config first as it's needed by multiple generators
    console.log('Loading config.yaml...');
    const configPath = resolveFromRoot('config.yaml');
    console.log(`Using config file: ${configPath}`);

    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(configContent);

    console.log('Generating parameters.json...');
    // Use resolveFromApi to get absolute path to OpenAPI and parameters files
    const openapiPath = resolveFromApi('openapi.yaml');
    const paramsPath = resolveFromApi('parameters.yaml');

    console.log(`Using OpenAPI file: ${openapiPath}`);
    console.log(`Using parameters file: ${paramsPath}`);

    const params = await generateParameters(paramsPath, openapiPath, config);

    const paramsOutputPath = path.join(dataDir, 'parameters.json');
    console.log(`Writing parameters to: ${paramsOutputPath}`);

    fs.writeFileSync(
      paramsOutputPath,
      JSON.stringify(params, null, 2) + '\n'
    );

    console.log('Generating geographies.json...');
    
    // Generate JSON format geographies
    const geos = await generateGeographies(config, 'json');
    const geosOutputPath = path.join(dataDir, 'geographies.json');
    console.log(`Writing geographies to: ${geosOutputPath}`);
    
    fs.writeFileSync(
      geosOutputPath,
      JSON.stringify(geos, null, 2) + '\n'
    );
    
    // Copy GeoJSON file to data directory
    const geojsonSourcePath = await generateGeographies(config, 'geojson');
    console.log(`GeoJSON source file: ${geojsonSourcePath}`);

    // Make sure we have an absolute path
    const absoluteSourcePath = path.isAbsolute(geojsonSourcePath)
      ? geojsonSourcePath
      : path.resolve(projectRoot, geojsonSourcePath);

    const geojsonOutputPath = path.join(dataDir, 'geographies.geojson');
    console.log(`Copying GeoJSON from: ${absoluteSourcePath}`);
    console.log(`Copying GeoJSON to: ${geojsonOutputPath}`);

    if (fs.existsSync(absoluteSourcePath)) {
      fs.copyFileSync(absoluteSourcePath, geojsonOutputPath);
      console.log(`✅ GeoJSON file copied successfully`);
    } else {
      console.warn(`Warning: GeoJSON source file not found: ${absoluteSourcePath}`);
    }
    
    console.log('Generating scenarios.json...');
    // Generate scenarios directly from config.yaml
    const scen = await generateScenarios(config);
    const scenOutputPath = path.join(dataDir, 'scenarios.json');
    console.log(`Writing scenarios to: ${scenOutputPath}`);
    
    fs.writeFileSync(
      scenOutputPath,
      JSON.stringify(scen, null, 2) + '\n'
    );

    console.log('Generating aggregations.json...');
    // Generate aggregations using the config object
    const aggs = await generateAggregations(config);
    const aggsOutputPath = path.join(dataDir, 'aggregations.json');
    console.log(`Writing aggregations to: ${aggsOutputPath}`);
    
    fs.writeFileSync(
      aggsOutputPath,
      JSON.stringify(aggs, null, 2) + '\n'
    );

    console.log('Generating config.json...');
    // Generate config using the config object
    const cfg = await generateConfig(config);
    const cfgOutputPath = path.join(dataDir, 'config.json');
    console.log(`Writing config to: ${cfgOutputPath}`);
    
    fs.writeFileSync(
      cfgOutputPath,
      JSON.stringify(cfg, null, 2) + '\n'
    );
    console.log('✅ All static endpoints generated successfully.');
    return true;
  } catch (err) {
    console.error('❌ Error generating static endpoints:');
    console.error(err.message);
    console.error(err.stack);
    return false;
  }
}

// Run directly if this script is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running generate-endpoints.js directly');
  
  buildStaticEndpoints().catch(err => {
    console.error('Fatal error in buildStaticEndpoints:');
    console.error(err);
    process.exit(1);
  });
}
