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

- `GET /geographies` - List of geographic boundaries
- `GET /config` - Configuration metadata
- `GET /scenarios` - Available forecasting scenarios
- `GET /parameters` - Valid parameter combinations
- `GET /aggregations` - Available aggregation methods

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Generate static endpoint data:**
   ```bash
   npm run build:static-endpoints
   ```

3. **Start local server:**
   ```bash
   npm start
   ```

4. **Access API documentation:**
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

## Development

See the [TypeDoc generated documentation](./docs/api/) for detailed API references and usage examples.