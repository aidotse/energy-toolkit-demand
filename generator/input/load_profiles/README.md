# Load Curves

This folder contains normalized hourly load profiles for each segment.

## Expected Files

Each segment needs a parquet file with a normalized hourly profile:

| File | Description | Segments Using |
|------|-------------|----------------|
| `housing.parquet` | Residential electricity profile | housing |
| `services.parquet` | Commercial/services profile | services |
| `industry.parquet` | Industrial base load profile | industry |
| `datacenters.parquet` | Datacenter profile (flat) | datacenters |
| `transport.parquet` | General transport profile | freight_transport |
| `personal_transport.parquet` | EV charging profile | personal_transport |
| `rail.parquet` | Rail transport profile | rail |

## Profile Format

Each profile should be a parquet file with:
- 8760 rows (one per hour of a non-leap year)
- Single column `value` with hourly weights
- Values should sum to 1.0 (normalized)

## How to Create Profiles

Use `generate_profiles.ipynb` to create profiles from historical data:

```python
# Example: Create housing profile from SVK data
import pandas as pd

# Load historical hourly data
historical = pd.read_parquet('historical_demand.parquet')

# Calculate average hourly pattern
profile = historical.groupby(historical['timestamp'].dt.hour)['value'].mean()

# Normalize to sum to 1.0
profile = profile / profile.sum()

# Save
profile.to_parquet('housing.parquet')
```

## Leap Year Handling

Profiles are stored as 8760 hours. The generator handles leap years by:
- Duplicating Feb 28 values for Feb 29
- Re-normalizing to maintain sum of 1.0
