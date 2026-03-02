# Curves Library Reference

The curves library (`generator/library/curves.py`) provides functions for generating and working with time-indexed value curves. These curves are the building blocks for scenario modelling — they define how a quantity changes over time.

## Generators

All generators return a DataFrame with columns `[curve_id, timestamp, value]`.

### `generate_constant`

```python
generate_constant(curve_id, start_year, end_year, value, resolution='1h')
```

Flat curve at a fixed value. Use for baseline "no change" scenarios.

| Parameter | Type | Description |
|-----------|------|-------------|
| `curve_id` | str | Identifier stored in every row |
| `start_year` | int | First year (inclusive) |
| `end_year` | int | Last year (inclusive) |
| `value` | float | Constant value at every timestamp |
| `resolution` | str | Pandas frequency string (default `'1h'`) |

**Formula**: `y(t) = value` for all `t`

```python
df = generate_constant("baseline", 2025, 2050, 1.0)
```

### `generate_linear`

```python
generate_linear(curve_id, start_year, end_year, y0, y1, resolution='1h')
```

Linear interpolation from `y0` to `y1`. Use for constant-rate policy phase-ins.

| Parameter | Type | Description |
|-----------|------|-------------|
| `curve_id` | str | Identifier stored in every row |
| `start_year` | int | First year (inclusive) |
| `end_year` | int | Last year (inclusive) |
| `y0` | float | Value at start |
| `y1` | float | Value at end |
| `resolution` | str | Pandas frequency string (default `'1h'`) |

**Formula**: `y(t) = y0 + (y1 - y0) * t / T`

```python
df = generate_linear("ramp", 2025, 2050, 1.0, 1.5)
```

### `generate_exponential_growth`

```python
generate_exponential_growth(
    curve_id, start_year, end_year,
    y0=1.0, y1=None, resolution='1h', annual_growth=None
)
```

Smooth exponential growth curve. Two mutually exclusive interfaces:

- **Endpoint mode** (`y0` + `y1`): derive the rate from the endpoints
- **Rate mode** (`annual_growth`): compound at a fixed annual rate from `y0`

| Parameter | Type | Description |
|-----------|------|-------------|
| `curve_id` | str | Identifier stored in every row |
| `start_year` | int | First year (inclusive) |
| `end_year` | int | Last year (inclusive) |
| `y0` | float | Starting value (default 1.0) |
| `y1` | float or None | Ending value (endpoint mode) |
| `resolution` | str | Pandas frequency string (default `'1h'`) |
| `annual_growth` | float or None | Fractional growth per year (rate mode) |

Exactly one of `y1` or `annual_growth` is required.

**Formula (rate mode)**: `y(t) = y0 * (1 + annual_growth) ^ t`

**Formula (endpoint mode)**: `y(t) = y0 * (y1/y0) ^ (t/T)`

```python
# Rate mode (2% annual growth)
df = generate_exponential_growth("g", 2025, 2050, annual_growth=0.02)

# Endpoint mode (from 100 to 150)
df = generate_exponential_growth("g", 2025, 2050, y0=100, y1=150)
```

### `generate_s_curve`

```python
generate_s_curve(
    curve_id, start_year, end_year, y0, y1,
    resolution='1h', midpoint=None, steepness=10.0
)
```

Logistic S-curve transitioning from `y0` to `y1`. The primary curve shape used for scenario growth and decline modelling.

| Parameter | Type | Description |
|-----------|------|-------------|
| `curve_id` | str | Identifier stored in every row |
| `start_year` | int | First year (inclusive) |
| `end_year` | int | Last year (inclusive) |
| `y0` | float | Value at start |
| `y1` | float | Value at end |
| `resolution` | str | Pandas frequency string (default `'1h'`) |
| `midpoint` | str or None | ISO timestamp for inflection point |
| `steepness` | float or str | Raw multiplier, or `'5y'` for transition window |

**Formula**: `y(t) = y0 + (y1 - y0) / (1 + exp(-steepness * (t - midpoint) / T))`

When `steepness` is given as `'Ny'` (e.g. `'5y'`), ~90% of the transition happens within N years.

```python
df = generate_s_curve("electrification", 2025, 2050, 0.1, 0.9, steepness="5y")
```

## Utilities

### `apply_growth_curve_to_value`

```python
apply_growth_curve_to_value(df, curve_df, *, how='multiply', target_col='value')
```

Join a curve onto a DataFrame by timestamp and apply it (multiply or add). The `curve_df` must contain `timestamp` and `value` columns; extra columns (like `curve_id`) are allowed and ignored.

### `load_curve`

```python
load_curve(curve: CurveLike) -> Series | DataFrame | dict
```

Load a curve from any supported input: Series, DataFrame, dict, or file path (`.parquet`, `.csv`). Returns the same object for in-memory inputs; a DataFrame for files.

### `curve_to_series`

```python
curve_to_series(curve_obj, *, name='value') -> pd.Series
```

Normalize any in-memory curve into a timestamp-indexed Series. Accepts Series, DataFrame (with `timestamp` + `value`/`factor`/`multiplier` columns), or dict.

### `load_and_prepare_curve`

```python
load_and_prepare_curve(curve: CurveLike) -> pd.Series
```

Convenience wrapper: `load_curve` then `curve_to_series` in one call.

### `validate_curve_alignment`

```python
validate_curve_alignment(curve, *, data_index, required_min=None, required_max=None, require_complete_cover=True)
```

Validate that a curve Series covers a target DatetimeIndex. Raises `ValueError` on coverage gaps or bound violations.

### `map_curve_to_values`

```python
map_curve_to_values(timestamps, curve, *, on_missing='error') -> pd.Series
```

Map a curve onto a vector of timestamps. `on_missing` controls gap handling: `'error'` (default), `'ffill'`, `'bfill'`, or `'nearest'`.

## Types

### `CurveLike`

Type alias for anything that can represent a curve:

```python
CurveLike = Union[
    pd.Series,                                    # index=DatetimeIndex, values=factors
    pd.DataFrame,                                 # columns: timestamp + value/factor/multiplier
    Mapping[Union[str, pd.Timestamp], float],      # timestamp -> factor
    str,                                           # file path
    Path,                                          # file path
]
```

## Output Format

All generators produce DataFrames with this schema:

| Column | Type | Description |
|--------|------|-------------|
| `curve_id` | str | Curve identifier |
| `timestamp` | Timestamp | Time point |
| `value` | float | Curve value at that time |

## Common Patterns

### Creating multiplier curves for scenarios

```python
from generator.library.curves import generate_s_curve

# Growth curve: starts at 1.0 (no change), transitions to 1.15 (+15%)
curve = generate_s_curve("housing_high", 2025, 2050, y0=1.0, y1=1.15)
curve.to_parquet("curves.parquet", index=False)
```

### Loading and applying curves

```python
from generator.library.curves import load_and_prepare_curve, apply_growth_curve_to_value

# Load from file
curve_series = load_and_prepare_curve("curves.parquet")

# Apply to demand data
adjusted = apply_growth_curve_to_value(demand_df, curve_df, how="multiply")
```

### Validation workflow

```python
from generator.library.curves import validate_curve_alignment, map_curve_to_values

# Validate coverage
validate_curve_alignment(curve_series, data_index=demand_df["timestamp"])

# Map with gap handling
factors = map_curve_to_values(demand_df["timestamp"], curve_series, on_missing="ffill")
```
