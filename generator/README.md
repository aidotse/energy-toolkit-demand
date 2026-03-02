# Generator

Python application for generating segmented energy demand timeseries organized by scenario.

## Setup

Requires Python 3.10+ with conda:

```bash
conda activate energy-toolkit
pip install -e ".[dev]"
```

### Dependencies

- **duckdb** - In-memory SQL engine for Parquet processing
- **pandas** - Data manipulation and time series
- **pyarrow** - Parquet file I/O
- **numpy** - Numerical computation
- **pyyaml** - Configuration loading

## Architecture

```
generator/
├── library/              # Core library modules
│   ├── curves.py         # Curve generators and utilities (see CURVES.md)
│   └── __init__.py
├── tests/                # Test suite
│   ├── conftest.py       # Shared fixtures
│   └── test_curves.py    # Curve generation tests (46 tests)
└── pyproject.toml        # Project metadata and dependencies
```

## Output Structure

The generator produces Parquet files consumed by the API:

```
/data/
├── base/{scenario-id}/{segment}/data.parquet   # Base scenario data
├── parameters/{param}/{index}/{segment}/data.parquet  # Parameter variants
└── aggregated/*.parquet                        # Pre-computed aggregations
```

## Running Tests

```bash
conda activate energy-toolkit
python -m pytest generator/tests/ -v
python -m pytest generator/tests/ --cov    # With coverage
```

## Key Patterns

- **CurveLike type**: Flexible input accepting Series, DataFrame, dict, or file path
- **Four curve generators**: `generate_constant`, `generate_linear`, `generate_exponential_growth`, `generate_s_curve` — all returning `[curve_id, timestamp, value]` DataFrames
- **Curve utilities**: Load, normalize, validate, and apply curves to demand data
- **DuckDB-first**: All heavy data operations use SQL in notebooks for performance
- **Config-driven**: All parameters defined in `config.yaml`

See [CURVES.md](CURVES.md) for the full curves library reference.
