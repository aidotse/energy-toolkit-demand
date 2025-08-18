import duckdb
from pathlib import Path
from generator.library.db import list_columns, count_rows, infer_single_table

def segment_append_constant(db_path: Path, segment_col: str, segment_value: str, constant: float) -> dict:
    """
    Appends rows to a table by copying all existing rows and adding new rows
    where `segment_col` is set to `segment_value` and the `value` column is set
    to `constant`. Preserves column order.

    Args:
        db_path (Path): Path to the DuckDB database.
        segment_col (str): Name of the existing segment column.
        segment_value (str): Value to assign to `segment_col` in new rows.
        constant (float): Value to assign to the `value` column in new rows.

    Returns:
        dict: Summary with:
            - 'target': the database file path,
            - 'table': the table name,
            - 'rows': number of rows appended,
            - 'columns': list of any new columns added (in order).
    """
    con = duckdb.connect(str(db_path))

    # capture before state
    orig_cols = list_columns(con)          # ordered list
    before_cols = set(orig_cols)
    before_rows = count_rows(con)
    table = infer_single_table(con)

    # ensure required columns exist
    if 'timestamp' not in before_cols or 'value' not in before_cols or segment_col not in before_cols:
        raise ValueError(f"Table must contain 'timestamp', 'value', and '{segment_col}' (found: {orig_cols})")

    # build the SELECT list for the "appended" rows in original column order
    append_exprs = []
    for col in orig_cols:
        if col == segment_col:
            append_exprs.append(f"'{segment_value}' AS {col}")
        elif col == 'value':
            append_exprs.append(f"{constant} AS {col}")
        else:
            append_exprs.append(col)
    append_sql = ", ".join(append_exprs)

    # rebuild table with original rows + appended rows
    con.execute(f"""
        CREATE OR REPLACE TABLE {table} AS
        SELECT * FROM {table}
        UNION ALL
        SELECT {append_sql} FROM {table}
    """)

    # capture after state
    after_cols = list_columns(con)
    after_rows = count_rows(con)
    con.close()

    # any new columns (should usually be none)
    new_cols = [c for c in after_cols if c not in before_cols]

    return {
        'target': str(db_path),
        'table': table,
        'rows': after_rows - before_rows,
        'columns': new_cols,
    }
