# Scenario Definitions

This folder contains scenario modifiers applied on top of the base Energy Agency data.

## Folder Structure

```
scenarios/
├── numeric_variations/     # Percentage adjustments to totals
│   ├── generate.ipynb      # Notebook creating the variations
│   └── *.parquet           # Pre-computed variation curves
├── flex_scenarios/         # Load redistribution patterns
│   ├── generate.ipynb      # Notebook creating flex patterns
│   └── *.parquet           # Pre-computed flex curves
└── README.md               # This file
```

## Scenario Types

### 1. Numeric Variations

Percentage adjustments to segment totals:

| Scenario | Description | Segments | Adjustment |
|----------|-------------|----------|------------|
| `high_electrification` | Faster EV/heat pump adoption | housing, transport | +15% |
| `low_electrification` | Slower adoption | housing, transport | -15% |
| `accelerated_industry` | Faster industrial transition | industry | +25% |

### 2. Flex Scenarios

Load shifting without changing daily totals:

| Scenario | Description | From Hours | To Hours | Shift % |
|----------|-------------|------------|----------|---------|
| `smart_charging` | EV charging shifted to night | 17-21 | 1-6 | 50% |
| `demand_response` | Peak shaving via DR | 7-8, 17-19 | 10-14 | 20% |

## How Scenarios Work

All scenario modifications are **multiplicative**:

```python
# Numeric variation
adjusted_value = base_value * (1 + percentage)

# Flex scenario (redistributes within day)
reduced_hours = base_value * (1 - shift_pct)  # Peak hours
increased_hours = base_value + shifted_load    # Off-peak hours
```

## Creating New Scenarios

1. Create a notebook in the appropriate subfolder
2. Generate the scenario curve as a parquet file
3. Update the main notebook configuration to use the new scenario

Example curve format:
```python
# Numeric variation curve
# Index: year (2025-2050)
# Columns: segment, adjustment_factor

df = pd.DataFrame({
    'year': range(2025, 2051),
    'segment': 'housing',
    'adjustment_factor': [1.0, 1.01, 1.02, ...]  # Gradual increase
})
```
