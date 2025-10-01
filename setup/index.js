#!/usr/bin/env node
import { askProjectComponents, askProjectConfig, askTimeSpan, askGeoJSONConfig, askSegmentation, askScenarios, askDataStructure } from './prompts.js';
import { loadGeoJSON } from './load-geojson.js';
import { mergeAndSave } from './write-config.js';

(async function main() {
  try {
    const base  = await askProjectConfig();
    const comps = await askProjectComponents();
    const time  = await askTimeSpan();
    const geoCfg = await askGeoJSONConfig();
    const seg   = await askSegmentation();
    const scen  = await askScenarios();

    let cfg = {
      ...comps,
      ...base,
      ...time,
      ...seg,
      ...scen
    };

    // geography
    cfg.geography = await loadGeoJSON(
      geoCfg.filePath,
      geoCfg.idField,
      geoCfg.nameField,
      geoCfg.typeField
    );

    // write merged config
    mergeAndSave('config.yaml', cfg);

    // Generator support
    if (comps.useGenerator) {
      const dataStructure = await askDataStructure();
      cfg = { ...cfg, generator: { ...dataStructure } };
    }

    // API support - note API generation moved to separate script
    if (comps.useAPI) {
      console.log('\n📌 API Configuration');
      console.log('API generation has been moved to a separate script.');
      console.log('After data generation, run: cd api && npm run generate-api');
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();
