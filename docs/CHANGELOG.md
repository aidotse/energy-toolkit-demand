# Recent Major Changes

## January 2025 - Scenario Comparison and Chart Export

**Summary**: Added multi-scenario comparison support and chart export functionality

**Phase 1.5: Scenario Comparison Support** (Completed):
- Implemented scenario selection dropdown in navigation
- Added comparison mode toggle
- Created ScenarioLegend component with interactive hover/click
- Updated all 5 chart components (AreaChart, TimeLine, Histogram, SegmentBars, GeoBarChart) to support comparison mode
- Implemented scenario color assignment and opacity controls
- Added data merging utilities for overlaid visualizations
- Charts now support displaying 2-4 scenarios simultaneously with highlighting

**Phase 2: Chart Export System** (Partial):
- Created ChartContainer wrapper component
- Implemented export dropdown menu on all charts
- Added exportUtils.ts with 4 export formats:
  - ✅ SVG export (working)
  - ✅ CSV export with metadata headers (working)
  - ✅ JSON export with structured metadata (working)
  - ⚠️ PNG export at 1920x1080 resolution (functional but has rendering issues)

**Files Created** (4):
- `/explorer/src/lib/exportUtils.ts` - Export utilities for all formats
- `/explorer/src/lib/components/shared/ChartContainer.svelte` - Chart wrapper with export menu
- `/explorer/src/lib/components/shared/ScenarioLegend.svelte` - Interactive legend for comparisons
- `/explorer/src/lib/comparisonUtils.ts` - Scenario comparison utilities

**Files Modified** (8):
- All 5 chart components updated for comparison mode and export support
- `/explorer/src/lib/stores/scenario.svelte.ts` - Global scenario state
- `/explorer/src/lib/components/navigation/ScenarioDropdown.svelte` - Scenario selection UI
- `/explorer/src/routes/+page.svelte` - Integrated comparison mode

**Known Issues**:
- PNG export has style preservation problems with LayerChart's multi-SVG rendering
- Some fills/strokes may be incorrect in PNG exports
- Axis labels may have positioning issues in some exports
- Requires further investigation of SVG serialization and Canvas API

**Lessons Learned**:
- LayerChart uses 10+ stacked SVG elements which complicate export
- Need better SVG style serialization (consider modern-screenshot library)
- Scenario comparison requires careful state management to avoid infinite loops
- Opacity and color controls critical for overlaid visualizations

## December 2024 - Comprehensive Cleanup

**Summary**: Removed legacy code, enhanced documentation, added comprehensive tests

**Changes**:
- Removed ~300-400 lines of legacy code
- Enhanced documentation (OpenAPI, README, JSDoc)
- Added comprehensive test suite (18 new tests)
- Standardized on single nested Parquet structure

**Files Modified** (13):
- Explorer: `utilities.ts`, `+page.ts`, `charts/+page.ts`, 5 components
- API: `local-server.js`, `generate-api.js`, `openapi.yaml`, `README.md`
- Generator: `generator_notebook-county.ipynb`

**Files Created** (2):
- `PLANS.md` - Cleanup task planning template
- `/api/tests/integration/demand.test.js` - DuckDB integration tests (15 tests)

**Files Deleted** (1):
- `/explorer/src/lib/components/inline/GrowthSelect.svelte` - Obsolete growth parameter UI

**Testing Updates**:
- Added `/globals` endpoint tests (3 tests covering structure, bounds, metadata)
- Added comprehensive DuckDB query tests (15 tests covering data validation, UNION queries, aggregations, resolutions, performance)
- Updated integration test suite to include new endpoints
- All tests pass with generated data

**Documentation Updates**:
- Enhanced `/globals` endpoint: Added aggregation-specific bounds documentation
- Enhanced `/demand` endpoint: Added data structure, query performance, aggregation behavior docs
- Updated API README: Added nested structure diagram, architecture section, quick start workflow
- Added JSDoc comments: Module-level and function-level documentation in `local-server.js`
- Updated CLAUDE.md: Added cleanup protocol, testing strategy, removed patterns documentation

**Lessons Learned**:
- Always follow three-phase cleanup: Remove → Document → Test
- Feature flags should be removed immediately after migration complete
- Comments should describe current state, not history
- Integration tests for DuckDB queries are critical for data quality assurance

## Removed Legacy Patterns (Do Not Use)

### ❌ Growth Parameters (Replaced by scenarioId)

**Removed**: December 2024
- Old pattern: `growth: 0.02` parameter in queries
- New pattern: `scenarioId: 'housing_electrification=2,...'`
- Files cleaned: `utilities.ts`, `+page.ts`, `GrowthSelect.svelte` (deleted)
- Why removed: Inflexible, didn't support multi-parameter scenarios

### ❌ Structure Feature Flags

**Removed**: December 2024
- Old pattern: `USE_NESTED_STRUCTURE` flag with conditionals
- New pattern: Always use nested structure, no conditionals
- Files cleaned: `generator_notebook-county.ipynb`, `local-server.js`, `generate-api.js`
- Why removed: Migration complete, one structure is standard

### ❌ API_BASE_URL Constants

**Removed**: December 2024
- Old pattern: `const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;`
- New pattern: Use `dataService.ts` functions exclusively
- Files cleaned: 5 Explorer components
- Why removed: Unused, all API calls go through dataService

### ❌ "New vs Legacy" References

**Removed**: December 2024
- Old pattern: Comments about "NEW nested structure" vs "legacy partitioned structure"
- New pattern: One structure, no qualifiers needed
- Files cleaned: All API and generator files
- Why removed: Confusing, no legacy structure exists anymore
