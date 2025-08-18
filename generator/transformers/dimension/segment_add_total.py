import duckdb
from pathlib import Path
from generator.library.db import list_columns, count_rows, infer_single_table

def segment_add_total(db_path: Path, segment_col: str = 'segment') -> dict:
    """
    Add a constant segment column with value 'total' to an existing DuckDB table.

    Args:
        db_path (Path): Path to the DuckDB database file.
        segment_col (str): Name of the column to add (default: "segment").

    Returns:
        dict: Summary of how many rows and columns were added to the output table.
    """

    # 1. Connect to DuckDB
    con = duckdb.connect(str(db_path))
    before_cols = set(list_columns(con))
    before_rows = count_rows(con)

    in_table = infer_single_table(con)
    out_table = in_table

    # 2. Validate input table structure
    input_cols = list_columns(con)
    if 'timestamp' not in input_cols or 'value' not in input_cols:
        raise ValueError(f"Input table must include at least 'timestamp' and 'value' (found: {input_cols})")

    if segment_col in input_cols:
        raise ValueError(f"Column '{segment_col}' already exists in table '{in_table}'")

    # 3. Add constant column and write to new table
    con.execute(f"""
        CREATE OR REPLACE TABLE {out_table} AS
        SELECT 
            *, 
            'total' AS {segment_col}
        FROM {in_table}
    """)

    # 4. Compare before/after structure
    after_cols = set(list_columns(con))
    after_rows = count_rows(con)
    con.close()

    return {
        'target': str(db_path),
        'table': out_table,
        'rows': after_rows - before_rows,
        'columns': sorted(after_cols - before_cols),
    }
