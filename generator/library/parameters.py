"""
Parameter processing module for Strategy 2 (Independent Parameters).

This module:
1. Loads parameter definitions from config.yaml
2. Generates curve parquet files
3. Processes parameters to generate segment-only parquet files

Output structure: parameters/{parameter}/{index}/{segment}/data.parquet
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import duckdb
import pandas as pd
import yaml

from .curves import generate_exponential_growth, generate_s_curve


def load_parameter_config(config_path: str | Path) -> Dict[str, Any]:
    """Load parameters section from config.yaml."""
    with open(config_path) as f:
        config = yaml.safe_load(f)
    return config.get("parameters", {})


def get_parameter_definitions(config_path: str | Path) -> Dict[str, Dict[str, Any]]:
    """Get all parameter definitions from config."""
    params = load_parameter_config(config_path)
    return params.get("definitions", {})


def generate_growth_curves(
    output_dir: str | Path,
    start_year: int = 2025,
    end_year: int = 2050,
    resolution: str = "1h",
    growth_rates: Dict[int, float] = None,
) -> pd.DataFrame:
    """
    Generate growth curve parquet file with multiple indices.

    Args:
        output_dir: Directory to write curves.parquet
        start_year: Start year for curves
        end_year: End year for curves
        resolution: Time resolution
        growth_rates: Dict mapping index -> annual growth rate
                      e.g., {1: 0.01, 2: 0.02, 3: 0.03} for Low/Medium/High

    Returns:
        DataFrame with columns: timestamp, index, value
    """
    if growth_rates is None:
        growth_rates = {
            1: 0.01,   # Low: 1% annual growth
            2: 0.02,   # Medium: 2% annual growth
            3: 0.03,   # High: 3% annual growth
        }

    dfs = []
    for idx, rate in growth_rates.items():
        curve_df = generate_exponential_growth(
            curve_id=f"growth_{idx}",
            start_year=start_year,
            end_year=end_year,
            resolution=resolution,
            annual_growth=rate,
        )
        curve_df["index"] = idx
        dfs.append(curve_df[["timestamp", "index", "value"]])

    result = pd.concat(dfs, ignore_index=True)

    # Write to parquet
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    result.to_parquet(output_path / "curves.parquet", index=False)

    return result


def generate_flex_curves(
    output_dir: str | Path,
    start_year: int = 2025,
    end_year: int = 2050,
    resolution: str = "1h",
    flex_levels: Dict[int, float] = None,
) -> pd.DataFrame:
    """
    Generate flexibility curve parquet file with multiple indices.

    Flex curves represent demand response potential as multipliers.
    A flex value of 0.9 means 10% of demand can be shifted.

    Args:
        output_dir: Directory to write curves.parquet
        start_year: Start year for curves
        end_year: End year for curves
        resolution: Time resolution
        flex_levels: Dict mapping index -> flex multiplier (0.8-1.0)
                     e.g., {1: 0.95, 2: 0.90} for Low/High flexibility

    Returns:
        DataFrame with columns: timestamp, index, value
    """
    if flex_levels is None:
        flex_levels = {
            1: 0.95,   # Low: 5% flexibility
            2: 0.90,   # High: 10% flexibility
        }

    # Generate timestamps
    start_ts = pd.Timestamp(f"{start_year}-01-01 00:00:00")
    end_ts = pd.Timestamp(f"{end_year}-12-31 23:59:59")
    timestamps = pd.date_range(start=start_ts, end=end_ts, freq=resolution)

    dfs = []
    for idx, flex_val in flex_levels.items():
        df = pd.DataFrame({
            "timestamp": timestamps,
            "index": idx,
            "value": flex_val,  # Constant multiplier for now
        })
        dfs.append(df)

    result = pd.concat(dfs, ignore_index=True)

    # Write to parquet
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    result.to_parquet(output_path / "curves.parquet", index=False)

    return result


def create_all_curve_files(
    base_dir: str | Path,
    segments: List[str] = None,
    start_year: int = 2025,
    end_year: int = 2050,
) -> Dict[str, Path]:
    """
    Create all curve files for growth and flex parameters.

    Args:
        base_dir: Base directory for curve files (e.g., generator/input/scenarios)
        segments: List of segments (default: housing, transport, industry, services, datacenters)
        start_year: Start year
        end_year: End year

    Returns:
        Dict mapping parameter name -> curve file path
    """
    if segments is None:
        segments = ["housing", "transport", "industry", "services", "datacenters"]

    base_path = Path(base_dir)
    created_files = {}

    for segment in segments:
        # Growth curves
        growth_dir = base_path / f"{segment}_growth"
        generate_growth_curves(
            output_dir=growth_dir,
            start_year=start_year,
            end_year=end_year,
        )
        created_files[f"{segment}_growth"] = growth_dir / "curves.parquet"

        # Flex curves
        flex_dir = base_path / f"{segment}_flex"
        generate_flex_curves(
            output_dir=flex_dir,
            start_year=start_year,
            end_year=end_year,
        )
        created_files[f"{segment}_flex"] = flex_dir / "curves.parquet"

    return created_files


def process_independent_parameter(
    con: duckdb.DuckDBPyConnection,
    param_name: str,
    param_def: Dict[str, Any],
    base_scenario_path: str | Path,
    output_dir: str | Path,
    project_root: str | Path,
) -> Dict[str, Any]:
    """
    Process an independent parameter, generating segment-only parquet files.

    Args:
        con: DuckDB connection
        param_name: Parameter name (e.g., "housing_growth")
        param_def: Parameter definition from config
        base_scenario_path: Path to base scenario segment files
        output_dir: Output directory for parameter files
        project_root: Project root path (for resolving curve file paths)

    Returns:
        Dict with processing statistics
    """
    segments = param_def.get("segments", [])
    values = param_def.get("values", [])
    how = param_def.get("how", "multiply")

    stats = {
        "param_name": param_name,
        "segments": segments,
        "values_processed": 0,
        "files_created": [],
    }

    for value_def in values:
        idx = value_def.get("index")
        curve_def = value_def.get("curve")

        # Skip index 0 (baseline - use base data directly)
        if idx == 0 or curve_def is None:
            continue

        # Load curve file
        curve_file = Path(project_root) / curve_def["file"]
        filter_expr = curve_def.get("filter", "1=1")

        for segment in segments:
            # Path to base segment data
            base_segment_path = Path(base_scenario_path) / segment / "data.parquet"

            # Output path: parameters/{param}/{index}/{segment}/data.parquet
            out_path = Path(output_dir) / param_name / str(idx) / segment
            out_path.mkdir(parents=True, exist_ok=True)
            out_file = out_path / "data.parquet"

            # Build SQL to apply curve
            if how == "multiply":
                value_expr = "b.value * COALESCE(c.value, 1.0)"
            else:  # add
                value_expr = "b.value + COALESCE(c.value, 0.0)"

            sql = f"""
            COPY (
                WITH curve_data AS (
                    SELECT timestamp, value
                    FROM read_parquet('{curve_file}')
                    WHERE {filter_expr}
                )
                SELECT
                    b.timestamp,
                    {value_expr} AS value,
                    b.geography,
                    b.segment
                FROM read_parquet('{base_segment_path}') b
                LEFT JOIN curve_data c ON b.timestamp = c.timestamp
            )
            TO '{out_file}'
            (FORMAT PARQUET, COMPRESSION ZSTD)
            """

            con.execute(sql)
            stats["files_created"].append(str(out_file))

        stats["values_processed"] += 1

    return stats


def process_all_parameters(
    con: duckdb.DuckDBPyConnection,
    config_path: str | Path,
    base_scenario_name: str,
    base_dir: str | Path,
    output_dir: str | Path,
) -> List[Dict[str, Any]]:
    """
    Process all parameters defined in config.yaml.

    Args:
        con: DuckDB connection
        config_path: Path to config.yaml
        base_scenario_name: Name of base scenario (e.g., "Beslutad Policy")
        base_dir: Base output directory containing base scenario files
        output_dir: Output directory for parameter files

    Returns:
        List of processing statistics for each parameter
    """
    config_path = Path(config_path)
    project_root = config_path.parent

    definitions = get_parameter_definitions(config_path)
    base_scenario_path = Path(base_dir) / base_scenario_name

    all_stats = []

    for param_name, param_def in definitions.items():
        if param_def.get("type") == "independent":
            stats = process_independent_parameter(
                con=con,
                param_name=param_name,
                param_def=param_def,
                base_scenario_path=base_scenario_path,
                output_dir=output_dir,
                project_root=project_root,
            )
            all_stats.append(stats)

    return all_stats
