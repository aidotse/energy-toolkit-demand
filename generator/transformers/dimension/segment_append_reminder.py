import duckdb
from pathlib import Path
from generator.library.db import list_columns, count_rows, infer_single_table

def segment_append_reminder(
    db_path: Path,
    segment_col: str,
    base_segment: str,
    subtract_segments: list[str],
    remainder_segment: str
) -> dict:
    """
    Appends rows representing the remainder of a base segment minus a set of
    subtract segments. Strips stray quotes from string columns, preserves
    column order, and assigns `remainder_segment` and the computed value.

    Args:
        db_path (Path): Path to the DuckDB database.
        segment_col (str): Name of the segment column (e.g. 'segment').
        base_segment (str): The segment value to subtract from (e.g. 'total').
        subtract_segments (list[str]): List of segment values to subtract.
        remainder_segment (str): Label for the remainder rows.

    Returns:
        dict: Summary containing:
            - 'target': database file path,
            - 'table': table name,
            - 'rows': number of rows appended,
            - 'columns': list of any new columns added (in order).
    """
    con = duckdb.connect(str(db_path))

    # 1. Capture pre-state
    table = infer_single_table(con)
    orig_cols = list_columns(con)            # ordered list of existing columns
    before_cols = set(orig_cols)
    before_rows = count_rows(con)

    # 2. Validate required schema
    required = ['geography', 'segment', 'timestamp', 'value']
    missing = [c for c in required if c not in orig_cols]
    if missing:
        raise ValueError(f"Table '{table}' missing required columns: {missing}")

    # 3. Strip stray single- or double-quotes from string columns
    clean_exprs = []
    for col in orig_cols:
        if col in ('geography', 'segment'):
            # remove any leading/trailing single or double quotes
            clean_exprs.append(
                f"REPLACE(REPLACE({col}, '''', ''), '\"', '') AS {col}"
            )
        else:
            clean_exprs.append(col)
    clean_sql = ", ".join(clean_exprs)
    con.execute(f"CREATE TEMPORARY TABLE orig_data AS SELECT {clean_sql} FROM {table}")

    # 4. Compute summed value of subtract_segments by geography+timestamp
    seg_list = ", ".join(f"'{s}'" for s in subtract_segments)
    con.execute(f"""
        CREATE TEMPORARY TABLE subtracted AS
        SELECT
            geography,
            timestamp,
            SUM(value) AS subtracted
        FROM orig_data
        WHERE {segment_col} IN ({seg_list})
        GROUP BY geography, timestamp
    """)

    # 5. Build SELECT-list for remainder rows, in original column order
    remainder_exprs = []
    for col in orig_cols:
        if col == segment_col:
            remainder_exprs.append(f"'{remainder_segment}' AS {col}")
        elif col == 'value':
            remainder_exprs.append("a.value - COALESCE(s.subtracted, 0) AS value")
        else:
            remainder_exprs.append(f"a.{col}")
    remainder_sql = ", ".join(remainder_exprs)

    # 6. Rebuild table with original + remainder rows, preserving order
    con.execute(f"""
        CREATE OR REPLACE TABLE {table} AS
        SELECT * FROM orig_data
        UNION ALL
        SELECT
            {remainder_sql}
        FROM orig_data a
        LEFT JOIN subtracted s
          ON a.geography = s.geography
         AND a.timestamp = s.timestamp
        WHERE a.{segment_col} = '{base_segment}'
    """)

    # 7. Capture post-state & cleanup
    after_cols = list_columns(con)
    after_rows = count_rows(con)
    con.close()

    # 8. Determine newly added columns (if any)
    new_cols = [c for c in after_cols if c not in before_cols]

    return {
        'target': str(db_path),
        'table': table,
        'rows': after_rows - before_rows,
        'columns': new_cols,
    }
