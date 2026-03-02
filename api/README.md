# Demand Toolkit API

A flexible API for demand forecasting data that can output local CSV files, serve a local API (OpenAPI 3.1), or deploy to cloud services.

## Overview

The Demand Toolkit API provides endpoints for accessing demand forecasting data across multiple temporal resolutions and geographic boundaries. It's designed to work with the Python-based generator and Svelte explorer components of the Demand Toolkit.

## Features

- **Multiple Output Formats**: JSON and GeoJSON support
- **Flexible Temporal Resolution**: From hourly to yearly data
- **Geographic Boundaries**: Configurable geography support
- **Scenario Management**: Multiple forecasting scenarios
- **Parameter Validation**: OpenAPI 3.1 specification compliance
- **Local & Cloud Deployment**: Works locally or on AWS

## API Endpoints

### Static Endpoints
- `GET /geographies` - List of geographic boundaries (JSON or GeoJSON)
- `GET /config` - Configuration metadata including units configuration (SI prefixes for energy/power display)
- `GET /scenarios` - Available forecasting scenarios
- `GET /parameters` - Valid parameter combinations
- `GET /aggregations` - Available aggregation methods
- `GET /globals` - Pre-computed global statistics and bounds for visualization scaling

### Dynamic Endpoints
- `GET /demand` - Time-series demand data with flexible aggregation (uses DuckDB)

## Data Structure

The API uses a nested Parquet file structure for efficient querying:

```
data/
├── base/
│   └── current-policy/
│       └── data.parquet           # Base scenario (21 geographies × 5 segments × 8760 hours × 26 years)
├── scenarios/
│   ├── housing_electrification=0/
│   │   └── transport_electrification=0/
│   │       └── industry_transition=0/
│   │           └── data.parquet   # Parametric scenario files
│   └── ... (75 scenario combinations)
└── aggregated/                    # Pre-computed aggregations for fast queries
    ├── geography_yearly.parquet   # Yearly totals per geography
    ├── segment_yearly.parquet     # Yearly totals per segment
    ├── national_yearly.parquet    # Yearly national totals
    └── scenario_metadata.parquet  # Scenario parameter combinations
```

### Query Performance
- **Dynamic queries**: DuckDB scans Parquet files with predicate pushdown
- **Pre-aggregated tables**: 50-100x faster for common yearly queries
- **UNION queries**: Combines base and scenario data with schema normalization

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Generate data** (requires Python generator):
   ```bash
   # Run generator first to create Parquet files
   cd ../generator
   jupyter notebook notebooks/behovskartan2.ipynb
   ```

3. **Generate static endpoints and globals:**
   ```bash
   cd ../api
   node generate-api.js --defaults
   ```

4. **Start local server:**
   ```bash
   npm start
   # API available at http://localhost:4010
   ```

5. **Test the API:**
   ```bash
   curl http://localhost:4010/globals
   curl "http://localhost:4010/demand?period.start=2030&period.end=2031&period.resolution=1Y&period.aggregation=sum&geography=total&segment=total&scenarioId=default"
   ```

6. **Access API documentation:**
   ```bash
   npm run docs:build
   npm run docs:serve
   ```

## Testing

```bash
npm test                  # Run tests
npm run test:coverage     # Run with coverage
npm run test:watch        # Watch mode
```

## Documentation

This API uses TypeDoc to generate comprehensive documentation from JSDoc comments. The documentation includes:

- **Function References**: Complete API for all modules
- **Usage Examples**: Code examples for common operations
- **Type Definitions**: Parameter and return types
- **Integration Guides**: How to use with other toolkit components

## Architecture

The API follows a modular architecture with:

- **Core Utilities** (`utils.js`) - Date parsing and period handling
- **Configuration** (`config.js`) - Environment-specific settings
- **Endpoint Generators** (`scripts/endpoints/`) - Static data generation
- **OpenAPI Specification** (`openapi.yaml`) - API contract definition
- **Local Server** (`local-server.js`) - Express + OpenAPI Backend + DuckDB
- **API Generation** (`generate-api.js`) - Orchestrates static endpoint generation and globals computation

### Server Components

**Local Server** (`local-server.js`):
- Uses OpenAPI Backend for request validation and routing
- Serves static JSON files for `/config`, `/parameters`, `/scenarios`, `/geographies`, `/aggregations`, `/globals`
- Uses DuckDB for dynamic `/demand` queries against Parquet files
- Supports CORS for local development with Explorer frontend

**API Generation** (`generate-api.js`):
- Validates data directory exists and contains Parquet files
- Generates all static JSON endpoints from config files
- Computes global statistics with DuckDB analysis of Parquet data
- Creates `globals.json` with aggregation-specific bounds

### Endpoint Generation

Static endpoints are generated from configuration files:
1. `parameters.json` ← `/api/parameters.yaml` + `/api/openapi.yaml`
2. `geographies.json` / `geographies.geojson` ← `/config.yaml`
3. `scenarios.json` ← `/config.yaml` (scenario parameter combinations)
4. `aggregations.json` ← `/config.yaml` (resolution-aggregation combinations)
5. `config.json` ← `/config.yaml` (filtered for public access, includes units configuration)
6. `globals.json` ← DuckDB analysis of Parquet files (computed bounds for visualizations)

## Development

See the [TypeDoc generated documentation](./docs/api/) for detailed API references and usage examples.