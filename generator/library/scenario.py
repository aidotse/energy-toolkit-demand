# scenario.py
from pathlib import Path
from typing import Dict, Any, List
import pandas as pd
import duckdb

# local helpers
from generator.library.db import read_data, write_df_to_scaffold
from generator.library.curves import (
    load_curve,
    curve_to_series,
    apply_growth_curve_to_value,
)

def _scenario_id_from_schema(scenario: Dict[str, Any], schema: List[str]) -> str:
    """
    Stable scenario id: join key=value pairs in the order given by `schema`.
    Values are rendered with str() and commas are the pair delimiters.
    """
    parts = []
    for k in schema:
        v = scenario.get(k)
        parts.append(f"{k}={v}")
    return ",".join(parts)

def _resolve_curve_for_param(param_cfg: Dict[str, Any], scenario: Dict[str, Any], value: Any):
    """
    Resolve a CurveLike for a parameter using flexible config conventions:
      - 'curves_by_value': {value -> CurveLike}
      - 'curve_path_template': format string with placeholders from `scenario` and 'value'
      - 'curve_like': direct CurveLike
    Returns a pandas.DataFrame with ['timestamp','value'].
    """
    if "curves_by_value" in param_cfg:
        curve_like = param_cfg["curves_by_value"][value]
    elif "curve_path_template" in param_cfg:
        tpl = param_cfg["curve_path_template"]
        curve_like = tpl.format(value=value, **scenario)
    elif "curve_like" in param_cfg:
        curve_like = param_cfg["curve_like"]
    else:
        raise ValueError(
            "Param config must include one of: 'curves_by_value', 'curve_path_template', or 'curve_like'."
        )

    # Load -> normalize to Series -> back to 2-col DataFrame
    obj = load_curve(curve_like)
    s = curve_to_series(obj, name="value")
    curve_df = pd.DataFrame({"timestamp": s.index, "value": s.values})
    return curve_df

def process_scenario(
    scenario: Dict[str, Any],
    scenario_params: Dict[str, Dict[str, Any]],
    scenario_schema: List[str],
    output_path: Path,
    partition: List[str],
    base_scenario: str = "base"
) -> str:
    """
    Process a single scenario:
    - Loads base data from scaffold
    - Applies growth curves based on scenario parameters
    - Adds scenario_id and scenario columns
    - Writes the result to a Hive-style partitioned Parquet scaffold

    Args:
        scenario: scenario dict (must include the keys referenced in scenario_schema)
        scenario_params: per-parameter config:
            {
              "<param>": {
                  "segment": "<segment-name>",
                  "geography": "all" | "<geo>" | list[str] (optional),
                  "how": "multiply" | "add" (default "multiply"),
                  # one of the following to resolve the curve
                  "curves_by_value": {<scenario_value>: CurveLike} | ...
                  "curve_path_template": "path/like/{param}=...{value}...{start_year}...",
                  "curve_like": CurveLike
              },
              ...
            }
        scenario_schema: ordered list of parameter names, used to build scenario_id
        output_path: Path to OUTPUT scaffold root for scenarios
        partition: list of partition columns (must include "scenario_id")
        base_scenario: scenario_id of the base scenario to load data from
    """
    # 1) Build scenario_id
    scenario_id = _scenario_id_from_schema(scenario, scenario_schema)
    print(f"Processing scenario: {scenario_id}")

    # 2) Load base scenario
    df = read_data(output_path,where=f"scenario_id='{base_scenario}'")
    df = df.copy()
    #print(f"Loaded base scenario: {base_scenario}")

    # 3) Apply each param's curve to its target slice
    #print("Applying growth curves to scenario parameters...")
    for param_name, param_cfg in scenario_params.items():
        if param_name not in scenario:
            # Not provided -> skip
            continue

        value = scenario[param_name]
        curve_df = _resolve_curve_for_param(param_cfg, scenario, value)
        #print(f"Resolved curve for param '{param_name}' with value '{value}'")
        how = param_cfg.get("how", "multiply")

        # target slice
        seg = param_cfg["segment"]
        geo_spec = param_cfg.get("geography", "all")

        mask = (df["segment"] == seg)
        if isinstance(geo_spec, str) and geo_spec != "all":
            mask &= (df["geography"] == geo_spec)
        elif isinstance(geo_spec, (list, tuple, set)):
            mask &= df["geography"].isin(list(geo_spec))

        if not mask.any():
            # Nothing to do for this param (no matching rows)
            continue

        # Apply on the slice then assign back
        slice_df = df.loc[mask, ["timestamp", "value"]].copy()
        slice_df = apply_growth_curve_to_value(slice_df, curve_df, how=how, target_col="value")
        df.loc[mask, "value"] = slice_df["value"].values
        #print(f"Applied curve for param {param_name}")

    # 4) Attach scenario metadata
    df["scenario_id"] = scenario_id
    for k in scenario_params.keys():
        col = f"scenario_{k}"
        df[col] = scenario.get(k)

    # 5) Persist to scaffold (ensure scenario_id is a partition column)
    if "scenario_id" not in partition:
        partition = ["scenario_id", *partition]

    #print("Writing scenario data to scaffold...")
    write_df_to_scaffold(
        df=df,
        root_path=output_path,
        partition_specs=partition,
    )

    return scenario_id


def process_scenario_sql(
    scenario: dict,
    scenario_params: dict,
    scenario_schema: list[str],
    output_path: Path,
    partition: list[str],
    base_scenario: str = "base",
    zstd_level: int = 3
) -> str:
    # Build scenario_id string
    scenario_id = ",".join(f"{k}={scenario[k]}" for k in scenario_schema)
    print(f"[SQL] Processing scenario: {scenario_id}")

    con = duckdb.connect()

    # Base parquet glob
    base_glob = str(output_path / "**" / "*.parquet")

    # Build SELECT for base with only necessary columns
    needed_cols = {"timestamp", "value", "geography", "segment"}
    needed_cols.update(partition)
    base_cols = ", ".join(sorted(needed_cols - {"timestamp_year"}))  # exclude timestamp_year; we will generate it

    con.execute(f"""
        CREATE TEMP TABLE base AS
        SELECT {base_cols}
        FROM parquet_scan('{base_glob}', hive_partitioning=TRUE)
        WHERE scenario_id = '{base_scenario}'
    """)

    # Start building expression for the new value column
    value_expr = "b.value"

    # Register all curves and extend value_expr
    for param_name, param_cfg in scenario_params.items():
        if param_name not in scenario:
            continue

        value_num = scenario[param_name]
        how = param_cfg.get("how", "multiply")
        seg = param_cfg["segment"]
        geo_spec = param_cfg.get("geography", "all")

        # Load curve path and register as temp table
        curve_path = Path(param_cfg["curve_path_template"].format(value=value_num, **scenario))
        con.execute(f"""
            CREATE TEMP TABLE curve_{param_name} AS
            SELECT timestamp, value AS factor
            FROM parquet_scan('{curve_path}')
        """)

        # Build join filter
        geo_filter = ""
        if isinstance(geo_spec, str) and geo_spec != "all":
            geo_filter = f"AND b.geography = '{geo_spec}'"
        elif isinstance(geo_spec, (list, tuple, set)):
            geos = ",".join(f"'{g}'" for g in geo_spec)
            geo_filter = f"AND b.geography IN ({geos})"

        op = "*" if how == "multiply" else "+"

        # Extend the value expression
        if how == "multiply":
            value_expr = f"""{value_expr} {op} CASE
                WHEN b.segment = '{seg}' {geo_filter}
                     AND c_{param_name}.factor IS NOT NULL
                THEN c_{param_name}.factor
                ELSE 1
            END"""
        else:  # add
            value_expr = f"""{value_expr} {op} CASE
                WHEN b.segment = '{seg}' {geo_filter}
                     AND c_{param_name}.factor IS NOT NULL
                THEN c_{param_name}.factor
                ELSE 0
            END"""

    # Build FROM + LEFT JOIN for all curves
    join_sql = "FROM base b\n"
    for param_name in scenario_params.keys():
        if param_name in scenario:
            join_sql += f"LEFT JOIN curve_{param_name} c_{param_name} USING (timestamp)\n"

    # Add scenario metadata columns to SELECT
    scenario_cols_sql = ",\n    ".join(
        f"'{scenario.get(k)}' AS scenario_{k}" for k in scenario_params.keys()
    )

    # Final SELECT with timestamp_year generated
    final_select = f"""
        SELECT
            b.timestamp,
            {value_expr} AS value,
            b.geography,
            b.segment,
            strftime(b.timestamp, '%Y') AS timestamp_year,
            {scenario_cols_sql},
            '{scenario_id}' AS scenario_id
        {join_sql}
    """

    # Partition order (ensure scenario_id is first)
    part_cols = ", ".join(partition if "scenario_id" in partition else ["scenario_id"] + partition)

    # Write out partitioned scaffold with ZSTD compression
    out_dir = str(output_path)
    con.execute(f"""
        COPY (
            {final_select}
        )
        TO '{out_dir}'
        (FORMAT PARQUET, PARTITION_BY ({part_cols}), COMPRESSION ZSTD, COMPRESSION_LEVEL {zstd_level}, OVERWRITE_OR_IGNORE)
    """)

    con.close()
    return scenario_id
