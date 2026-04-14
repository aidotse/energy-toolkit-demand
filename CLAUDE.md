# CLAUDE.md — Framework template for coding agents

**You are in `energy-toolkit-demand`, a GitHub template repository.** It is not a finished product. Your job, when a user clones or forks this repo, is to configure it into a working implementation for their specific region, segments, and scenarios.

## What this repo is

A three-part framework for energy demand forecasting:

- **`generator/`** — Python. Produces segmented timeseries organized by scenario, written as Parquet files under `data/base/{scenario_id}/{segment}/` and `data/parameters/{param}/{index}/{segment}/`.
- **`api/`** — Node + DuckDB. Serves the parquet files through an OpenAPI 3.1 interface on port 4010.
- **`explorer/`** — SvelteKit. Web app with a Mapbox-backed choropleth, charts, and dashboard. Port 5173.

Everything the implementer should need to change lives in `config.yaml` at the repo root plus a handful of files under `generator/input/`.

## What an implementer needs you to do

Walk them through (or just do, with their approval) these steps:

1. **Understand their implementation.** Ask: which region? what geographic granularity? which demand segments (housing, industry, transport, …)? what time range? what scenarios do they want to model (e.g., high/mid/low growth, electrification paths)? where does their input data come from?

2. **Configure `config.yaml`**:
   - `name`, `version`, `start`, `end`, `baseResolution`.
   - `segment.values[]` — the demand segments they model.
   - `geography.file` — path to their geojson, and `geography.geographies[]` — the list of regions with `id` matching each feature's `geo_id` property.
   - `map.bounds`, `map.center`, `map.zoom` — the map camera for their region.
   - `scenario.scenarios[]` — their base scenarios.
   - `parameters.definitions` — any growth / flexibility / policy parameters that should layer on top of the base scenarios.

3. **Drop inputs under `generator/input/`**:
   - A geojson feature collection whose features have `geo_id` properties matching the config.
   - Profile CSVs (e.g., `profile_housing.csv`) giving the within-year shape for each segment.
   - Scenario definitions (YAML or notebook) declaring per-region × per-segment base totals and the curves that drive growth.

4. **Write or adapt a generator notebook** under `generator/notebooks/` that:
   - Loads `config.yaml`, the geojson, the profile CSVs, and the scenario definitions.
   - Uses the curve generators from `generator/library/curves.py` (`generate_constant`, `generate_linear`, `generate_exponential_growth`, `generate_s_curve`) to build growth curves.
   - Applies curves × profiles × per-region totals to produce hourly timeseries per segment.
   - Writes partitioned parquet to `data/base/{scenario_id}/{segment}/data.parquet`, matching `generator/partitioning.yaml`.

5. **Regenerate static API endpoints** with `node api/generate-api.js --defaults`. This reads `config.yaml` and the parquet files to produce the static JSON + GeoJSON endpoints the explorer consumes.

6. **Boot locally** — `cd api && npm start` and `cd explorer && npm run dev` — and check the map renders with their regions coloured in.

## Key files you will touch

| File | Purpose |
|---|---|
| `config.yaml` | One source of truth for everything the implementer configures |
| `generator/input/` | Where implementation-specific input data lives |
| `generator/notebooks/` | Where the implementer's generator notebook(s) go |
| `generator/library/curves.py` | Curve generator library — do **not** modify, just call |
| `generator/CURVES.md` | Reference documentation for `curves.py` |
| `generator/partitioning.yaml` | Parquet partitioning scheme — shouldn't need changes |
| `explorer/src/lib/mapConfig.ts` | Default map bounds (reads from `config.yaml` in v1.0+) |
| `explorer/src/content/en/` | Markdown content for pages and reports — replace placeholders |
| `.env.example` | Documents `VITE_MAPBOX_TOKEN` requirement |

## Rules

1. **No interactive setup wizard.** This repo used to have one (`setup/`) and it's been removed. Configure via direct file edits — it's what coding agents are good at.
2. **Never modify `generator/library/curves.py`** — it's the reusable core. If the implementer needs new curve shapes, add a new function there as a proper library addition, with a test in `generator/tests/`.
3. **Keep `config.yaml` as the only place implementation-specific values live.** If you find yourself hardcoding a region name, a bounds box, a style URL, or a segment list anywhere else, push it into `config.yaml` and read it from there.
4. **Preserve the parquet partitioning contract.** The API expects `data/base/{scenario_id}/{segment}/data.parquet` and `data/parameters/{param}/{index}/{segment}/data.parquet`. Changing the shape breaks `api/query-builder.js`.
5. **Mapbox token is a hard dependency** for the map widget. Document it up front; don't hide the requirement.

## Reference implementation

The Swedish electricity demand implementation this framework was extracted from is at [`aidotse/behovskartan`](https://github.com/aidotse/behovskartan). When you're unsure how a fully configured repo looks, check there.

## Known-rough edges in `v1.0.0-rc1`

- Several explorer components still contain Swedish UI strings and comments that weren't stripped. These don't break rendering but an audit grep (`rg -i sweden`) will hit. A v1.0.0 pass will clean these.
- `config.yaml`'s `scenario.scenarios` and `parameters.definitions` are empty in the template — they need real content before the generator can produce anything meaningful.
- No example notebook ships in rc1. The full v1.0.0 will include a hand-authored multi-geography / multi-segment example that boots the map end-to-end.
