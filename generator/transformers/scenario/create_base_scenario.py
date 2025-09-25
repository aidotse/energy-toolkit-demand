import duckdb
import pandas as pd
from pathlib import Path
from typing import Optional, Union, List, Literal

from generator.library.db import (
    list_columns,
    count_rows,
    write_df_to_scaffold,
    infer_single_table,
    read_data,
)

from generator.library.curves import (
    CurveLike,
    load_curve,
    validate_curve_alignment,
    curve_to_series,
    apply_growth_curve_to_value,
)


def create_base_scenario(
    in_data: Path,
    base_year: int,
    start_year: int,
    end_year: int,
    out_data: Optional[Path] = None,
    partition: Optional[List[Union[str, tuple[str, str]]]] = None,
    *,
    # growth curve: can be any CurveLike (Series, DataFrame, Mapping, or path to parquet/csv)
    growth_curve: Optional["CurveLike"] = None,
    growth_mode: Literal["multiply", "add"] = "multiply",
    base_scenario: str = "base",
    scenario_schema: Optional[List[str]] = None,
    scenario_defaults: Optional[dict] = None,
) -> dict:
    """
    Create the base scenario by extending a base year into future years,
    repeating its hourly shape, (optionally) applying a growth curve
    to the 'value' column, and writing to a Parquet scaffold.

    growth_curve accepts any CurveLike:
      - pd.Series (DatetimeIndex)
      - pd.DataFrame with ['timestamp', 'value' | 'factor' | 'multiplier']
      - Mapping[timestamp -> factor]
      - Path/str to a parquet or csv with that DataFrame shape
    """
    # 0) Basic introspection (for DuckDB overwrite path)
    orig_cols = list_columns(in_data)
    _ = count_rows(in_data)  # kept for parity/metrics; not used below

    # 1) Read source and slice the base year
    df = read_data(in_data)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=False)

    if base_year not in df["timestamp"].dt.year.unique():
        raise ValueError(f"Base year {base_year} not found in data.")

    base_df = (
        df[df["timestamp"].dt.year == base_year]
        .sort_values("timestamp")
        .assign(
            date=lambda d: d["timestamp"].dt.date,
            time=lambda d: d["timestamp"].dt.time,
        )
    )

    # 2) Build future years by weekday-aligned repetition of the base year's shape
    base_days = base_df["date"].unique()
    rows_per_hour = len(base_df) // 8760  # supports multi-geo / multi-segment

    yearly = []
    for year in range(start_year, end_year + 1):
        start = pd.Timestamp(f"{year}-01-01 00:00:00")
        end = pd.Timestamp(f"{year}-12-31 23:00:00")
        days = pd.date_range(start, end, freq="D")

        # align first day of target year to first matching weekday in base year
        wd = start.weekday()
        first = next(d for d in base_days if pd.Timestamp(d).weekday() == wd)
        idx = list(base_days).index(first)

        main = base_df[base_df["date"].isin(base_days[idx:])].copy()

        needed_hours = len(days) * 24
        have_hours = len(main) // rows_per_hour

        if have_hours < needed_hours:
            # we need more days from the beginning of the base year
            miss_days = (needed_hours - have_hours) // 24
            mwd = days[len(base_days[idx:])].weekday()
            mstart = next(d for d in base_days if pd.Timestamp(d).weekday() == mwd)
            midx = list(base_days).index(mstart)
            tail = base_df[base_df["date"].isin(base_days[midx : midx + miss_days])]
            year_df = pd.concat([main, tail], ignore_index=True)
        else:
            year_df = main

        # rebuild timestamps to the target year
        ts = pd.date_range(start, end, freq="h").repeat(rows_per_hour)
        year_df = year_df.reset_index(drop=True)
        year_df["timestamp"] = ts
        year_df = year_df.drop(columns=["date", "time"])
        yearly.append(year_df)

    extended = pd.concat(yearly, ignore_index=True)
    extended = extended[extended["timestamp"] <= pd.Timestamp(f"{end_year}-12-31 23:00:00")]

    # 3) Optional: apply a growth curve (any CurveLike) to 'value'
    if growth_curve is not None:

        base_schema = extended.columns.tolist()

        # Load any supported shape (Series/DataFrame/Mapping/path)
        curve_obj = load_curve(growth_curve)                          # -> Series/DataFrame/Mapping
        curve_series = curve_to_series(curve_obj, name="value")       # -> Series indexed by Timestamp

        # Build expected hourly index matching extended data exactly
        expected_index = (
            extended[["timestamp"]]
            .drop_duplicates()
            .sort_values("timestamp")
            .set_index("timestamp")
            .index
        )

        # Validate coverage & alignment (raises on mismatch)
        validate_curve_alignment(
            curve_series,
            data_index=expected_index,
            require_complete_cover=True,
        )

        # Convert back to the DataFrame shape that apply_growth_curve_to_value expects
        curve_df = curve_series.rename_axis("timestamp").reset_index(name="value")

        # Apply to the 'value' column across all geographies/segments
        extended = apply_growth_curve_to_value(
            extended,
            curve_df=curve_df,
            how=growth_mode,
            target_col="value",
        )

        extended["timestamp"] = pd.to_datetime(extended["timestamp"], utc=False)
        extended = extended[base_schema]

    extended["scenario_id"] = base_scenario
    if scenario_schema:
        for param in scenario_schema:
            default_val = None
            if scenario_defaults and param in scenario_defaults:
                default_val = scenario_defaults[param]
            # add or overwrite as Int8 column
            extended[f"scenario_{param}"] = pd.Series(
                [default_val] * len(extended), dtype=pd.Int8Dtype()
            )


    # 4) Write out
    if partition:
        # Parquet path: delegate partitioning and scenario_id folder creation
        write_df_to_scaffold(
            extended,
            root_path=out_data or in_data,
            partition_specs=partition,
            parquet_kwargs={"engine": "pyarrow", "compression": "zstd", "compression_level": 3, "index": False},
        )
    else:
        # DuckDB path: overwrite the single table (preserve original column order)
        con = duckdb.connect(str(in_data))
        table = infer_single_table(con)
        con.register("df", extended)
        col_list_sql = ", ".join(f"df.{c}" for c in orig_cols if c in extended.columns)
        con.execute(f"CREATE OR REPLACE TABLE {table} AS SELECT {col_list_sql} FROM df")
        con.close()

    return {
        "target": str(out_data or in_data),
        "status": "done",
        "rows_written": len(extended),
        "years": {"start": start_year, "end": end_year},
        "scenario_id": base_scenario,
    }
