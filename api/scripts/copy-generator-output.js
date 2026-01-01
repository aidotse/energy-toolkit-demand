// api/scripts/copy-generator-output.js
// Copies generator output to api/data/ with proper structure for Strategy 2

import fs from 'fs';
import path from 'path';
import { findProjectRoot, getDataDir } from '../../paths.js';

/**
 * Convert scenario name to URL-safe slug
 * "Beslutad Policy" -> "beslutad-policy"
 */
function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')     // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '');        // Trim leading/trailing hyphens
}

/**
 * Recursively copy a directory
 */
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Remove directory recursively
 */
function removeDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Copy generator output to API data directory
 */
export async function copyGeneratorOutput(options = {}) {
  const { clean = true, verbose = true } = options;

  const projectRoot = findProjectRoot();
  const generatorOutput = path.join(projectRoot, 'generator', 'output');
  const dataDir = getDataDir();

  const log = verbose ? console.log : () => {};

  log('='.repeat(60));
  log('Copying generator output to API data directory');
  log('='.repeat(60));
  log(`Source: ${generatorOutput}`);
  log(`Destination: ${dataDir}`);
  log('');

  // Verify source exists
  if (!fs.existsSync(generatorOutput)) {
    throw new Error(`Generator output directory not found: ${generatorOutput}`);
  }

  // Clean existing parquet directories if requested
  if (clean) {
    log('Cleaning existing data directories...');
    removeDir(path.join(dataDir, 'base'));
    removeDir(path.join(dataDir, 'parameters'));
    removeDir(path.join(dataDir, 'aggregated'));
    removeDir(path.join(dataDir, 'scenarios')); // Remove legacy scenarios
    log('');
  }

  const stats = {
    baseScenarios: 0,
    baseFiles: 0,
    parameters: 0,
    parameterFiles: 0,
    aggregatedFiles: 0
  };

  // 1. Copy base scenarios with slugified names
  log('--- Base Scenarios ---');
  const baseSourceDir = path.join(generatorOutput, 'base');
  const baseDestDir = path.join(dataDir, 'base');

  if (fs.existsSync(baseSourceDir)) {
    const scenarios = fs.readdirSync(baseSourceDir, { withFileTypes: true })
      .filter(d => d.isDirectory());

    for (const scenario of scenarios) {
      const slug = slugify(scenario.name);
      const srcPath = path.join(baseSourceDir, scenario.name);
      const destPath = path.join(baseDestDir, slug);

      log(`  ${scenario.name} -> ${slug}`);

      // Copy each segment directory
      const segments = fs.readdirSync(srcPath, { withFileTypes: true })
        .filter(d => d.isDirectory());

      for (const segment of segments) {
        const segmentSrc = path.join(srcPath, segment.name);
        const segmentDest = path.join(destPath, segment.name);
        copyDir(segmentSrc, segmentDest);

        // Count parquet files
        const files = fs.readdirSync(segmentSrc).filter(f => f.endsWith('.parquet'));
        stats.baseFiles += files.length;
      }

      stats.baseScenarios++;
    }
  }
  log(`  Total: ${stats.baseScenarios} scenarios, ${stats.baseFiles} files`);
  log('');

  // 2. Copy parameters directory (as-is)
  log('--- Parameters ---');
  const paramsSourceDir = path.join(generatorOutput, 'parameters');
  const paramsDestDir = path.join(dataDir, 'parameters');

  if (fs.existsSync(paramsSourceDir)) {
    const params = fs.readdirSync(paramsSourceDir, { withFileTypes: true })
      .filter(d => d.isDirectory());

    for (const param of params) {
      const srcPath = path.join(paramsSourceDir, param.name);
      const destPath = path.join(paramsDestDir, param.name);

      copyDir(srcPath, destPath);

      // Count files recursively
      const countFiles = (dir) => {
        let count = 0;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            count += countFiles(path.join(dir, entry.name));
          } else if (entry.name.endsWith('.parquet')) {
            count++;
          }
        }
        return count;
      };

      const fileCount = countFiles(srcPath);
      log(`  ${param.name}: ${fileCount} files`);
      stats.parameterFiles += fileCount;
      stats.parameters++;
    }
  }
  log(`  Total: ${stats.parameters} parameters, ${stats.parameterFiles} files`);
  log('');

  // 3. Copy aggregated data
  log('--- Aggregated Data ---');
  const aggSourceDir = path.join(generatorOutput, 'aggregated');
  const aggDestDir = path.join(dataDir, 'aggregated');

  if (fs.existsSync(aggSourceDir)) {
    copyDir(aggSourceDir, aggDestDir);

    const files = fs.readdirSync(aggSourceDir).filter(f => f.endsWith('.parquet'));
    for (const file of files) {
      log(`  ${file}`);
      stats.aggregatedFiles++;
    }
  }
  log(`  Total: ${stats.aggregatedFiles} files`);
  log('');

  // 4. Create scenario name mapping file
  log('--- Creating scenario mapping ---');
  const mapping = {};
  if (fs.existsSync(baseSourceDir)) {
    const scenarios = fs.readdirSync(baseSourceDir, { withFileTypes: true })
      .filter(d => d.isDirectory());

    for (const scenario of scenarios) {
      const slug = slugify(scenario.name);
      mapping[slug] = scenario.name;
    }
  }

  const mappingPath = path.join(dataDir, 'scenario-mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2) + '\n');
  log(`  Written: scenario-mapping.json`);
  log('');

  // Summary
  log('='.repeat(60));
  log('Copy complete!');
  log('='.repeat(60));
  log(`Base scenarios: ${stats.baseScenarios} (${stats.baseFiles} parquet files)`);
  log(`Parameters: ${stats.parameters} (${stats.parameterFiles} parquet files)`);
  log(`Aggregated: ${stats.aggregatedFiles} parquet files`);
  log('');
  log('NOTE: Legacy scenarios/ directory was NOT copied (Strategy 2 only)');

  return stats;
}

// Run directly if executed as script
if (import.meta.url === `file://${process.argv[1]}`) {
  copyGeneratorOutput()
    .then(stats => {
      console.log('\nDone!');
    })
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}
