# API Documentation Guide

This guide explains the comprehensive documentation system for the Demand Toolkit API.

## Documentation Types

The API documentation consists of multiple complementary resources:

### 1. TypeDoc Generated Documentation
**Location**: `docs/api/`
**Purpose**: Complete reference for all JavaScript modules, functions, and utilities
**Best For**: Developers integrating with or extending the API codebase

- **Modules Reference**: Detailed documentation for utils, config, and endpoint generators
- **Function Signatures**: Complete parameter and return type information
- **Usage Examples**: Code examples for all major functions
- **Cross-references**: Links between related functions and modules

**Access**:
```bash
npm run docs:build    # Generate documentation
npm run docs:serve    # Serve at http://localhost:8081
```

### 2. OpenAPI Interactive Documentation
**Location**: `docs/openapi/`
**Purpose**: Interactive API specification with try-it-out functionality
**Best For**: API consumers who want to understand and test endpoints

- **Endpoint Reference**: All available API endpoints with parameters
- **Request/Response Examples**: Sample JSON for all operations
- **Interactive Testing**: Try API calls directly from the browser
- **Schema Definitions**: Complete data model documentation

**Access**:
```bash
npm run docs:openapi       # Generate OpenAPI docs
npm run docs:serve-openapi # Serve at http://localhost:8082
```

### 3. README Documentation
**Location**: `README.md`
**Purpose**: Quick start guide and overview
**Best For**: New users getting started with the API

## Comprehensive Documentation Commands

### Generate All Documentation
```bash
npm run docs:build-all    # Build both TypeDoc and OpenAPI docs
```

### Serve All Documentation
```bash
npm run docs:serve-all    # Serve unified docs at http://localhost:8080
```

### Development Mode
```bash
npm run docs:watch        # Auto-rebuild TypeDoc on file changes
```

## Documentation Structure

```
docs/
├── api/                  # TypeDoc generated documentation
│   ├── README.md        # API overview
│   ├── modules.md       # Modules index
│   ├── utils/           # Utility functions docs
│   ├── config/          # Configuration docs
│   ├── endpoints/       # Endpoint generator docs
│   └── scripts/         # Script documentation
├── openapi/             # OpenAPI interactive documentation
│   └── index.html       # Swagger UI interface
└── API_DOCUMENTATION_GUIDE.md  # This guide
```

## For Developers

### Adding Documentation to Code

**JavaScript Modules**: Use comprehensive JSDoc comments
```javascript
/**
 * @fileoverview Brief module description
 * @module module-name
 * @version 0.0.1
 */

/**
 * Function description with use cases and examples
 *
 * @param {string} param - Parameter description
 * @returns {Object} Return value description
 *
 * @example
 * const result = myFunction('example');
 * // result: { ... }
 *
 * @since 0.0.1
 */
export function myFunction(param) {
  // implementation
}
```

**OpenAPI Specification**: Enhance `openapi.yaml` with:
- Detailed endpoint descriptions
- Request/response examples
- Parameter documentation
- Error response definitions

### Regenerating Documentation

After making changes to code or OpenAPI spec:

1. **Code Changes**: Run `npm run docs:build` to regenerate TypeDoc
2. **OpenAPI Changes**: Run `npm run docs:openapi` to regenerate Swagger UI
3. **Both**: Run `npm run docs:build-all` for complete regeneration

### Documentation Standards

- **Completeness**: Document all public functions and modules
- **Examples**: Include practical usage examples
- **Cross-references**: Link related functions and concepts
- **Consistency**: Follow established JSDoc and OpenAPI patterns
- **Accuracy**: Keep documentation synchronized with code changes

## For API Consumers

### Getting Started Workflow

1. **Overview**: Read the main `README.md`
2. **API Reference**: Use OpenAPI docs to understand endpoints
3. **Integration**: Refer to TypeDoc for utility functions
4. **Testing**: Use interactive Swagger UI to test API calls

### Understanding the API

- **Configuration**: Start with `GET /config` to understand the dataset
- **Parameters**: Use `GET /parameters` to discover valid combinations
- **Scenarios**: Explore `GET /scenarios` for forecasting options
- **Geography**: Check `GET /geographies` for boundary data

## Automation

The documentation system includes automation for:

- **Continuous Generation**: TypeDoc builds on code changes
- **Integrated Serving**: Single command to serve all documentation
- **Cross-format Links**: Connections between TypeDoc and OpenAPI docs
- **Validation**: Automatic checking of documentation completeness

## Troubleshooting

### Common Issues

**TypeDoc Warnings**:
- Unknown JSDoc tags: These are informational and don't affect output
- Missing references: Ensure all referenced functions are exported

**OpenAPI Generation Fails**:
- Check `openapi.yaml` syntax with YAML validator
- Ensure all referenced schemas exist

**Serving Issues**:
- Check ports 8080-8082 aren't in use
- Verify documentation was generated first

### Getting Help

1. Check this guide for documentation standards
2. Review existing code for JSDoc examples
3. Consult OpenAPI 3.1 specification for schema syntax
4. Use TypeDoc documentation for advanced configuration

## Integration with Demand Toolkit

This API documentation integrates with the broader Demand Toolkit:

- **Generator Integration**: Documents how API works with Python generator
- **Explorer Integration**: Explains data formats used by Svelte frontend
- **Deployment**: Covers both local development and cloud deployment
- **Data Flow**: Documents the complete data pipeline from generator to explorer