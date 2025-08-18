// api/scripts/generate-endpoints.js

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { findProjectRoot, getApiDir, getDataDir, resolveFromRoot, resolveFromApi } from '../../paths.js';
import { generateParameters, generateGeographies, generateScenarios, generateAggregations, generateConfig } from './endpoints.js';

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
    console.log('Generating parameters.json...');
    // Use resolveFromApi to get absolute paths to API files
    const paramsPath = resolveFromApi('parameters.yaml');
    const openapiPath = resolveFromApi('openapi.yaml');
    
    console.log(`Using parameters file: ${paramsPath}`);
    console.log(`Using OpenAPI file: ${openapiPath}`);
    
    const params = await generateParameters(paramsPath, openapiPath);
    
    const paramsOutputPath = path.join(dataDir, 'parameters.json');
    console.log(`Writing parameters to: ${paramsOutputPath}`);
    
    fs.writeFileSync(
      paramsOutputPath,
      JSON.stringify(params, null, 2) + '\n'
    );

    console.log('Generating geographies.json...');
    // Config file is in the root directory
    const configPath = resolveFromRoot('config.yaml');
    console.log(`Using config file: ${configPath}`);
    
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(configContent);
    
    // Generate JSON format geographies
    const geos = await generateGeographies(config, 'json');
    const geosOutputPath = path.join(dataDir, 'geographies.json');
    console.log(`Writing geographies to: ${geosOutputPath}`);
    
    fs.writeFileSync(
      geosOutputPath,
      JSON.stringify(geos, null, 2) + '\n'
    );
    
    // Also save the geojson path for reference
    const geojsonPath = await generateGeographies(config, 'geojson');
    console.log(`GeoJSON file path: ${geojsonPath}`);
    
    console.log('Generating scenarios.json...');
    // Load the parameters-scenario.yaml file
    const scenariosParamsPath = resolveFromApi('parameters-scenario.yaml');
    console.log(`Using scenarios parameters file: ${scenariosParamsPath}`);
    
    const scenariosParamsContent = fs.readFileSync(scenariosParamsPath, 'utf8');
    const scenariosParams = yaml.load(scenariosParamsContent);
    
    // Generate scenarios with both config and scenario parameters
    const scen = await generateScenarios(config, scenariosParams);
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
