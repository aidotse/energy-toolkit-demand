# Energy Toolkit: Demand

An open framework for generating, serving, and visualizing energy demand forecasts — built to be forked and configured for your own region, segments, and scenarios.

This is a **GitHub template repository**. Click "Use this template" (or clone it) and then point a coding agent at the fresh fork to configure it for your implementation.

> **Status: `v1.0.0-rc1`.** The stack is in place, stripped of the original Sweden-specific implementation, and parameterized. A working multi-geography / multi-segment example with the map widget rendering end-to-end is on the way for the final `v1.0.0` tag.

## What's in the box

```
energy-toolkit-demand/
├── config.yaml         # One source of truth — segments, scenarios, geographies, map, parameters
├── generator/          # Python library for generating segmented demand timeseries
│   ├── library/        # Reusable curve generators (generate_linear, generate_s_curve, …)
│   ├── tests/          # 46 tests for the curves library
│   ├── notebooks/      # Example notebooks (example notebook shipping in v1.0.0)
│   ├── input/          # Per-implementation inputs (geographies, profiles, scenarios)
│   └── CURVES.md       # Reference for the curves library
├── api/                # Node API (DuckDB + Parquet) serving segmented timeseries
├── explorer/           # SvelteKit web app — map, charts, dashboard
└── infrastructure/     # AWS scaffolding for deploys (parameterized, bring your own account)
```

The three components are independent: the generator writes parquet files, the API serves them, the explorer consumes the API.

## Getting started (for implementers)

The fastest path is to open the fresh fork in a coding agent (Claude Code, Cursor, etc.) and ask it to configure the template for your region. See [`CLAUDE.md`](CLAUDE.md) for the framing the agent needs.

Manual path:

1. Copy `.env.example` to `explorer/.env` and fill in a [Mapbox access token](https://account.mapbox.com/access-tokens/). The map widget will not render without one.
2. Edit `config.yaml` — replace the placeholder segments, scenarios, and geographies with your own.
3. Drop a geojson feature collection under `generator/input/` and point `config.yaml`'s `geography.file` at it. Each feature must have a `geo_id` property matching an entry in `geography.geographies`.
4. Author profile CSVs and scenario definitions in `generator/input/`.
5. Run a generator notebook to produce parquet files under `data/base/{scenario}/{segment}/`.
6. `cd api && npm start` — runs the API on port 4010.
7. `cd explorer && npm run dev` — runs the explorer on port 5173.

## Reference implementation

The Swedish electricity demand implementation built for Energimyndigheten lives at [`aidotse/behovskartan`](https://github.com/aidotse/behovskartan) and deploys to [behovskartan.se](https://behovskartan.se). It's the original source of this framework and a good place to see a fully configured implementation.

The family website is at [toolkit.energy](https://toolkit.energy) — source at [`aidotse/energy-toolkit-site`](https://github.com/aidotse/energy-toolkit-site).

## Staying up to date with upstream

If you fork this template, add it as a remote on your implementation to pull framework improvements:

```bash
git remote add upstream https://github.com/aidotse/energy-toolkit-demand.git
git fetch upstream
git log upstream/main ^main                # see what's new
git cherry-pick <sha>                      # or: git merge upstream/main
```

## Licence

See [`LICENSE.md`](LICENSE.md).
