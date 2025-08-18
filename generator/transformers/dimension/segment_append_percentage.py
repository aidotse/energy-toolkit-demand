import duckdb
from pathlib import Path
from generator.library.db import list_columns, count_rows, infer_single_table

def segment_append_percentage(
    db_path: Path,
    segment_col: str,
    base_segment: str,
    new_segment: str,
    percentage: float
) -> dict:
    """
    Appends new rows to the table representing a percentage of the rows
    where `segment_col = base_segment`. The appended rows will have
    `segment_col` set to `new_segment` and `value` scaled by `percentage`.
    Preserves column order.

    Args:
        db_path (Path): Path to the DuckDB database.
        segment_col (str): Name of the existing segment column.
        base_segment (str): The segment value to base the percentage on.
        new_segment (str): The new segment label for appended rows.
        percentage (float): Fraction of the base rows' value to append (0–1).

    Returns:
        dict: Summary containing:
            - 'target': database file path,
            - 'table': table name,
            - 'rows': number of rows appended,
            - 'columns': list of any new columns added (in order).
    """
    con = duckdb.connect(str(db_path))

    # 1. Capture pre-state
    orig_cols = list_columns(con)      # ordered list of existing columns
    before_cols = set(orig_cols)
    before_rows = count_rows(con)
    table = infer_single_table(con)

    # 2. Validate required columns
    if segment_col not in before_cols or 'timestamp' not in before_cols or 'value' not in before_cols:
        raise ValueError(
            f"Table must contain 'timestamp', 'value', and '{segment_col}' (found: {orig_cols})"
        )

    # 3. Validate percentage
    if not (0.0 <= percentage <= 1.0):
        raise ValueError(f"percentage must be between 0 and 1 (got {percentage})")

    # 4. Materialize original data into a temp table
    con.execute(f"CREATE TEMPORARY TABLE orig_data AS SELECT * FROM {table}")

    # 5. Build the SELECT-list for appended rows, in original column order
    append_exprs = []
    for col in orig_cols:
        if col == segment_col:
            append_exprs.append(f"'{new_segment}' AS {col}")
        elif col == 'value':
            append_exprs.append(f"value * {percentage} AS {col}")
        else:
            append_exprs.append(col)
    append_sql = ", ".join(append_exprs)

    # 6. Replace the main table with original + appended rows
    con.execute(f"""
        CREATE OR REPLACE TABLE {table} AS
        SELECT * FROM orig_data
        UNION ALL
        SELECT {append_sql}
        FROM orig_data
        WHERE {segment_col} = '{base_segment}'
    """)

    # 7. Drop the temp table
    con.execute("DROP TABLE orig_data")

    # 8. Capture post-state
    after_cols = list_columns(con)
    after_rows = count_rows(con)
    con.close()

    # 9. Determine any newly added columns, preserving order
    new_cols = [c for c in after_cols if c not in before_cols]

    return {
        'target': str(db_path),
        'table': table,
        'rows': after_rows - before_rows,
        'columns': new_cols,
    }
