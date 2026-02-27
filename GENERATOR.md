# Generator Documentation

The generator is a flexible framework for producing electricity demand forecasts. It outputs data in a format consumable by the API and Explorer components.

## Vision

The Generator is a **flexible framework/tool** for creating energy demand forecasts, not a fixed pipeline. Users fork this repo and customize input loaders, scenario definitions, and output formats for their specific forecasting needs.

**Core Principle**: Separate reusable framework code (`generator/library/`, `generator/transformers/`) from project-specific customizations (`generator/input/`, `generator/notebooks/`, `config.yaml`).

## Table of Contents

- [Overview](#overview)
- [Current Architecture](#current-architecture)
- [Output Schema](#output-schema)
- [Configuration](#configuration)
- [Behovskartan 2 Implementation](#behovskartan-2-implementation)
- [Scenario Curve Notebooks](#scenario-curve-notebooks)
- [Library Functions](#library-functions)
- [Creating Custom Notebooks](#creating-custom-notebooks)
- [Testing](#testing)
- [Future Developments](#future-developments)

---

## Overview

The generator transforms input data (annual demand projections, load profiles) into hourly timeseries data structured by:

- **Geography**: Any spatial granularity (countries, regions, counties, municipalities)
- **Segment**: Any demand categorization (housing, transport, industry, etc.)
- **Time**: Any resolution (hourly, daily, weekly) and duration (1 year to 50+ years)
- **Scenario**: Multiple base scenarios and parameter variations

### Design Principles

1. **DuckDB-first**: All heavy operations use SQL for 10-100x performance over pandas
2. **Parquet output**: Compressed, columnar storage for efficient queries
3. **Config-driven**: All parameters defined in `config.yaml`
4. **Segment isolation**: Each segment stored separately for selective loading

---

## Current Architecture

### Canonical Notebook: `behovskartan2.ipynb`

Location: `generator/notebooks/behovskartan2.ipynb`

This notebook implements a DuckDB pipeline:

```
Input Sources                    Processing                      Output
─────────────────               ─────────────                   ───────
annual_demand.duckdb  ──┐
                        ├──►  DuckDB SQL  ──►  hourly_demand  ──►  Parquet files
load_profiles/*.csv   ──┘     Operations       (in-memory)
load_profiles/*.json  ──┘
```

### Pipeline Steps

1. **Load** annual demand from DuckDB (scenarios × segments × geographies × years)
2. **Aggregate** sub-segments if needed (e.g., transport_cars + transport_trucks → transport)
3. **Create** profile lookup tables (year-based CSVs or pattern-based JSONs)
4. **Generate** timestamp backbone using `generate_series()` (2025-2050 = 228k hours)
5. **Extend** profiles via SQL JOINs with weekday-aware matching
6. **Add noise** and normalize profiles per (segment, year) - guarantees exact annual totals
7. **Join** normalized profiles with annual demand
8. **Write** segmented parquet files

### Output Structure

```
data/
├── base/                              # Base scenarios (segmented)
│   └── {scenario_id}/                 # e.g. current-policy/
│       ├── housing/data.parquet       # ~33 MB per segment
│       ├── transport/data.parquet
│       ├── industry/data.parquet
│       ├── services/data.parquet
│       └── datacenters/data.parquet
│
├── parameters/                        # Independent parameter variations
│   └── {parameter_name}/
│       └── {index}/
│           └── {segment}/data.parquet
│
├── scenarios/                         # Parametric scenario files
│   └── {scenario_name}/data.parquet
│
└── aggregated/                        # Pre-aggregated for fast queries
    ├── geography_yearly.parquet
    ├── segment_yearly.parquet
    └── national_yearly.parquet
```

---

## Output Schema

All output files follow the canonical schema:

| Column | Type | Description |
|--------|------|-------------|
| `timestamp` | TIMESTAMP | Hourly timestamp (UTC) |
| `value` | DOUBLE | Demand value (GWh) |
| `geography` | VARCHAR | Geography ID (e.g., '01' for Stockholm) |
| `segment` | VARCHAR | Segment name (e.g., 'housing') |
| `scenario_id` | VARCHAR | Scenario identifier (optional in parameter files) |

### Example Query

```sql
SELECT * FROM read_parquet('data/base/current-policy/housing/data.parquet')
LIMIT 5;

-- timestamp                  value        geography  segment  scenario_id
-- 2025-01-01 00:00:00        0.00234      01         housing  current-policy
-- 2025-01-01 01:00:00        0.00221      01         housing  current-policy
-- ...
```

---

## Configuration

All generator settings are in `/config.yaml`.

### Core Settings

```yaml
# Project metadata
name: behovskartan2
version: 0.1.0

# Time range
start: '2025-01-01T00:00:00Z'
end: '2050-12-31T23:00:00Z'
baseResolution: 1h              # Hourly data
baseAggregation: mean           # Default aggregation method
```

### Segments

Define any segmentation scheme:

```yaml
segment:
  description: Segments
  values:
    - name: housing
      label: Housing
    - name: transport
      label: Transport
    - name: industry
      label: Industry
    # Add any segments needed
```

### Geographies

Define any geographic granularity:

```yaml
geography:
  file: generator/input/geographies/sweden-counties.geojson
  geographies:
    - id: '01'
      name: Stockholms län
      type: county
    - id: '03'
      name: Uppsala län
      type: county
    # Can be countries, municipalities, grid cells, etc.
```

### Generator Settings

```yaml
generator:
  rowGroupSize: 100000          # Parquet row group size
  partitionKeys:                # Partition columns
    - scenario_id
    - geography
    - segment
    - timestamp_year
  profiles:
    noise_amplitude: 0.02       # ±2% random variation
    noise_seed: 42              # Reproducibility
```

### Parameters (Strategy 2)

Independent parameters for scenario exploration:

```yaml
parameters:
  strategy: 2                   # Independent parameter strategy
  baseScenario: current-policy

  definitions:
    housing_growth:
      type: independent
      description: "Housing demand growth rate"
      segments: [housing]       # Which segments are affected
      geographies: all          # 'all' or list of IDs
      how: multiply             # 'multiply' or 'add'
      values:
        - index: 0
          label: "Baseline"
          curve: null           # No file = use base data
        - index: 1
          label: "Low"
          curve:
            file: generator/input/scenarios/housing_growth/curves.parquet
            filter: "index == 1"
        - index: 2
          label: "Medium"
          curve:
            file: generator/input/scenarios/housing_growth/curves.parquet
            filter: "index == 2"
```

---

## Behovskartan 2 Implementation

This section documents the specific implementation for the Behovskartan 2 project.

### Input Data: Energy Agency Excel

**File**: `generator/input/energy_agency_scenarios/framtida-elbehov-pa-lansniva.xlsx`

| Property | Value |
|----------|-------|
| Sheet | `Elbehov_Siffror` |
| Rows | 4914 |
| Scenarios | 3 (Beslutad politik, Internationell Tillväxt, Lokal Miljöhänsyn) |
| Counties | 21 Swedish counties |
| Years | 5-year intervals (2025, 2030, 2035, 2040, 2045, 2050) |

### Segment Mapping

Map Energy Agency segments to load curves:

| Excel Segment (Level 1) | Excel Segment (Level 2) | Load Curve |
|-------------------------|-------------------------|------------|
| Bostäder | * | housing |
| Service | * | services |
| Industri | Traditional | industry |
| Industri | Datacenter | datacenters |
| Transport | Personbilar | personal_transport |
| Transport | Godstransport | transport |
| Transport | Järnväg | rail |

### Generated Data Summary

```
data/base/
├── current-policy/           (~165 MB per scenario)
├── local-environment/
└── international-growth/

Total: 71,789,760 rows
- 3 base scenarios
- 5 segments (housing, services, industry, transport, datacenters)
- 21 counties
- 26 years (2025-2050)
- ~8,760 hours/year
```

---

## Scenario Curve Notebooks

Curve files define how parameters modify the base scenario data. Each parameter references a `curves.parquet` file containing multipliers indexed by scenario variant.

### Location

```
generator/input/scenarios/
├── housing_growth/
│   ├── generate_curves.ipynb    # Run to regenerate
│   └── curves.parquet           # [timestamp, index, value]
├── housing_flex/
│   ├── generate_curves.ipynb
│   └── curves.parquet
├── transport_growth/
│   └── ...
└── [segment]_[type]/
    └── ...
```

### Growth Curves

Growth curves apply S-curve (logistic) transitions to simulate gradual demand changes.

**Key characteristics:**
- Independent of base data
- Starts at 1.0 (no change) in 2025
- Transitions smoothly to target by 2050
- Supports both growth (>1.0) and decline (<1.0)

**Configuration in `generate_curves.ipynb`:**

```python
SEGMENT = "housing"
SCENARIOS = [
    # (index, end_value, label)
    (1, 0.85, "Low (-15%)"),      # 15% decline by 2050
    (2, 0.95, "Slight Decline"),   # 5% decline
    (3, 1.05, "Slight Growth"),    # 5% growth
    (4, 1.15, "High (+15%)"),      # 15% growth
]
```

**S-curve formula:**
```python
progress = 1 / (1 + exp(-steepness * (t - midpoint)))
value = 1.0 + (end_value - 1.0) * progress
```

### Flex Curves

Flex (demand response) curves flatten the demand profile while preserving totals.

**Key characteristics:**
- Derived FROM base scenario data
- Lower peaks (multiplier < 1 when demand > mean)
- Raise valleys (multiplier > 1 when demand < mean)
- Mathematically guarantees yearly totals are preserved

**Configuration in `generate_curves.ipynb`:**

```python
SEGMENT = "housing"
BASE_SCENARIO = "current-policy"
SCENARIOS = [
    # (index, flex_factor, label)
    # flex_factor: 1.0 = no change, 0.0 = completely flat
    (1, 0.8, "Low Flex (20% flattening)"),
    (2, 0.6, "High Flex (40% flattening)"),
]
```

**Flex formula:**
```python
# For each timestamp
new_value = yearly_mean + flex_factor * (original_value - yearly_mean)
multiplier = new_value / original_value
```

**Note:** The current implementation computes flex multipliers from the national profile (sum across all geographies). The same multipliers apply to all geographies.

### Alternative Flex Approaches

The flex curve notebooks use a data-derived approach, but you can generate flex curves any way you prefer:

1. **Constant multipliers**: Fixed flattening regardless of profile shape
2. **Time-of-day based**: Different multipliers for peak hours (e.g., 17:00-20:00)
3. **Price-signal based**: Multipliers derived from electricity price forecasts
4. **External models**: Import curves from other demand response models

As long as the output is `curves.parquet` with columns `[timestamp, index, value]`, it will work with the parameter system.

### Curve File Validation

The main generator notebook (`behovskartan2.ipynb`) validates that all required curve files exist before processing parameters. If files are missing, it provides clear error messages.

**To disable validation** (e.g., if you don't use dynamically-generated flex curves):

In `behovskartan2.ipynb`, find the validation cell (after config loading, before parameter generation) and either:

1. **Skip the cell**: Don't run it (manual execution)
2. **Comment out the raise**: Keep warnings but continue:
   ```python
   if missing_files:
       print("WARNING: Missing curve files (continuing anyway)")
       # raise FileNotFoundError(...)  # Commented out
   ```
3. **Remove flex parameters**: Edit `config.yaml` to remove `*_flex` parameter definitions

### Running Curve Generation

```bash
# Generate all growth curves (independent of base data)
cd generator/input/scenarios/housing_growth && jupyter execute generate_curves.ipynb

# Generate flex curves (requires base data to exist first)
# Run behovskartan2.ipynb up to base generation, then:
cd generator/input/scenarios/housing_flex && jupyter execute generate_curves.ipynb
```

**Execution order:**
1. Run `behovskartan2.ipynb` to generate base scenarios
2. Run all `*_flex/generate_curves.ipynb` notebooks (they read from base output)
3. Run `behovskartan2.ipynb` again to generate parameter variations

---

## Library Functions

The `generator/library/` directory contains reusable functions.

### curves.py - Curve Generation

```python
from generator.library.curves import generate_s_curve, generate_exponential_growth

# S-curve (logistic transition)
curve = generate_s_curve(
    curve_id="electrification",
    start_year=2025,
    end_year=2050,
    y0=0.1,                    # Starting value
    y1=0.9,                    # Ending value
    resolution="1h",           # Time resolution
    midpoint="2035-01-01",     # Transition midpoint
    steepness="5y"             # 90% transition in 5 years
)
# Returns: DataFrame with [curve_id, timestamp, value]

# Exponential growth
curve = generate_exponential_growth(
    curve_id="base_growth",
    start_year=2025,
    end_year=2050,
    resolution="1h",
    annual_growth=0.02         # 2% per year
)
# Returns: DataFrame with [curve_id, timestamp, value]
```

### parameters.py - Parameter Processing

```python
from generator.library.parameters import (
    load_parameter_config,
    get_parameter_definitions,
    generate_growth_curves,
    generate_flex_curves,
    create_all_curve_files,
    process_independent_parameter,
    process_all_parameters
)

# Load parameter config
config = load_parameter_config('config.yaml')

# Generate curve files for all segments
files = create_all_curve_files(
    base_dir='generator/input/scenarios',
    segments=['housing', 'transport', 'industry'],
    start_year=2025,
    end_year=2050
)

# Process all parameters (generates output files)
stats = process_all_parameters(
    con=duckdb_connection,
    config_path='config.yaml',
    base_scenario_name='current-policy',
    base_dir='data/base',
    output_dir='data/parameters'
)
```

### loaders.py - Data Loading

```python
from generator.library.loaders import base_loader_csv

# Load and validate CSV to DuckDB
result = base_loader_csv(
    base_schema=['geography', 'segment', 'timestamp', 'value'],
    base_schema_map={
        'geography': 'region_code',
        'segment': 'sector',
        'timestamp': 'datetime',
        'value': 'demand_gwh'
    },
    base_data='input/raw_data.csv',
    output_path='input/processed.duckdb'
)
# Returns: {'target', 'table', 'added_rows', 'added_columns'}
```

### growth.py - Growth Time Series

```python
from generator.library.growth import generate_growth_time_series

factors = generate_growth_time_series(
    timestamps=pd.date_range('2025-01-01', '2050-12-31', freq='h'),
    resolution='1h',
    scenario={'type': 'exp-growth-to-target', 'target': 1.5}
)
# Returns: numpy array of growth factors
```

---

## Creating Custom Notebooks

### Minimal Structure

Every generator notebook should follow this structure:

```python
# Cell 1: Configuration
import duckdb
from pathlib import Path

GENERATOR_PATH = Path.cwd().parent
INPUT_PATH = GENERATOR_PATH / 'input'
OUTPUT_PATH = GENERATOR_PATH / 'output'

CONFIG = {
    'start_year': 2025,
    'end_year': 2050,
    'compression': 'zstd',
}

# Cell 2: Connect to DuckDB
con = duckdb.connect(':memory:')

# Cell 3: Load your input data
# (annual demand, load profiles, or any source data)
con.execute(f"ATTACH '{INPUT_PATH}/my_data.duckdb' AS source")

# Cell 4-N: Transform data
# Use SQL for performance:
con.execute("""
    CREATE TABLE hourly_demand AS
    SELECT
        timestamp,
        value,
        geography,
        segment,
        scenario
    FROM source.annual_demand a
    JOIN extended_profiles p ON a.segment = p.segment
""")

# Final Cell: Write output
# Must produce files matching the canonical schema
for segment in ['housing', 'transport']:
    con.execute(f"""
        COPY (
            SELECT timestamp, value, geography, segment, scenario as scenario_id
            FROM hourly_demand
            WHERE segment = '{segment}'
        )
        TO '{OUTPUT_PATH}/base/MyScenario/{segment}/data.parquet'
        (FORMAT PARQUET, COMPRESSION ZSTD)
    """)
```

### Required Output Format

Your notebook MUST produce parquet files with these columns:

| Column | Required | Notes |
|--------|----------|-------|
| `timestamp` | Yes | TIMESTAMP type, hourly or coarser |
| `value` | Yes | DOUBLE, the demand value |
| `geography` | Yes | VARCHAR, matches config geography IDs |
| `segment` | Yes | VARCHAR, matches config segment names |
| `scenario_id` | Recommended | VARCHAR, for base scenarios |

### Flexibility Options

**Any time resolution:**
```python
# Hourly (default)
pd.date_range(start, end, freq='1h')

# Daily
pd.date_range(start, end, freq='1D')

# Weekly
pd.date_range(start, end, freq='1W')
```

**Any time duration:**
```python
CONFIG = {
    'start_year': 2020,  # Historical data
    'end_year': 2100,    # Long-term projections
}
```

**Any geography:**
```python
# Countries
geographies = ['SE', 'NO', 'DK', 'FI']

# Municipalities (290 Swedish municipalities)
geographies = ['0114', '0115', ...]

# Grid cells
geographies = ['N55E12', 'N55E13', ...]
```

**Any segmentation:**
```python
# Simple
segments = ['residential', 'commercial', 'industrial']

# Detailed
segments = [
    'residential_heating', 'residential_cooling', 'residential_appliances',
    'commercial_office', 'commercial_retail',
    'industrial_heavy', 'industrial_light'
]
```

---

## Testing

### Unit Tests

```python
def test_interpolation_preserves_endpoints():
    """Interpolated values at source years match original."""

def test_profile_sums_to_one():
    """All load curves sum to 1.0 over 8760 hours."""

def test_hourly_sum_equals_annual():
    """Sum of hourly values equals annual total."""

def test_flex_preserves_daily_total():
    """Flex scenarios don't change daily energy totals."""
```

### Integration Tests

```python
def test_full_pipeline():
    """Run complete pipeline and verify output structure."""

def test_api_compatibility():
    """Generated data works with existing API server."""
```

### Validation Notebook

Use `generator/notebooks/verify_output.ipynb` to validate generated data:
- Annual totals match input data
- All required columns present
- No null values in required fields
- Geographic IDs match config

---

## Future Developments

### Parameter Strategies

Three strategies for scenario parameter handling:

| Strategy | Description | Storage | Query Time |
|----------|-------------|---------|------------|
| **1: Precomputed** | All combinations pre-generated | High (N^M files) | Fast |
| **2: Independent** | Parameters stored separately, combined at query | Medium | Medium |
| **3: Query-time** | Only curves stored, applied at query | Low | Slower |

Currently implementing **Strategy 2** (independent parameters).

### Planned Features

1. **Geography-specific parameters**: Different curves per region
   ```yaml
   parameters:
     regional_growth:
       geographies: per_geography
       geography_curves:
         '01': {file: stockholm_growth.parquet}
         '25': {file: norrbotten_growth.parquet}
   ```

2. **Multi-segment parameters**: One parameter affecting multiple segments
   ```yaml
   parameters:
     population:
       segments: [housing, services]  # Affects both
   ```

3. **Dependent combinations**: Pre-defined parameter bundles
   ```yaml
   combinations:
     green_transition:
       housing_growth: 2
       transport_electrification: 3
       industry_flex: 1
   ```

4. **Alternative base scenarios**: Switch between Energy Agency projections
   ```yaml
   parameters:
     baseScenario: international-growth  # or local-environment
   ```

### Output Path Evolution

Current structure prioritizes segment visibility:

```
parameters/{parameter}/{index}/{segment}/data.parquet
```

This makes it immediately clear which segments are affected by listing the directory.

---

## Validation

After generating data, validate:

```python
# Check annual totals are preserved
mismatches = con.execute("""
    WITH hourly_sums AS (
        SELECT segment, geography, EXTRACT(YEAR FROM timestamp) as year,
               SUM(value) as hourly_sum
        FROM hourly_demand
        GROUP BY segment, geography, year
    )
    SELECT COUNT(*) FROM hourly_sums h
    JOIN annual_demand a USING (segment, geography, year)
    WHERE ABS(h.hourly_sum - a.value) > 0.0001
""").fetchone()[0]
assert mismatches == 0, "Annual totals not preserved!"

# Check schema
result = con.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'hourly_demand'
""").fetchall()
required = {'timestamp', 'value', 'geography', 'segment'}
assert required <= {r[0] for r in result}, "Missing required columns!"
```

---

## Performance Tips

1. **Use SQL over Python** for transformations (10-100x faster)
2. **Avoid pandas for large operations** - use DuckDB's native parquet reading
3. **Partition by scenario/geography/segment** for selective loading
4. **Use ZSTD compression** (best ratio for this data type)
5. **Set reproducible random seeds** for noise operations

---

## Quick Reference

| Task | File/Command |
|------|--------------|
| Run canonical notebook | `generator/notebooks/behovskartan2.ipynb` |
| Configuration | `/config.yaml` |
| Library functions | `generator/library/*.py` |
| Input data | `generator/input/` |
| Output data | `/data/` |
| Curve files | `generator/input/scenarios/{param}/curves.parquet` |
| Growth curve notebooks | `generator/input/scenarios/{segment}_growth/generate_curves.ipynb` |
| Flex curve notebooks | `generator/input/scenarios/{segment}_flex/generate_curves.ipynb` |
| Disable curve validation | Comment out `raise` in validation cell of `behovskartan2.ipynb` |
