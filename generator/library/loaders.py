import pandas as pd
import duckdb as dd
from pathlib import Path
from typing import Union, Dict, Any, List

def base_loader_csv(
    base_schema: List[str],
    base_schema_map: Dict[str, str],
    base_data: Union[str, Path],
    output_path: Union[str, Path]
) -> Dict[str, Any]:
    """
    Load a base CSV file, validate that it contains the required columns in the expected order,
    strip stray single‐ or double‐quotes from string columns, reorder & rename to canonical schema,
    and write to a DuckDB table.

    Args:
        base_schema (List[str]): Ordered list of canonical column names 
            (e.g. ['geography','segment','timestamp','value']).
        base_schema_map (Dict[str,str]): Mapping from each canonical name to the actual
            column name in the CSV.
        base_data (str or Path): Path to the input CSV file.
        output_path (str or Path): Path to the DuckDB database file to write.

    Returns:
        dict: Summary containing:
            - 'target': Path to the database file.
            - 'table': Name of the table written ('demand').
            - 'added_rows': Number of rows ingested.
            - 'added_columns': List of column names in the table, in canonical order.
    """
    # 1. Validate schema inputs
    missing_keys = set(base_schema) - set(base_schema_map.keys())
    if missing_keys:
        raise ValueError(f"base_schema contains names not in base_schema_map: {missing_keys}")

    # 2. Read CSV, parsing the timestamp column
    ts_input = base_schema_map['timestamp']
    df = pd.read_csv(base_data, parse_dates=[ts_input])

    # 3. Make sure all required columns are present
    required_inputs = [base_schema_map[c] for c in base_schema]
    missing_cols = set(required_inputs) - set(df.columns)
    if missing_cols:
        raise ValueError(f"Missing required columns in {base_data}: {sorted(missing_cols)}")

    # 4. Strip stray single‐ or double‐quotes from any string column
    #    Regex: remove leading/trailing runs of ' or "
    strip_re = r'(^[\'"]+|[\'"]+$)'
    for canon in base_schema:
        inp = base_schema_map[canon]
        if df[inp].dtype == object:
            df[inp] = (
                df[inp]
                .astype(str)
                .str.replace(strip_re, '', regex=True)
            )

    # 5. Reorder columns into the canonical order and rename them
    df = df[required_inputs]\
         .rename(columns={base_schema_map[c]: c for c in base_schema})

    # 6. Write out to DuckDB
    table = 'demand'
    con = dd.connect(database=str(output_path), read_only=False)
    con.register("base_demand", df)
    con.execute(f"CREATE OR REPLACE TABLE {table} AS SELECT * FROM base_demand")

    # 7. Build summary
    added_rows = con.execute("SELECT COUNT(*) FROM base_demand").fetchone()[0]
    added_columns = [
        row[0]
        for row in con.execute(
            f"""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = '{table}'
            ORDER BY ordinal_position
            """
        ).fetchall()
    ]

    con.close()

    return {
        'target': str(output_path),
        'table': table,
        'added_rows': added_rows,
        'added_columns': added_columns
    }
