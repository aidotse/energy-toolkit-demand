# Development Best Practices

## Post-Task Cleanup Protocol

After completing major features or refactoring tasks, ALWAYS follow this three-phase cleanup protocol:

### Phase 1: Legacy Code Removal

1. **Search for obsolete patterns**: Use `grep -r "pattern" .` to find legacy code
2. **Common legacy patterns to remove**:
   - Old parameter systems (e.g., growth parameters replaced by scenarioId)
   - Feature flags (e.g., USE_NESTED_STRUCTURE after migration complete)
   - "New vs old" structure references in comments
   - Unused constants and imports
   - Deleted component references
3. **Verification**:
   - Run linter: `npm run lint`
   - Check for TypeScript errors: `npm run type-check`
   - Search for TODOs: `grep -r "TODO" src/`

### Phase 2: Documentation Updates

1. **Always update these files after codebase changes**:
   - `CLAUDE.md` - Project documentation and patterns
   - `README.md` (in changed modules) - User-facing documentation
   - `openapi.yaml` - API specification updates
   - JSDoc comments - Function-level documentation
2. **Documentation checklist**:
   - [ ] Update API endpoint documentation if endpoints changed
   - [ ] Update data structure diagrams if schema changed
   - [ ] Add examples for new features
   - [ ] Update file path references if files moved
   - [ ] Document new patterns or anti-patterns discovered

### Phase 3: Testing Updates

1. **Always check and update tests after changes**:
   - Unit tests: `/api/tests/unit/*.test.js`
   - Integration tests: `/api/tests/integration/*.test.js`
   - Run tests: `npm test`
   - Coverage report: `npm run test:coverage`
2. **Test update guidelines**:
   - Add tests for new features
   - Update tests for changed behavior
   - Remove tests for deleted features
   - Add integration tests for new API endpoints
   - Test error conditions and edge cases

## Cleanup Task Workflow

When asked to "clean up the codebase" or after completing major features:

1. **Create a cleanup plan** (write to `PLANS.md`):
   - List all legacy code to remove
   - List all documentation to update
   - List all tests to add/update

2. **Execute systematically**:
   - Complete Phase 1 fully before Phase 2
   - Mark tasks as completed in todo list
   - Verify each change doesn't break functionality
   - Keep API and Explorer running during cleanup to catch errors

3. **Verify completion**:
   - Run all tests: `npm test`
   - Check all changed files compile/lint
   - Verify documentation is accurate
   - Test API endpoints manually if changed

## Code Organization Principles

### Single Source of Truth

- **Never duplicate code**: Extract shared logic to utilities
- **Configuration in one place**: All config in `/config.yaml`
- **Data structure is definitive**: Nested Parquet structure is the only structure
  - No "new vs old" or "legacy vs current" distinctions
  - Remove feature flags once migration complete

### Clean Architecture

- **Components should do one thing**: Split large components
- **No magic constants**: Use config or calculate dynamically
- **Clear data flow**: Props down, events up (Svelte) or fetch internally with loading states
- **Explicit over implicit**: Prefer verbose but clear code

### File Naming and Location

- **Tests mirror source structure**: `/api/local-server.js` → `/api/tests/integration/server.test.js`
- **Integration tests for endpoints**: Each major endpoint gets its own test file
- **Utilities are shared**: Place in `/lib/utilities.ts` or `/api/utils.js`
- **No orphaned files**: Delete unused components and utilities

## Testing Strategy

### Test File Locations

- **API Unit Tests**: `/api/tests/unit/`
  - `utils.test.js` - Utility function tests (parsePeriod, formatPeriod)
  - `config.test.js` - Configuration loading tests
  - `endpoints.test.js` - Static endpoint generation tests
  - `query-builder.test.js` - SQL query builder and input sanitization tests
  - `cache.test.js` - LRU cache behavior tests
- **API Integration Tests**: `/api/tests/integration/`
  - `server.test.js` - Server and static endpoint tests
  - `demand.test.js` - DuckDB query and /demand endpoint tests (requires data files)
- **Generator Tests**: `/generator/tests/`
  - `test_curves.py` - S-curve, exponential growth, curve loading and validation
  - `test_utilities.py` - Path generation, parameter handling, config helpers
  - `test_db.py` - Parquet scaffold read/write, DuckDB operations
  - Run with: `conda run -n energy-toolkit python -m pytest generator/tests/ -v`
- **Explorer Tests**: `/explorer/src/lib/`
  - `utilities.test.ts` - formatNumber, getGeos, makeDemandQuery
  - `comparisonUtils.test.ts` - Scenario comparison, color assignment, data merging
  - `stores/parameterStore.test.ts` - Parameter store state management
  - Component tests co-located with components (e.g., `AreaChart.test.ts`)

### Test Coverage Requirements

- **Critical paths**: 100% coverage for data transformation, API queries
- **Happy paths**: All major user workflows tested
- **Error handling**: Test 404s, 500s, validation errors
- **Edge cases**: Empty data, boundary conditions, invalid inputs

### Running Tests

```bash
# API tests
cd api
npm test                    # Run all tests
npm run test:coverage       # With coverage report
npm run test:watch          # Watch mode for development

# Generator tests
conda run -n energy-toolkit python -m pytest generator/tests/ -v
conda run -n energy-toolkit python -m pytest generator/tests/ --cov  # With coverage

# Explorer tests
cd explorer
npx vitest run              # Run all tests
npx vitest run --coverage   # With coverage report
```
