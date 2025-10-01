#!/usr/bin/env node
/**
 * API Generation Script
 *
 * This script must be run after data generation and before starting the API server.
 * It analyzes the generated parquet data and creates all static API endpoints
 * including data-dependent statistics like globals (min/max bounds).
 *
 * Usage: node generate-api.js
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { checkbox, confirm, input } from '@inquirer/prompts';
import duckdb from 'duckdb';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import existing API generation functions
import { buildStaticEndpoints } from './scripts/generate-endpoints.js';

console.log('🔧 API Generation Script');
console.log('='.repeat(50));

/**
 * Check if data directory exists and has parquet files
 */
function validateDataExists() {
    const dataDir = path.join(__dirname, 'data');

    if (!fs.existsSync(dataDir)) {
        console.error('❌ Error: Data directory not found at', dataDir);
        console.error('   Please run the data generator first.');
        process.exit(1);
    }

    // Check for parquet files
    const parquetFiles = [];
    const scanForParquet = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                scanForParquet(fullPath);
            } else if (entry.name.endsWith('.parquet')) {
                parquetFiles.push(fullPath);
            }
        }
    };

    scanForParquet(dataDir);

    if (parquetFiles.length === 0) {
        console.error('❌ Error: No parquet files found in data directory');
        console.error('   Please run the data generator first.');
        process.exit(1);
    }

    console.log(`✅ Found ${parquetFiles.length} parquet files`);
    return { dataDir, parquetFiles };
}

/**
 * Ask user about API configuration
 */
async function askApiConfiguration() {
    console.log('\n📋 API Configuration');
    console.log('-'.repeat(30));

    // Check if running with --defaults flag for non-interactive mode
    const useDefaults = process.argv.includes('--defaults');

    if (useDefaults) {
        console.log('Using default configuration...');
        return {
            resolutions: ['1h', '1d', '1w', '1M', '1Y'],
            aggregations: ['sum', 'mean'],
            generateGlobals: true
        };
    }

    const resolutions = await checkbox({
        message: 'Which resolutions do you want to expose in the API?',
        choices: [
            { name: 'Hourly (1h)', value: '1h', checked: true },
            { name: 'Daily (1d)', value: '1d', checked: true },
            { name: 'Weekly (1w)', value: '1w', checked: true },
            { name: 'Monthly (1M)', value: '1M', checked: true },
            { name: 'Yearly (1Y)', value: '1Y', checked: true }
        ]
    });

    const aggregations = await checkbox({
        message: 'Which aggregation methods do you want to support?',
        choices: [
            { name: 'Sum', value: 'sum', checked: true },
            { name: 'Mean', value: 'mean', checked: true }
        ]
    });

    const generateGlobals = await confirm({
        message: 'Generate global statistics (min/max bounds) for map color scaling?',
        default: true
    });

    return { resolutions, aggregations, generateGlobals };
}

/**
 * Analyze parquet data to compute global statistics for different aggregation levels
 */
async function computeGlobalStatistics(dataDir) {
    console.log('\n📊 Computing Global Statistics');
    console.log('-'.repeat(30));
    console.log('⏳ Computing bounds for different aggregation levels...');

    return new Promise((resolve, reject) => {
        const db = new duckdb.Database(':memory:');
        const conn = db.connect();

        // Setup paths for nested structure
        const scenariosDir = path.join(dataDir, 'scenarios');
        const baseDir = path.join(dataDir, 'base');

        console.log('📊 Computing data bounds...');

        // Build UNION query to scan both base and scenarios directories
        const patterns = [];
        if (fs.existsSync(baseDir)) {
            patterns.push(path.join(baseDir, '**', '*.parquet').replace(/\\/g, '/'));
        }
        if (fs.existsSync(scenariosDir)) {
            patterns.push(path.join(scenariosDir, '**', '*.parquet').replace(/\\/g, '/'));
        }

        const parquetPattern = patterns;

        // Build unified query with appropriate parquet scan
        let dataSource;
        if (parquetPattern.length > 1) {
            // Multiple patterns - use UNION ALL
            const unionParts = parquetPattern.map(pattern => `SELECT * FROM read_parquet('${pattern}')`);
            dataSource = `(${unionParts.join(' UNION ALL ')}) AS combined_data`;
        } else {
            // Single pattern
            dataSource = `read_parquet('${parquetPattern[0]}')`;
        }

        // Single unified query to compute all bounds efficiently
        const unifiedQuery = `
            WITH yearly_data AS (
                SELECT
                    geography,
                    segment,
                    DATE_TRUNC('year', timestamp) as year,
                    value
                FROM ${dataSource}
                WHERE value IS NOT NULL
            ),
            geography_yearly AS (
                SELECT geography, year, SUM(value) as geography_total
                FROM yearly_data
                GROUP BY geography, year
            ),
            sector_yearly AS (
                SELECT segment, year, SUM(value) as sector_total
                FROM yearly_data
                GROUP BY segment, year
            ),
            national_yearly AS (
                SELECT year, SUM(value) as national_total
                FROM yearly_data
                GROUP BY year
            )
            SELECT
                -- Raw data bounds
                MIN(yearly_data.value) as raw_min,
                MAX(yearly_data.value) as raw_max,
                COUNT(yearly_data.value) as total_records,
                AVG(yearly_data.value) as mean_value,

                -- Map bounds (geography yearly totals)
                MIN(geography_yearly.geography_total) as map_min,
                MAX(geography_yearly.geography_total) as map_max,

                -- Sector bounds (segment yearly totals)
                MIN(sector_yearly.sector_total) as sector_min,
                MAX(sector_yearly.sector_total) as sector_max,

                -- National bounds (yearly totals)
                MIN(national_yearly.national_total) as national_min,
                MAX(national_yearly.national_total) as national_max

            FROM yearly_data
            CROSS JOIN geography_yearly
            CROSS JOIN sector_yearly
            CROSS JOIN national_yearly
        `;

        // Execute unified query
        conn.all(unifiedQuery, (err, result) => {
            if (err) {
                console.error(`❌ Error computing statistics:`, err.message);
                reject(err);
                return;
            }

            if (!result || result.length === 0) {
                console.error(`❌ No data found`);
                reject(new Error('No data found'));
                return;
            }

            const data = result[0];

            console.log(`✅ Raw data: ${data.raw_min?.toFixed(0)} - ${data.raw_max?.toFixed(0)} (${Number(data.total_records).toLocaleString()} records)`);
            console.log(`✅ Map (geography/year): ${data.map_min?.toFixed(0)} - ${data.map_max?.toFixed(0)}`);
            console.log(`✅ Sectors (segment/year): ${data.sector_min?.toFixed(0)} - ${data.sector_max?.toFixed(0)}`);
            console.log(`✅ National (year): ${data.national_min?.toFixed(0)} - ${data.national_max?.toFixed(0)}`);

            db.close();

            resolve({
                // Legacy compatibility
                lower_bound: data.raw_min,
                upper_bound: data.raw_max,
                total_records: Number(data.total_records),
                mean_value: data.mean_value,
                // New aggregation-specific bounds
                bounds: {
                    raw: {
                        lower_bound: data.raw_min,
                        upper_bound: data.raw_max,
                        description: "Raw data points (hourly values)"
                    },
                    map_yearly_geography: {
                        lower_bound: data.map_min,
                        upper_bound: data.map_max,
                        description: "Yearly totals per geography (for map color scaling)"
                    },
                    sector_yearly: {
                        lower_bound: data.sector_min,
                        upper_bound: data.sector_max,
                        description: "Yearly totals per sector (for sector charts)"
                    },
                    national_yearly: {
                        lower_bound: data.national_min,
                        upper_bound: data.national_max,
                        description: "Yearly national totals (for time series)"
                    }
                }
            });
        });
    });
}

/**
 * Generate enhanced globals.json file with multiple bound sets
 */
function generateGlobalsFile(dataDir, stats) {
    const globalsPath = path.join(dataDir, 'globals.json');
    const globalsData = {
        // Legacy compatibility
        lower_bound: stats.lower_bound,
        upper_bound: stats.upper_bound,
        computed_at: new Date().toISOString(),
        metadata: {
            total_records: stats.total_records,
            mean_value: stats.mean_value
        },
        // New aggregation-specific bounds
        bounds: stats.bounds
    };

    fs.writeFileSync(globalsPath, JSON.stringify(globalsData, null, 2));
    console.log(`✅ Generated enhanced ${globalsPath} with multiple bound sets:`);
    console.log(`   - Raw data bounds (legacy)`);
    console.log(`   - Map yearly geography bounds`);
    console.log(`   - Sector yearly bounds`);
    console.log(`   - National yearly bounds`);

    return globalsData;
}

/**
 * Update parameters.yaml with selected resolutions and aggregations
 */
function updateParametersYaml(config) {
    const paramsPath = path.join(__dirname, 'parameters.yaml');

    if (!fs.existsSync(paramsPath)) {
        console.error('❌ parameters.yaml not found. Run setup first.');
        process.exit(1);
    }

    // Read existing parameters.yaml
    const existingContent = fs.readFileSync(paramsPath, 'utf8');
    const paramsDoc = yaml.load(existingContent);

    // Update resolution enum in period parameter
    if (paramsDoc.components?.parameters?.period?.schema?.properties?.resolution?.enum) {
        paramsDoc.components.parameters.period.schema.properties.resolution.enum = config.resolutions;
    }

    // Update aggregation enum in period parameter
    if (paramsDoc.components?.parameters?.period?.schema?.properties?.aggregation?.enum) {
        paramsDoc.components.parameters.period.schema.properties.aggregation.enum = config.aggregations;
    }

    // Write updated parameters.yaml
    const updatedContent = yaml.dump(paramsDoc, { sortKeys: false, lineWidth: -1 });
    fs.writeFileSync(paramsPath, updatedContent);
    console.log(`✅ Updated ${paramsPath} with API configuration`);
}

/**
 * Main execution function
 */
async function main() {
    try {
        // Step 1: Validate data exists
        const { dataDir, parquetFiles } = validateDataExists();

        // Step 2: Ask for API configuration
        const config = await askApiConfiguration();

        // Step 3: Update parameters.yaml with configuration
        updateParametersYaml(config);

        // Step 4: Generate static endpoints (parameters, scenarios, etc.)
        console.log('\n🔧 Generating Static Endpoints');
        console.log('-'.repeat(30));
        await buildStaticEndpoints(__dirname);

        // Step 5: Compute and generate globals if requested
        let globalsData = null;
        if (config.generateGlobals) {
            const stats = await computeGlobalStatistics(dataDir);
            globalsData = generateGlobalsFile(dataDir, stats);
        }

        // Step 6: Summary
        console.log('\n🎉 API Generation Complete');
        console.log('='.repeat(50));
        console.log('✅ Static endpoints generated');
        console.log('✅ Parameters updated');
        if (globalsData) {
            console.log('✅ Global statistics computed');
        }
        console.log('\nYou can now start the API server with: npm start');

    } catch (error) {
        console.error('\n❌ API Generation Failed');
        console.error('Error:', error.message);
        if (error.stack && process.env.DEBUG) {
            console.error('\nStack trace:', error.stack);
        }
        process.exit(1);
    }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { main as generateAPI };