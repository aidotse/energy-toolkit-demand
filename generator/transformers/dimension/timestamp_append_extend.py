import duckdb
import pandas as pd
from pathlib import Path
from generator.library.db import (
    list_columns,
    count_rows,
    write_df_to_scaffold,
    infer_single_table,
    read_data
)
from typing import Union, List, Optional

def timestamp_append_extend(
    in_data: Path,
    base_year: int,
    start_year: int,
    end_year: int,
    out_data: Optional[Path] = None,
    partition: Optional[List[Union[str, tuple[str, str]]]] = None,
    growth_curve: list[float] = None,
    sectors: list[str] = None,
    noise_type: str = None,
    noise_level: float = 0.01,
) -> dict:
    """
    Extend a time‐series table from a base year through end_year,
    repeating its pattern each year, then write back either as
    a partitioned Parquet scaffold (adding timestamp_year in the
    writer) or overwrite the DuckDB table. Preserves original
    column order; timestamp_year is only added in the Parquet path.

    Args:
        in_data (Path): Path to the DuckDB database file.
        base_year (int): Year to use as the pattern.
        start_year (int): First year to generate.
        end_year (int): Last year to generate.
        out_data (Path, optional): If partitioning, root output path.
        partition (list, optional): Partition specs.
        growth_curve, sectors, noise_*, noise_level: ignored here.

    Returns:
        dict: { 'target': str(in_data), 'status': 'done' }
    """
    # 1. Capture original column order and row count
    orig_cols = list_columns(in_data)
    before_rows = count_rows(in_data)

    # 2. Read data and filter to base_year
    df = read_data(in_data)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    if base_year not in df['timestamp'].dt.year.unique():
        raise ValueError(f"Base year {base_year} not found in data.")
    base_df = (
        df[df['timestamp'].dt.year == base_year]
        .sort_values('timestamp')
        .assign(date=lambda d: d['timestamp'].dt.date,
                time=lambda d: d['timestamp'].dt.time)
    )

    # 3. Build each year's extended DataFrame
    base_days = base_df['date'].unique()
    rows_per_hour = len(base_df) // 8760
    yearly = []
    for year in range(start_year, end_year + 1):
        start = pd.Timestamp(f"{year}-01-01")
        end = pd.Timestamp(f"{year}-12-31 23:00")
        days = pd.date_range(start, end, freq='D')
        wd = start.weekday()
        first = next(d for d in base_days if pd.Timestamp(d).weekday() == wd)
        idx = list(base_days).index(first)
        main = base_df[base_df['date'].isin(base_days[idx:])].copy()
        needed = len(days) * 24
        have = len(main) // rows_per_hour
        if have < needed:
            miss = (needed - have) // 24
            mwd = days[len(base_days[idx:])].weekday()
            mstart = next(d for d in base_days if pd.Timestamp(d).weekday() == mwd)
            midx = list(base_days).index(mstart)
            tail = base_df[base_df['date'].isin(base_days[midx : midx + miss])]
            year_df = pd.concat([main, tail], ignore_index=True)
        else:
            year_df = main
        ts = pd.date_range(start, end, freq='h').repeat(rows_per_hour)
        year_df = year_df.reset_index(drop=True)
        year_df['timestamp'] = ts
        year_df = year_df.drop(columns=['date', 'time'])
        yearly.append(year_df)

    extended = pd.concat(yearly, ignore_index=True)
    extended = extended[extended['timestamp'] <= pd.Timestamp(f"{end_year}-12-31 23:00")]

    # 4. Write out
    if partition:
        # Parquet path: write_df_to_scaffold will insert timestamp_year
        write_df_to_scaffold(
            extended,
            root_path=out_data or in_data,
            partition_specs=partition,
            parquet_kwargs={'compression': 'snappy'}
        )
    else:
        # DuckDB path: overwrite table, preserving original columns only
        con = duckdb.connect(str(in_data))
        table = infer_single_table(con)
        con.register("df", extended)
        col_list_sql = ", ".join(f"df.{c}" for c in orig_cols)
        con.execute(f"CREATE OR REPLACE TABLE {table} AS SELECT {col_list_sql} FROM df")
        con.close()

    return {
        'target': str(in_data),
        'status': 'done'
    }
