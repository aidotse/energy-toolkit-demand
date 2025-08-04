from pathlib import Path
import duckdb
import pandas as pd
import os
import json
from typing import Union, List, Optional


# --- Unified Utilities for DuckDB & Parquet Scaffolds ---

def connect_or_passthrough(source: Union[duckdb.DuckDBPyConnection, Path]) -> duckdb.DuckDBPyConnection:
    """
    Connect to a DuckDB database or return an existing connection.
    
    If `source` is a DuckDB connection, it is returned as-is.
    If `source` is a Path to a .duckdb file, a new connection is created.
    
    Args:
        source: Either a DuckDB connection or a Path to a .duckdb file.
    
    Returns:
        A DuckDB connection object.
    """
    if isinstance(source, duckdb.DuckDBPyConnection):
        return source
    elif isinstance(source, Path) and source.suffix == '.duckdb':
        return duckdb.connect(database=str(source), read_only=True)
    else:
        raise ValueError(f"Unsupported source type: {type(source)}")

def infer_single_table(source: Union[duckdb.DuckDBPyConnection, Path]) -> str:
    """
    Infer the single user table name in a DuckDB database.

    Scans the `information_schema.tables` in the 'main' schema and returns the one and only table.
    Raises ValueError if there are zero or more than one tables.

    Args:
        source: An open DuckDB connection or a path to a .duckdb file.

    Returns:
        The name of the sole table in the database.

    Raises:
        ValueError: if the number of tables != 1.
    """

    if isinstance(source, duckdb.DuckDBPyConnection):
        rows: List[tuple] = source.execute(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'main'
          AND table_type = 'BASE TABLE'
        """
    ).fetchall()
    elif isinstance(source, Path) and source.suffix == '.duckdb':
        con = duckdb.connect(database=str(source), read_only=True)
        try:
            rows: List[tuple] = con.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'main'
                  AND table_type = 'BASE TABLE'
                """
            ).fetchall()
        finally:
            con.close()
    else:
        raise ValueError(f"Unsupported source type: {type(source)}")    
     
    tables = [r[0] for r in rows]
    if len(tables) == 0:
        raise ValueError("No tables found in DuckDB database.")
    if len(tables) > 1:
        raise ValueError(f"Expected exactly one table in database, found: {tables}")
    return tables[0]


def count_rows(
    source: Union[duckdb.DuckDBPyConnection, Path],
    years: List[int] = None,
    geographies: List[str] = None,
    sectors: List[str] = None
) -> int:
    """
    Count rows in a DuckDB table or Parquet scaffold.

    - If `source` is a DuckDB connection, `table` is required.
    - If `source` is a Path to a .duckdb file, a temporary read-only connection is used; `table` is required.
    - If `source` is a Path to a directory, treats it as a Parquet scaffold and applies optional partition filters.
    """

    table = infer_single_table(source)

    # DuckDB connection
    if isinstance(source, duckdb.DuckDBPyConnection):
        if not table:
            raise ValueError("`table` must be provided for DuckDB sources.")
        return source.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]

    src = Path(source)
    # DuckDB file
    if src.is_file() and src.suffix == '.duckdb':
        if not table:
            raise ValueError("`table` must be provided for DuckDB files.")
        con = duckdb.connect(database=str(src), read_only=True)
        try:
            return con.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        finally:
            con.close()
    # Parquet scaffold
    if src.is_dir():
        con = duckdb.connect()
        try:
            sql = [f"SELECT COUNT(*) FROM parquet_scan('{src}')"]
            clauses = []
            if years:
                yrs = ','.join(str(y) for y in years)
                clauses.append(f"timestamp_year IN ({yrs})")
            if geographies:
                geogs = ','.join(f"'{g}'" for g in geographies)
                clauses.append(f"geography IN ({geogs})")
            if sectors:
                secs = ','.join(f"'{s}'" for s in sectors)
                clauses.append(f"sector IN ({secs})")
            if clauses:
                sql.append("WHERE " + " AND ".join(clauses))
            return con.execute(" ".join(sql)).fetchone()[0]
        finally:
            con.close()
    raise ValueError(f"Unsupported source for count_rows: {source}")


def list_columns(
    source: Union[duckdb.DuckDBPyConnection, Path]
) -> List[str]:
    """
    List columns in a DuckDB table or Parquet scaffold.

    - If `source` is a DuckDB connection or .duckdb file, `table` is required.
    - If `source` is a directory, reads schema via parquet_scan LIMIT 0.
    """

    table = infer_single_table(source)

    # DuckDB connection
    if isinstance(source, duckdb.DuckDBPyConnection):
        if not table:
            raise ValueError("`table` must be provided for DuckDB sources.")
        rows = source.execute(
            f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'"
        ).fetchall()
        return [r[0] for r in rows]

    src = Path(source)
    # DuckDB file
    if src.is_file() and src.suffix == '.duckdb':
        if not table:
            raise ValueError("`table` must be provided for DuckDB files.")
        con = duckdb.connect(database=str(src), read_only=True)
        try:
            rows = con.execute(
                f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'"
            ).fetchall()
            return [r[0] for r in rows]
        finally:
            con.close()
    # Parquet scaffold
    if src.is_dir():
        con = duckdb.connect()
        try:
            df = con.execute(f"SELECT * FROM parquet_scan('{src}') LIMIT 0").fetchdf()
            return list(df.columns)
        finally:
            con.close()
    raise ValueError(f"Unsupported source for list_columns: {source}")


import duckdb
import json
import pandas as pd
from pathlib import Path
from typing import Union, List, Optional

from generator.library.db import infer_single_table

def read_data(
    source: Union[duckdb.DuckDBPyConnection, Path],
    years: List[int] = None,
    geographies: List[str] = None,
    sectors: List[str] = None,
    where: Optional[str] = None,
    limit: Optional[int] = None
) -> pd.DataFrame:
    """
    Read rows from a DuckDB table or Parquet scaffold, preserving the original
    column order and dropping any scaffold-added columns as recorded in
    `_column_metadata.json`.

    - For DuckDB sources (connection or .duckdb), `table` is required;
      optional `where` and `limit` apply.
    - For Parquet scaffolds (directory), filters by `years`, `geographies`,
      and `sectors` only.
    """
    def apply_metadata(path: Path, df: pd.DataFrame) -> pd.DataFrame:
        meta_file = path / "_column_metadata.json"
        if meta_file.exists():
            info = json.loads(meta_file.read_text())
            col_order = info.get("column_order", [])
            added = set(info.get("added_columns", []))
            # keep only originally written columns, in the recorded order
            keep = [c for c in col_order if c in df.columns and c not in added]
            return df[keep]
        return df

    # DuckDB connection
    if isinstance(source, duckdb.DuckDBPyConnection):
        table = infer_single_table(source)
        if not table:
            raise ValueError("`table` must be provided for DuckDB sources.")
        query = f"SELECT * FROM {table}"
        if where:
            query += f" WHERE {where}"
        if limit:
            query += f" LIMIT {limit}"
        df = source.execute(query).fetchdf()
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        return df

    src = Path(source)
    # .duckdb file
    if src.is_file() and src.suffix == '.duckdb':
        con = duckdb.connect(database=str(src), read_only=True)
        try:
            table = infer_single_table(con)
            if not table:
                raise ValueError("`table` must be provided for DuckDB files.")
            query = f"SELECT * FROM {table}"
            if where:
                query += f" WHERE {where}"
            if limit:
                query += f" LIMIT {limit}"
            df = con.execute(query).fetchdf()
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            # apply metadata to drop scaffold-added columns
            return apply_metadata(src, df)
        finally:
            con.close()

    # Parquet scaffold
    if src.is_dir():
        con = duckdb.connect()
        try:
            sql = [f"SELECT * FROM parquet_scan('{str(src / '**' / '*.parquet')}', hive_partitioning=TRUE)"]
            clauses = []
            if years:
                yrs = ','.join(str(y) for y in years)
                clauses.append(f"timestamp_year IN ({yrs})")
            if geographies:
                geogs = ','.join(f"'{g}'" for g in geographies)
                clauses.append(f"geography IN ({geogs})")
            if sectors:
                secs = ','.join(f"'{s}'" for s in sectors)
                clauses.append(f"sector IN ({secs})")
            if clauses:
                sql.append("WHERE " + " AND ".join(clauses))
            if limit:
                sql.append(f"LIMIT {limit}")
            query = " ".join(sql)
            df = con.execute(query).fetchdf()
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            # apply metadata to drop scaffold-added columns
            return apply_metadata(src, df)
        finally:
            con.close()

    raise ValueError(f"Unsupported source for read_data: {source}")

def write_df_to_scaffold(
    df: pd.DataFrame,
    root_path: Path,
    partition_specs: List[Union[str, tuple[str, str]]] = ["timestamp_year", "geography", "sector"],
    parquet_kwargs: Optional[dict] = None
) -> None:
    """
    Write a DataFrame to a Hive-style partitioned Parquet scaffold, recording
    the exact column order and any added partition columns in metadata.

    Args:
        df: DataFrame; must include a 'timestamp' column.
        root_path: base directory for the scaffold; will be created if missing.
        partition_specs: list of either:
          - str: existing column or builtin ('timestamp_year' or 'year')
          - tuple(orig_col, part_name): derive new column part_name from df[orig_col]
        parquet_kwargs: passed through to pandas.to_parquet (engine, compression, etc.)
    """
    root = Path(root_path)
    root.mkdir(parents=True, exist_ok=True)

    # 1) Prepare and normalize
    df_out = df.copy()
    df_out['timestamp'] = pd.to_datetime(df_out['timestamp'])

    # 2) Capture the original columns
    base_columns = df_out.columns.tolist()

    # 3) Derive partitions
    actual_parts: List[str] = []
    for spec in partition_specs:
        if isinstance(spec, str):
            if spec in ('timestamp_year', 'year'):
                part_name = 'timestamp_year'
                df_out[part_name] = df_out['timestamp'].dt.year.astype(str)
                actual_parts.append(part_name)
            else:
                if spec not in df_out.columns:
                    raise ValueError(f"Partition column '{spec}' not found in DataFrame.")
                actual_parts.append(spec)
        else:
            orig_col, part_name = spec
            if orig_col == 'timestamp' and part_name in ('timestamp_year', 'year'):
                df_out[part_name] = df_out['timestamp'].dt.year.astype(str)
                actual_parts.append(part_name)
            else:
                if orig_col not in df_out.columns:
                    raise ValueError(f"Partition column '{orig_col}' not found in DataFrame.")
                df_out[part_name] = df_out[orig_col]
                actual_parts.append(part_name)

    # 4) Write the Parquet dataset
    if parquet_kwargs is None:
        parquet_kwargs = {'engine': 'pyarrow', 'compression': 'snappy', 'index': False}
    df_out.to_parquet(str(root), partition_cols=actual_parts, **parquet_kwargs)

    # 5) Record metadata: final column order and which were added
    final_columns = df_out.columns.tolist()
    added_columns = [c for c in final_columns if c not in base_columns]

    metadata = {
        "column_order": final_columns,
        "added_columns": added_columns
    }
    (root / "_column_metadata.json").write_text(json.dumps(metadata, indent=2))

def delete_duckdb_file(db_path: Path) -> bool:
    """
    Delete a DuckDB database file safely.

    Returns True if deleted, False if not found. Raises on other errors.
    """
    db_file = Path(db_path)
    if not db_file.exists():
        return False
    if db_file.suffix != '.duckdb':
        raise ValueError(f"Expected a .duckdb file, got: {db_file.suffix}")
    try:
        con = None
        try:
            con = duckdb.connect(str(db_file))
        except duckdb.Error:
            pass
        if con:
            con.close()
        os.remove(db_file)
        return True
    except Exception as e:
        raise RuntimeError(f"Failed to delete {db_file}: {e}")
