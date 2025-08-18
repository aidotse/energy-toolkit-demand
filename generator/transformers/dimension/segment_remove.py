import duckdb
from pathlib import Path
from generator.library.db import list_columns, count_rows, infer_single_table

def segment_remove(
    db_path: Path,
    segment_col: str,
    segment_to_remove: str
) -> dict:
    """
    Removes all rows where `segment_col` equals `segment_to_remove`,
    preserving column order.

    Args:
        db_path (Path): Path to the DuckDB database.
        segment_col (str): Name of the column containing segment labels.
        segment_to_remove (str): Value to remove from the segment column.

    Returns:
        dict: Summary containing:
            - 'target': database file path,
            - 'table': table name,
            - 'rows': net change in row count (negative or zero),
            - 'columns': list of any new columns added (always empty here).
    """
    con = duckdb.connect(str(db_path))

    # 1. Infer and capture pre-state
    table = infer_single_table(con)
    orig_cols = list_columns(con)            # ordered list
    before_rows = count_rows(con)
    before_cols = set(orig_cols)

    # 2. Validate required schema
    required = ['geography', 'segment', 'timestamp', 'value']
    missing = [c for c in required if c not in orig_cols]
    if missing:
        raise ValueError(f"Table '{table}' missing required columns: {missing}")

    # 3. Build explicit column list to preserve order
    cols_sql = ", ".join(orig_cols)

    # 4. Recreate table without the unwanted segment
    con.execute(f"""
        CREATE OR REPLACE TABLE {table} AS
        SELECT {cols_sql}
        FROM {table}
        WHERE {segment_col} != '{segment_to_remove}'
    """)

    # 5. Capture post-state and cleanup
    after_rows = count_rows(con)
    after_cols = set(list_columns(con))
    con.close()

    # 6. Report summary
    return {
        'target': str(db_path),
        'table': table,
        'rows': after_rows - before_rows,
        'columns': []  # no new columns ever added here
    }
