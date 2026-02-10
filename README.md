# Energy Toolkit: Demand

A complete framework for generating, serving, and visualizing energy demand forecasts. This monorepo contains three independently usable applications that work together to provide a professional energy forecasting toolkit.

## Components

### Generator (`/generator`)

Python-based tool for generating forecasts of future energy demand. Creates scenario-based projections by applying transformations to historical electricity demand data.

**Key Features**:
- Modular transformation system for scenario generation
- Multi-parameter scenario support (electrification rates, growth factors, etc.)
- Efficient Parquet output format for fast querying
- Pre-computed aggregations for common visualizations

### API (`/api`)

OpenAPI 3.1 compliant REST API that serves demand forecast data and metadata. Runs locally or can be deployed to cloud services.

**Key Features**:
- Static JSON endpoints for metadata (scenarios, geographies, parameters)
- Dynamic DuckDB-powered querying for time series data
- Multiple resolutions (1h, 1d, 1w, 1M, 1Y)
- Multiple aggregations (sum, mean, max)
- Optimized for fast queries with predicate pushdown

### Explorer (`/explorer`)

Modern SvelteKit web application for interactive visualization of energy demand forecasts.

**Key Features**:
- Interactive charts (time series, histograms, sector breakdowns)
- Geographic visualization with Mapbox integration
- Scenario comparison with overlay visualizations
- Per-chart parameter controls with visual feedback
- Export functionality (PNG, SVG, CSV, JSON)
- Fully responsive design (mobile to desktop) 

## Quick Start

### Prerequisites
- **Node.js 18+** (for API and Explorer)
- **Python 3.9+** (for Generator)
- **DuckDB** (automatically installed via Node package)

### 1. Generate Data (First Time Setup)

```bash
# Generate forecast data with default parameters
cd generator
python generator_notebook-county.py
```

This creates Parquet files in `/api/data/demand/` with demand forecasts for all scenarios.

### 2. Build Static API Endpoints

```bash
# Generate static JSON endpoints and compute global statistics
cd api
npm install
node generate-api.js --defaults
```

This creates metadata files in `/api/data/` including:
- `scenarios.json` - Available forecast scenarios
- `geographies.json` - Geographic regions
- `parameters.json` - Available query parameters
- `globals.json` - Data bounds for visualizations

### 3. Start API Server

```bash
# From /api directory
npm start
```

API available at http://localhost:4010

### 4. Start Explorer

```bash
# From /explorer directory
npm install
npm run dev
```

Explorer available at http://localhost:5173

Visit http://localhost:5173/charts to see the chart library with all visualizations.

## Use Cases

**General Users**: Explore and analyze future demand through interactive visualizations (Explorer)

**Data Analysts**: Access raw data through API or export chart data as CSV/JSON for custom analysis (Explorer + API)

**Researchers**: Modify forecast models, adjust parameters, and generate new scenarios (Generator + API + Explorer)

**Developers**: Fork and customize the framework for different data sources or analysis needs

## Repository Structure

```
/behovskartan/
├── config.yaml                   # Main configuration file
├── CLAUDE.md                     # Detailed project documentation
├── README.md                     # This file
│
├── generator/                    # Python forecasting engine
│   ├── generator_notebook-county.py   # Main generation script
│   ├── input/                    # Historical demand data
│   └── transformers/             # Scenario transformation modules
│
├── api/                          # REST API server
│   ├── local-server.js           # API server (OpenAPI/Prism + DuckDB)
│   ├── generate-api.js           # Static endpoint generator
│   ├── openapi.yaml              # API specification
│   ├── parameters.yaml           # Parameter definitions
│   ├── scripts/                  # Generation scripts
│   │   ├── generate-endpoints.js
│   │   └── endpoints/            # Endpoint generation modules
│   ├── data/                     # Generated data (not in git)
│   │   ├── demand/               # Parquet files (133k+ files)
│   │   │   ├── base/             # Base scenarios
│   │   │   ├── scenarios/        # Parametric scenarios
│   │   │   └── aggregated/       # Pre-computed aggregations
│   │   ├── scenarios.json        # Scenario definitions
│   │   ├── geographies.json      # Geography metadata
│   │   ├── parameters.json       # Available parameters
│   │   └── globals.json          # Data bounds
│   └── tests/                    # API tests
│
└── explorer/                     # SvelteKit web application
    ├── src/
    │   ├── routes/
    │   │   ├── +page.svelte      # Main report page
    │   │   └── charts/           # Chart library
    │   │       ├── +page.svelte  # Chart gallery with controls
    │   │       └── +page.ts      # Data loader
    │   └── lib/
    │       ├── components/       # Chart and UI components
    │       │   ├── AreaChart.svelte
    │       │   ├── TimeLine.svelte
    │       │   ├── Histogram.svelte
    │       │   ├── SectorArc.svelte
    │       │   ├── GeoBarChart.svelte
    │       │   ├── map/
    │       │   │   └── Map.svelte
    │       │   ├── shared/       # Reusable components
    │       │   └── controls/     # Parameter controls
    │       ├── dataService.ts    # API communication
    │       ├── utilities.ts      # Helper functions
    │       ├── comparisonUtils.ts # Scenario comparison
    │       └── stores/           # State management
    └── tests/                    # Frontend tests

```

## Modeling Philosophy

This project takes the view that the best foundation for modeling future demand is current demand. Demand projections are transformations of historical electricity demand data. Transformations are modular and can be freely combined to produce scenarios.

**Key Principles**:
- **Historical baseline**: Start with actual measured demand
- **Modular transformations**: Apply growth rates, electrification, efficiency improvements
- **Scenario combinations**: Each scenario is defined by parameter values
- **Transparent assumptions**: All parameters and transformations are documented

## Configuration

The main configuration file `/config.yaml` defines:

1. **Global settings**: Time ranges, resolutions, geographies
2. **Scenario parameters**: Electrification rates, growth factors, transition speeds
3. **Data sources**: Historical demand data, GeoJSON boundaries
4. **API settings**: Endpoints, aggregations, access levels
5. **Units configuration**: Base unit prefixes for energy and power values

### Base Units

The toolkit uses SI prefixes to display energy (Wh) and power (W) values. Configure the base unit prefix in `config.yaml`:

```yaml
units:
  energy:
    prefix: G      # SI prefix: '', k, M, G, T
    unit: Wh       # Base unit (always Wh)
  power:
    prefix: G      # SI prefix: '', k, M, G, T
    unit: W        # Base unit (always W)
```

**SI Prefix Scale**:
| Prefix | Symbol | Multiplier | Example |
|--------|--------|------------|---------|
| (none) | -      | 1          | Wh, W   |
| kilo   | k      | 1,000      | kWh, kW |
| mega   | M      | 1,000,000  | MWh, MW |
| giga   | G      | 1,000,000,000 | GWh, GW |
| tera   | T      | 1,000,000,000,000 | TWh, TW |

The prefix should match the scale of your source data. For example:
- National/regional energy forecasts typically use **GWh** (prefix: `G`)
- Building-level data might use **kWh** (prefix: `k`)
- Grid-scale power data often uses **GW** or **MW**

After changing the units configuration, regenerate the API:
```bash
cd api && node generate-api.js --defaults
```

The Explorer automatically reads the units configuration and formats all chart axes, tooltips, and labels accordingly.

See `config.yaml` for the full schema and examples.

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Comprehensive project documentation, architecture details, development patterns
- **[API README](./api/README.md)** - API server documentation, endpoints, DuckDB queries
- **[Explorer README](./explorer/README.md)** - Frontend application documentation, components, development guide
- **[OpenAPI Spec](./api/openapi.yaml)** - Complete API specification

## Technology Stack

**Generator**:
- Python 3.9+
- Pandas, NumPy for data processing
- PyArrow for Parquet output

**API**:
- Node.js 18+
- OpenAPI 3.1 specification
- Prism mock server
- DuckDB for query engine
- YAML configuration

**Explorer**:
- SvelteKit (Svelte 5)
- TypeScript
- Tailwind CSS with container queries
- LayerChart for visualizations
- Mapbox GL JS for maps
- Lucide icons

## Current Status (January 2025)

✅ **Generator**: Fully functional with multi-parameter scenario support

✅ **API**: Production-ready with static endpoints and DuckDB queries

✅ **Explorer**: Fully functional with chart library, parameter controls, and exports

### Recent Improvements
- Chart library page with responsive grid layout
- Per-chart parameter overrides with visual feedback
- Geography metadata from API endpoint
- Single-line chart headers with proper icons
- Fixed chart reactivity and parameter isolation
- Comprehensive documentation updates

### Known Limitations
- PNG export has style preservation issues with complex LayerChart components
- Map component needs further standardization review
- Limited test coverage (tests exist for API, minimal for Explorer)

## Contributing

This is a framework designed to be forked and customized. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes with clear commit messages
4. Test thoroughly (run API tests, check all charts)
5. Submit a pull request with description

See [CLAUDE.md](./CLAUDE.md) for detailed development guidelines and patterns.

## License

[License information to be added]

## Confidentiality Note

The application is designed to work with both public and proprietary data. When using confidential data:

- Store sensitive data in designated private directories (excluded from git)
- Avoid revealing proprietary information in file names
- Review configuration files before committing
- Use access controls when deploying to production
