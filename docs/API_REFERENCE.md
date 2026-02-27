# API Reference

## Data Pipeline

1. **Data Generation**: Generator (Python) → Parquet files in `/data/`
2. **Static Endpoints**: `generate-api.js` → JSON files in `/data/`
3. **API Server**: Prism serves OpenAPI spec + static files + DuckDB queries
4. **Frontend Loading**: `+page.ts` fetches initial data → passes props to components
5. **Component Data**: Hybrid pattern - components accept props OR fetch own data

## API Response Format

- Time series data: `{ period: "2025-01-01T00:00:00Z", value: 123.45, geography: "SE01", segment: "housing" }`
- Components transform to: `{ timestamp: Date, total: number }`

## API Endpoints

### Static Endpoints

- `GET /globals` - Min/max bounds for different aggregation levels
- `GET /parameters` - Available years, geographies, segments, resolutions
- `GET /scenarios` - Scenario definitions with growth rates
- `GET /geographies` - Geography metadata and GeoJSON
- `GET /config` - General configuration

### Dynamic Endpoints

- `GET /demand` - Time series data (uses DuckDB for dynamic queries)
  - Query with `makeDemandQuery()` helper
  - Server-side aggregation: Use `geography='total'` and `segment='total'`
  - Supports resolutions: 1h, 1d, 1w, 1M, 1Y
  - Supports aggregations: sum, mean

### Enhanced Globals Structure

```json
{
  "lower_bound": -20.41,  // Legacy raw data bounds
  "upper_bound": 12497.73,
  "bounds": {
    "raw": { "lower_bound": -20.41, "upper_bound": 12497.73 },
    "map_yearly_geography": { "lower_bound": 50000000, "upper_bound": 30000000000 },
    "sector_yearly": { "lower_bound": 10000000000, "upper_bound": 100000000000 },
    "national_yearly": { "lower_bound": 100000000000, "upper_bound": 500000000000 }
  }
}
```

## Common Commands

### API Server

```bash
cd /home/viktor/code/behovskartan/api
node generate-api.js --defaults  # Regenerate static endpoints
npm start                        # Start API server on port 4010
node local-server.js             # Direct server start
```

### Process Management

```bash
ps aux | grep node               # Find running Node processes
kill [PID]                       # Kill specific process
pkill -f "local-server"          # Kill by process name
```

## Key File Paths

### API Layer

- `/api/local-server.js` - Main API server using OpenAPI/Prism (runs on port 4010)
- `/api/generate-api.js` - Script to generate static endpoints and compute globals.json
- `/api/scripts/generate-endpoints.js` - Builds static JSON endpoints from config files
- `/data/` - Directory containing all static JSON endpoints:
  - `globals.json` - Min/max bounds for different aggregation levels
  - `parameters.json` - Available years, geographies, segments
  - `scenarios.json` - Scenario definitions
  - `geographies.json` - Geography metadata
  - `config.json` - General configuration
- `/api/openapi.yaml` - OpenAPI 3.1 specification
- `/api/parameters.yaml` - Parameter definitions for API generation

## Static Endpoint Generation

### Main Generation Scripts

- `/api/generate-api.js` - **Master script** that orchestrates all static endpoint generation
- `/api/scripts/generate-endpoints.js` - **Core orchestrator** called by generate-api.js
- `/api/scripts/endpoints.js` - **Central export module** for all endpoint functions

### Function-to-File Mapping

**Entry Point**: `buildStaticEndpoints()` in `/api/scripts/generate-endpoints.js` calls:

1. **parameters.json** ← `generateParameters()`
   - **Source**: `/api/scripts/endpoints/endpoint-parameters.js`
   - **Inputs**: `/api/parameters.yaml` + `/api/openapi.yaml`
   - **Generates**: Available parameter values (years, geographies, segments, resolutions)

2. **geographies.json** ← `generateGeographies(config, 'json')`
   - **Source**: `/api/scripts/endpoints/endpoint-geographies.js`
   - **Inputs**: `/config.yaml` (geography.geographies array)
   - **Generates**: Geography metadata array

3. **geographies.geojson** ← `generateGeographies(config, 'geojson')`
   - **Source**: `/api/scripts/endpoints/endpoint-geographies.js`
   - **Inputs**: `/config.yaml` (geography.file path)
   - **Generates**: Copy of GeoJSON file to data directory

4. **scenarios.json** ← `generateScenarios(config)`
   - **Source**: `/api/scripts/endpoints/endpoint-scenarios.js`
   - **Inputs**: `/config.yaml` (scenario.scenarios section)
   - **Generates**: All scenario parameter combinations with metadata

5. **aggregations.json** ← `generateAggregations(config)`
   - **Source**: `/api/scripts/endpoints/endpoint-aggregations.js`
   - **Inputs**: `/config.yaml` (api.resolutions + api.aggregations)
   - **Generates**: All resolution-aggregation combinations

6. **config.json** ← `generateConfig(config)`
   - **Source**: `/api/scripts/endpoints/endpoint-config.js`
   - **Inputs**: `/config.yaml` (full config object)
   - **Generates**: Filtered configuration based on access level

7. **globals.json** ← `generateGlobalsFile()` in `/api/generate-api.js`
   - **Source**: `/api/generate-api.js` (computeGlobalStatistics + generateGlobalsFile functions)
   - **Inputs**: Parquet data files via DuckDB queries
   - **Generates**: Min/max bounds for different aggregation levels

### Configuration Sources

**Primary Config Files**:
- `/config.yaml` - Main project configuration (geographies, scenarios, API settings)
- `/api/parameters.yaml` - OpenAPI parameter definitions with enums
- `/api/openapi.yaml` - Full OpenAPI 3.1 specification

**Generated Files Location**: `/data/`
- All static JSON files are written to this directory
- Files are regenerated each time `node generate-api.js` is run
- API server serves these files directly for static endpoints

### Generation Triggers

```bash
# Full regeneration (including globals with DuckDB analysis)
node generate-api.js --defaults

# Static endpoints only (faster, no globals computation)
node scripts/generate-endpoints.js
```

## Data Structure

### Nested Parquet File Structure (Current Standard)

```
/data/
├── base/
│   └── {scenario_id}/
│       └── data.parquet           # Base scenario files
│                                  # Schema: [timestamp, value, geography, segment, scenario_id]
├── scenarios/
│   └── {param1}={val1}/
│       └── {param2}={val2}/
│           └── .../
│               └── data.parquet   # Parametric scenario files
├── aggregated/                    # Pre-computed aggregations (generated by generator)
│   ├── geography_yearly.parquet   # Yearly totals per geography (for maps)
│   ├── segment_yearly.parquet     # Yearly totals per segment (for sector charts)
│   ├── national_yearly.parquet    # Yearly national totals (for time series)
│   └── scenario_metadata.parquet  # Scenario parameter combinations
└── [static json files]            # Generated by generate-api.js
```

### Key Data Structure Patterns

1. **Base vs Scenarios**: Base scenarios have NULL parameter columns, scenarios have parameter values
2. **UNION Queries**: Combine base and scenarios with schema normalization
3. **Pre-aggregation**: Generator creates aggregated tables for 50-100x speedup on common queries
4. **DuckDB Optimization**: Predicate pushdown, Parquet column pruning, parallel scanning
