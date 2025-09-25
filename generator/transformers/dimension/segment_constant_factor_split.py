import duckdb
import pandas as pd
from pathlib import Path
from generator.library.db import list_columns, count_rows, infer_single_table

def segment_constant_factor_split(db_path: Path, segment_factors: pd.DataFrame) -> dict:
    """
    Segment an existing demand table by constant factors, preserving column order.
    Applies a proportional split based on the input factors and replaces the table
    with the expanded segmented result.

    Args:
        db_path (Path): Path to the DuckDB database file.
        segment_factors (pd.DataFrame): DataFrame with exactly two columns:
            one categorical (e.g. 'segment') and one numeric (the factor). Factors must sum to 1.0.

    Returns:
        dict: Summary containing:
            - 'target': Path to the database file.
            - 'table': Name of the table modified.
            - 'rows': Number of rows added (new rows minus original rows).
            - 'columns': List of new columns added, in the order they appear in the table.
    """
    # 1. Validate segment_factors structure
    if not isinstance(segment_factors, pd.DataFrame):
        raise ValueError("segment_factors must be a pandas DataFrame")
    if segment_factors.shape[1] != 2:
        raise ValueError("segment_factors must have exactly two columns: one categorical and one numeric")
    dtypes = segment_factors.dtypes
    str_cols = dtypes[dtypes == 'object'].index.tolist()
    num_cols = dtypes[dtypes != 'object'].index.tolist()
    if len(str_cols) != 1 or len(num_cols) != 1:
        raise ValueError("segment_factors must contain one string column and one numeric column")
    cat_col = str_cols[0]
    factor_col = num_cols[0]
    total = float(segment_factors[factor_col].sum())
    if not (0.999 < total < 1.001):
        raise ValueError(f"Segment factors must sum to 1.0 (got {total:.4f})")

    # 2. Connect to DuckDB and capture pre-state
    con = duckdb.connect(str(db_path))
    orig_cols = list_columns(con)            # ordered list of existing columns
    before_cols_set = set(orig_cols)
    before_rows = count_rows(con)
    in_table = infer_single_table(con)

    # 3. Validate input table schema
    required = ['timestamp', 'geography', 'segment', 'value']
    missing = [c for c in required if c not in orig_cols]
    if missing:
        raise ValueError(f"Input table '{in_table}' is missing required columns: {missing}")

    # 4. Register the factors DataFrame
    con.register("segment_factors", segment_factors)

    # 5. Build the SELECT clause in original column order, replacing:
    #    - cat_col  → g.cat_col AS cat_col
    #    - 'value'  → b.value * g.factor_col AS value
    select_exprs = []
    for col in orig_cols:
        if col == cat_col:
            select_exprs.append(f"g.{cat_col} AS {cat_col}")
        elif col == 'value':
            select_exprs.append(f"b.value * g.{factor_col} AS value")
        else:
            select_exprs.append(f"b.{col}")
    select_sql = ",\n    ".join(select_exprs)

    # 6. Rebuild the table with segmentation (preserves column order)
    con.execute(f"""
        CREATE OR REPLACE TABLE {in_table} AS
        SELECT
            {select_sql}
        FROM {in_table} b
        CROSS JOIN segment_factors g
    """)

    # 7. Capture post-state, preserving order
    after_cols = list_columns(con)
    after_rows = count_rows(con)

    # 8. Cleanup
    con.unregister("segment_factors")
    con.close()

    # 9. Determine newly added columns in the order they appear
    new_cols = [c for c in after_cols if c not in before_cols_set]

    # 10. Return summary
    return {
        'target': str(db_path),
        'table': in_table,
        'rows': after_rows - before_rows,
        'columns': new_cols,
    }
