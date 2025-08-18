from __future__ import annotations

import numpy as np
import pandas as pd

from pathlib import Path
from typing import Any, Mapping, Optional, Union

def generate_s_curve(
    curve_id: str,
    start_year: int,
    end_year: int,
    y0: float,
    y1: float,
    resolution: str = "1h",  # '1h', '1D', etc.
    midpoint: str = None,  # optional override
    steepness: float = 10.0  # higher = faster transition
) -> pd.DataFrame:
    """
    Generate a timestamp-indexed logistic S-curve from y0 to y1.

    Now uses actual time deltas for leap-safe and precise interpolation.
    """
    start = pd.Timestamp(f"{start_year}-01-01 00:00:00")
    end = pd.Timestamp(f"{end_year}-12-31 23:59:59")
    ts = pd.date_range(start=start, end=end, freq=resolution)

    # Midpoint in time
    if midpoint is None:
        midpoint = start + (end - start) / 2
    else:
        midpoint = pd.Timestamp(midpoint)

    # Compute time offset in seconds
    seconds_total = (end - start).total_seconds()
    seconds_from_mid = (ts - midpoint).total_seconds()

    # Logistic curve based on normalized offset from midpoint
    # Allow steepness to represent transition width in years (90% transition)
    if isinstance(steepness, str) and steepness.endswith("y"):
        transition_years = float(steepness[:-1])
        seconds_for_90pct = transition_years * 365.25 * 24 * 3600
        x = 6 * seconds_from_mid / seconds_for_90pct
    else:
        # fallback to raw steepness multiplier
        x = steepness * seconds_from_mid / seconds_total
    values = y0 + (y1 - y0) / (1 + np.exp(-x))

    return pd.DataFrame({
        "curve_id": curve_id,
        "timestamp": ts,
        "value": values
    })

def generate_exponential_growth(
    curve_id: str,
    start_year: int,
    end_year: int,
    resolution: str = "1h",
    annual_growth: float = 0.02,
) -> pd.DataFrame:
    """
    Generate a smooth growth curve from start_year to end_year where the value grows
    exponentially by `annual_growth` per year, spread evenly across the resolution.

    Returns a DataFrame with:
        - curve_id
        - timestamp
        - value (multiplicative growth factor)
    """
    # Create timestamp range
    start_ts = pd.Timestamp(f"{start_year}-01-01 00:00:00")
    end_ts = pd.Timestamp(f"{end_year}-12-31 23:59:59")
    timestamps = pd.date_range(start=start_ts, end=end_ts, freq=resolution)

    # Compute fractional years since start
    seconds_per_year = 365.25 * 24 * 3600
    seconds_since_start = (timestamps - start_ts).total_seconds()
    years_since_start = seconds_since_start / seconds_per_year

    # Apply exponential growth
    growth_factors = (1 + annual_growth) ** years_since_start

    return pd.DataFrame({
        "curve_id": curve_id,
        "timestamp": timestamps,
        "value": growth_factors
    })

CurveLike = Union[
    pd.Series,                 # index = DatetimeIndex, values = factors
    pd.DataFrame,              # columns: ['timestamp', 'value'|'factor'|'multiplier']
    Mapping[Union[str, pd.Timestamp], float],  # timestamp -> factor
    str,
    Path,
]

def apply_growth_curve_to_value(
    df: pd.DataFrame,
    curve_df: pd.DataFrame,
    *,
    how: str = "multiply",
    target_col: str = "value"
) -> pd.DataFrame:
    """
    Join a growth curve (timestamp/value) onto df by timestamp and apply it
    to df[target_col] either by multiplying or adding.

    Parameters
    ----------
    df : DataFrame
        Must contain 'timestamp' and the target_col.
    curve_df : DataFrame
        Must contain 'timestamp' and 'value' (growth factors or increments).
    how : {'multiply', 'add'}, default 'multiply'
        How to apply the growth curve to the target column.
    target_col : str, default 'value'
        Column in df to transform.

    Returns
    -------
    DataFrame
        New DataFrame with target_col transformed.
    """
    if "timestamp" not in df.columns:
        raise ValueError("df must have a 'timestamp' column")
    if target_col not in df.columns:
        raise ValueError(f"df must have '{target_col}' column")
    if set(curve_df.columns) != {"timestamp", "value"}:
        raise ValueError("curve_df must have exactly ['timestamp', 'value'] columns")

    merged = df.merge(curve_df, on="timestamp", how="left", suffixes=("", "_curve"))

    # NOTE: the curve's column is 'value_curve' after merge
    curve_col = "value_curve"
    if curve_col not in merged.columns:
        raise RuntimeError("Internal error: expected 'value_curve' after merge.")

    if how == "multiply":
        merged[target_col] = merged[target_col] * merged[curve_col]
    elif how == "add":
        merged[target_col] = merged[target_col] + merged[curve_col]
    else:
        raise ValueError("how must be 'multiply' or 'add'")

    # drop only the curve column
    return merged.drop(columns=[curve_col])


def load_curve(curve: CurveLike) -> Any:
    """
    Load a growth curve from a flexible input:
      - pd.Series with a DatetimeIndex
      - pd.DataFrame with columns ['timestamp', 'value' | 'factor' | 'multiplier']
      - Mapping[timestamp->factor]
      - Path/str to a parquet or csv with the above DataFrame shape

    Returns the same python object for in-memory inputs; for file inputs returns a DataFrame.
    """
    if isinstance(curve, (pd.Series, pd.DataFrame)):
        return curve

    if isinstance(curve, (str, Path)):
        p = Path(curve)
        suf = p.suffix.lower()
        if suf in {".parquet", ".pq"}:
            return pd.read_parquet(p)
        if suf == ".csv":
            return pd.read_csv(p)
        raise ValueError(f"Unsupported curve file extension: {p.suffix}. Use .parquet or .csv.")

    # mapping/dict-like
    if isinstance(curve, Mapping):
        return dict(curve)

    raise TypeError(
        "Unsupported curve type. Provide a pandas Series (DatetimeIndex), "
        "DataFrame with ['timestamp','value'| 'factor' | 'multiplier'], "
        "a mapping timestamp->factor, or a path to parquet/csv."
    )


def curve_to_series(curve_obj: Any, *, name: str = "value") -> pd.Series:
    """
    Normalize a curve into a pandas Series indexed by Timestamp with multiplicative factors.

    Accepted shapes:
      - Series: will be sorted; index coerced to DatetimeIndex if needed
      - DataFrame: must contain 'timestamp' and one of ['value','factor','multiplier']
      - Mapping: keys coerced to timestamps
    """
    # Series
    if isinstance(curve_obj, pd.Series):
        s = curve_obj.copy()
        if not isinstance(s.index, pd.DatetimeIndex):
            s.index = pd.to_datetime(s.index, utc=False)
        s = s.sort_index()
        if s.name is None:
            s.name = name
        return s

    # DataFrame
    if isinstance(curve_obj, pd.DataFrame):
        dfc = curve_obj.copy()
        cols = {c.lower(): c for c in dfc.columns}
        ts_col = cols.get("timestamp") or cols.get("time") or cols.get("ts")
        val_col = cols.get("value") or cols.get("factor") or cols.get("multiplier")
        if ts_col is None or val_col is None:
            raise ValueError(
                "Curve DataFrame must contain 'timestamp' and one of ['value','factor','multiplier']."
            )
        dfc[ts_col] = pd.to_datetime(dfc[ts_col], utc=False)
        dfc = dfc[[ts_col, val_col]].dropna().sort_values(ts_col)
        return pd.Series(dfc[val_col].values, index=dfc[ts_col].values, name=name)

    # Mapping
    if isinstance(curve_obj, Mapping):
        idx = pd.to_datetime(list(curve_obj.keys()), utc=False)
        vals = list(curve_obj.values())
        s = pd.Series(vals, index=idx, name=name).sort_index()
        return s

    raise TypeError(
        "curve_to_series expects a Series, DataFrame, or mapping. If you passed a path, "
        "call load_curve(path) first."
    )


def validate_curve_alignment(
    curve: pd.Series,
    *,
    data_index: pd.DatetimeIndex,
    required_min: Optional[pd.Timestamp] = None,
    required_max: Optional[pd.Timestamp] = None,
    require_complete_cover: bool = True,
) -> None:
    """
    Validate that a growth curve series aligns with a target index.

    Args:
        curve: pd.Series indexed by Timestamp, containing multiplicative factors.
        data_index: the timestamps you will apply the curve to.
        required_min / required_max: optional absolute bounds the curve must cover.
        require_complete_cover: if True, every timestamp in data_index must exist in curve.
                                If False, missing points are allowed (caller can reindex+ffill).
    Raises:
        ValueError on coverage or alignment issues.
    """
    if not isinstance(curve.index, pd.DatetimeIndex):
        raise ValueError("Curve must have a DatetimeIndex.")

    cmin, cmax = curve.index.min(), curve.index.max()

    # Absolute bounds check (if provided)
    if required_min is not None and cmin > required_min:
        raise ValueError(
            f"Curve starts at {cmin}, earlier coverage required: {required_min}."
        )
    if required_max is not None and cmax < required_max:
        raise ValueError(
            f"Curve ends at {cmax}, later coverage required: {required_max}."
        )

    if require_complete_cover:
        # Check every timestamp is present
        probe = curve.reindex(data_index)
        if probe.isna().any():
            missing = int(probe.isna().sum())
            # for a friendlier hint, show the first few missing stamps
            missing_examples = data_index[probe.isna()][:5]
            raise ValueError(
                f"Curve is missing {missing} timestamps required by data_index. "
                f"Examples: {list(map(str, missing_examples))} ..."
            )


def map_curve_to_values(
    timestamps: pd.Series | pd.DatetimeIndex,
    curve: pd.Series,
    *,
    on_missing: str = "error",  # 'error' | 'ffill' | 'bfill' | 'nearest'
) -> pd.Series:
    """
    Map a validated curve onto a vector of timestamps, returning aligned factors.

    on_missing:
      - 'error' (default): raise if any timestamp is missing
      - 'ffill'/'bfill': use forward/backward fill after reindex
      - 'nearest': use nearest timestamp (ties choose earlier)
    """
    if isinstance(timestamps, pd.Series):
        idx = pd.to_datetime(timestamps.values, utc=False)
    else:
        idx = pd.DatetimeIndex(pd.to_datetime(timestamps, utc=False))

    if on_missing == "error":
        vals = curve.reindex(idx)
        if vals.isna().any():
            n = int(vals.isna().sum())
            raise ValueError(f"Missing {n} factors when mapping curve to timestamps.")
        return pd.Series(vals.values, index=timestamps, name=curve.name or "value")

    if on_missing in {"ffill", "bfill"}:
        vals = curve.reindex(idx).fillna(method=on_missing)
        return pd.Series(vals.values, index=timestamps, name=curve.name or "value")

    if on_missing == "nearest":
        # Use asof (requires curve index sorted ascending)
        s = curve.sort_index()
        vals = pd.Series(index=idx, dtype=float)
        # asof works on DatetimeIndex + monotonic increasing
        vals[:] = s.reindex(idx, method="nearest").values
        return pd.Series(vals.values, index=timestamps, name=curve.name or "value")

    raise ValueError("on_missing must be one of: 'error', 'ffill', 'bfill', 'nearest'.")


# ---------------------------- convenience facade -----------------------------

def load_and_prepare_curve(curve: CurveLike) -> pd.Series:
    """
    One-liner convenience: load any CurveLike and return a normalized Series.
    """
    obj = load_curve(curve)
    return curve_to_series(obj)
