# Debugging Guide

## Common Issues and Solutions

### API Flood (too many requests)

- ❌ Problem: Components wrapped in `$state()` causing undefined initial values
- ✅ Solution: Only wrap individual reactive values, not entire data objects
- ❌ Bad: `let { hourData, dayData } = $state(data)`
- ✅ Good: `const { hourData, dayData } = data; let geography = $state(data.geography)`

### Wrong Map Bounds

- ❌ Problem: Using raw data bounds (-20.41 to 12497) for yearly geography totals
- ✅ Solution: Use `globals.bounds.map_yearly_geography` for map color scaling
- Check: `/explorer/src/routes/+page.ts` line 92-95

### No Data Shown in Components

- ❌ Problem: API response format mismatch
- ✅ Solution: Verify API returns `{ period, value }` and components transform to `{ timestamp, total }`
- Check: Data transformation in component `$derived()` blocks

### 500 Internal Server Errors

- ❌ Problem: Requested time range outside data bounds (2025-2050)
- ✅ Solution: Verify year parameters in component queries
- ❌ Problem: Using undefined parameters in API calls
- ✅ Solution: Check all query parameters are defined before API call

### Components Not Displaying Data

- ❌ Problem: Hybrid loading not working correctly
- ✅ Solution: Components should check `if (!propData || propData.length === 0)` before fetching
- Check: `$effect()` blocks in components have proper conditions

### SvelteKit Fetch Warnings

- ❌ Problem: Using `window.fetch` in page loaders instead of SvelteKit's fetch
- ✅ Solution: Pass `fetch` parameter from page loader to `dataService` functions
- Check: All `+page.ts` files should pass `fetch` to data service calls

## Development Workflow for Debugging

1. **Start API server**: `cd api && npm start`
2. **Start Explorer**: `cd explorer && npm run dev`
3. **Make changes**: Edit files, server auto-reloads
4. **Regenerate endpoints**: `node generate-api.js --defaults` (if config changes)
5. **Test API**: `curl http://localhost:4010/globals`
6. **Debug**: Check browser dev tools Network tab for API calls
7. **Kill processes**: `pkill -f "local-server"` when done

### Vite / Svelte Plugin Version Mismatch

- **Problem**: `@sveltejs/vite-plugin-svelte` v6 requires Vite 6, but the project uses Vite 5
- **Symptom**: Tests that import Svelte components fail with `server.environments` error
- **Solution**: Upgrade Vite to v6 or pin `@sveltejs/vite-plugin-svelte` to v5
- **Workaround**: Pure TypeScript tests (utilities, comparisonUtils) run fine; only component tests are affected

### Silent API Errors in Explorer

- **Problem**: `fetchConfig()`, `fetchScenarios()`, etc. returned fallback data on error — components couldn't tell "no data" from "fetch failed"
- **Solution**: These functions now return `FetchResult<T>` with `{ data, error? }`. Call sites destructure with `const { data: config } = await fetchConfig(fetch)`
- **Check**: If a component shows fallback data unexpectedly, check the `error` field on the FetchResult

### Generator Tests Not Found

- **Problem**: `python -m pytest` can't find generator tests
- **Solution**: Use the conda environment: `conda run -n energy-toolkit python -m pytest generator/tests/ -v`
- **Check**: Ensure `pyproject.toml` has `pythonpath = [".."]` in `[tool.pytest.ini_options]`

### Deprecated Pandas Warning in Generator

- **Problem**: `FutureWarning: fillna with method is deprecated` in curves.py
- **Solution**: Already fixed — uses `.ffill()` / `.bfill()` instead of `fillna(method=...)`

## Running Commands

- Make sure you kill already running npm commands (npm run dev or npm run start etc.) before starting new ones
- Always shut down background API and Explorer after completing a task
