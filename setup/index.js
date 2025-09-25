#!/usr/bin/env node
import { askProjectComponents, askProjectConfig, askTimeSpan, askGeoJSONConfig, askSegmentation, askScenarios, askDataStructure, askApiParameters } from './prompts.js';
import { loadGeoJSON } from './load-geojson.js';
import { mergeAndSave } from './write-config.js';
import { generateAPISupport } from './generate-api.js';

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

    // API support
    if (comps.useAPI) {
      const apiParams = await askApiParameters();
      cfg = { ...cfg, api: { ...apiParams } };
      await generateAPISupport(cfg);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();
