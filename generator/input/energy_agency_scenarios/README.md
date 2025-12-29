# Energy Agency Scenarios

This folder contains the Swedish Energy Agency's future electricity demand data and the processing notebook.

## Source Data

**File:** `framtida-elbehov-pa-lansniva.xlsx`
**Source:** Swedish Energy Agency (Energimyndigheten)
**Title:** Future electricity demand by county ("Framtida elbehov på länsnivå")

### Excel Structure

- **Sheet:** `Elbehov_Siffror`
- **Table:** `Tabell3` (starts on row 2)
- **Rows:** ~4914

### Columns

| Column | Swedish Name | Description |
|--------|--------------|-------------|
| `Scenario` | Scenario | Scenario name (e.g., "Beslutad politik") |
| `Sektor nivå 1` | Sector Level 1 | Top-level sector category |
| `Sektor nivå 2` | Sector Level 2 | Detailed sector breakdown |
| `År` | Year | Year (5-year intervals: 2025-2050) |
| `Län` | County | Swedish county name |
| `Elbehov (GWh)` | Electricity Demand | Annual demand in GWh |

### Data Dimensions

- **Scenarios:** 3 (Beslutad Policy, Lokal Miljöhänsyn, Internationell Tillväxt)
- **Counties:** 21 Swedish counties
- **Years:** 6 data points (2025, 2030, 2035, 2040, 2045, 2050)
- **Sectors:** Two-level hierarchy (5 Level 1, 13 Level 2)

## Processing

### Notebook

**File:** `load_energy_agency.ipynb`

The notebook performs:

1. **Load** - Read Excel with proper row skipping
2. **Explore** - List scenarios, sectors, years, counties
3. **Map Segments** - Swedish sectors → standard segment names
4. **Map Geography** - County names → county codes (01-25)
5. **Validate** - Check completeness and value ranges
6. **Interpolate** - 5-year → annual (2025-2050)
7. **Visualize** - Growth curves, geographic distribution
8. **Export** - DuckDB database for generator

### Segment Mapping

Swedish sector names are mapped to 7 standard generator segments:

| Swedish (Level 1) | Swedish (Level 2) | Standard Segment |
|-------------------|-------------------|------------------|
| Industri | Industri | `industry` |
| Inrikes transporter | Arbetsmaskiner, industri | `industry` |
| Datacenter | Datacenter | `datacenters` |
| Bostäder | Småhus, elbaserad värme | `housing` |
| Bostäder | Flerbostadshus, elbaserad värme | `housing` |
| Bostäder | Hushåll och fastighetsel | `housing` |
| Service | Lokaler, elbaserad värme | `services` |
| Service | Driftel, service och Jordbruk, skogsbruk, fiske | `services` |
| Inrikes transporter | Vägtransporter, personbilar | `transport_cars` |
| Inrikes transporter | Vägtransporter, tunga lastbilar | `transport_trucks` |
| Inrikes transporter | Vägtransporter, lätta lastbilar | `transport_trucks` |
| Inrikes transporter | Vägtransporter, Bussar | `transport_trucks` |
| Inrikes transporter | Bantransport | `transport_rail` |

**Notes:**
- Datacenter is a Level 1 category, not under "Industri"
- "Arbetsmaskiner, industri" (industrial machines) is mapped to `industry`, not transport

### Interpolation Method

Linear interpolation is used to convert 5-year data points to annual values:

- **Input:** Values at 2025, 2030, 2035, 2040, 2045, 2050
- **Output:** Values for every year 2025-2050 (26 values)
- **Method:** `numpy.interp()` (linear interpolation)
- **Validation:** Interpolated values at source years exactly match original data

Each (scenario, segment, geography) combination is interpolated independently.

## Output File

### `energy_agency.duckdb`

DuckDB database containing two tables:

#### Table: `annual_demand`

Interpolated annual data ready for the generator.

| Column | Type | Description |
|--------|------|-------------|
| `scenario` | str | Scenario name |
| `segment` | str | Standard segment name (7 values) |
| `year` | int | Year (2025-2050, annual) |
| `geography` | str | County code (01, 03, ..., 25) |
| `value` | float | Electricity demand in GWh |

**Rows:** 3 scenarios × 7 segments × 26 years × 21 counties = 11,466

#### Table: `raw_5year`

Original 5-year data with standardized column names. Useful for validation.

Same columns as `annual_demand`, but only contains the original 6 year values (2,646 rows).

## Usage in Generator

```python
import duckdb

# Connect to database
con = duckdb.connect('generator/input/energy_agency_scenarios/energy_agency.duckdb')

# Query annual demand data
df = con.execute("""
    SELECT * FROM annual_demand
    WHERE scenario = 'Beslutad Policy'
    AND year = 2035
""").fetchdf()

# Get demand for specific segment, year, geography
demand = con.execute("""
    SELECT value FROM annual_demand
    WHERE segment = 'housing'
    AND year = 2035
    AND geography = '01'
    AND scenario = 'Beslutad Policy'
""").fetchone()[0]

con.close()
```

## Data Quality Notes

- All combinations of (scenario, segment, year, geography) should be present
- No negative values expected
- Some segments may have zero values in certain geographies
- Geographic codes are Swedish county codes (län)
