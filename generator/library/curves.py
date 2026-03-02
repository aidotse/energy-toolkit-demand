"""Curve generators and utilities for energy demand scenario modelling.

See ``generator/CURVES.md`` for full documentation including formulas,
examples, and common patterns.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from pathlib import Path
from typing import Any, Mapping, Optional, Union


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _make_timestamp_range(start_year: int, end_year: int, resolution: str) -> pd.DatetimeIndex:
    """Create a timestamp range spanning full calendar years.

    Parameters
    ----------
    start_year : int
        First year (inclusive, from Jan 1 00:00).
    end_year : int
        Last year (inclusive, through Dec 31 23:59:59).
    resolution : str
        Pandas frequency string (e.g. ``'1h'``, ``'1D'``).

    Returns
    -------
    pd.DatetimeIndex
    """
    start = pd.Timestamp(f"{start_year}-01-01 00:00:00")
    end = pd.Timestamp(f"{end_year}-12-31 23:59:59")
    return pd.date_range(start=start, end=end, freq=resolution)


def _make_curve_df(curve_id: str, timestamps: pd.DatetimeIndex, values) -> pd.DataFrame:
    """Assemble the standard ``[curve_id, timestamp, value]`` DataFrame.

    Parameters
    ----------
    curve_id : str
        Identifier stored in every row.
    timestamps : pd.DatetimeIndex
        Timestamp column.
    values : array-like
        Value column (same length as *timestamps*).

    Returns
    -------
    pd.DataFrame
        Columns: ``curve_id``, ``timestamp``, ``value``.
    """
    return pd.DataFrame({
        "curve_id": curve_id,
        "timestamp": timestamps,
        "value": values,
    })


# ---------------------------------------------------------------------------
# Generators
# ---------------------------------------------------------------------------

def generate_constant(
    curve_id: str,
    start_year: int,
    end_year: int,
    value: float,
    resolution: str = "1h",
) -> pd.DataFrame:
    """Generate a flat curve at a fixed value.

    Useful for baseline "no change" scenarios or as a reference multiplier.

    Parameters
    ----------
    curve_id : str
        Identifier for the curve.
    start_year, end_year : int
        Year range (inclusive).
    value : float
        Constant value at every timestamp.
    resolution : str, default ``'1h'``
        Pandas frequency string.

    Returns
    -------
    pd.DataFrame
        Columns: ``curve_id``, ``timestamp``, ``value``.

    Examples
    --------
    >>> df = generate_constant("baseline", 2025, 2025, 1.0, resolution="1D")
    >>> df["value"].nunique()
    1
    """
    ts = _make_timestamp_range(start_year, end_year, resolution)
    values = np.full(len(ts), value)
    return _make_curve_df(curve_id, ts, values)


def generate_linear(
    curve_id: str,
    start_year: int,
    end_year: int,
    y0: float,
    y1: float,
    resolution: str = "1h",
) -> pd.DataFrame:
    """Generate a linear interpolation from *y0* to *y1*.

    Useful for constant-rate policy phase-ins and simple ramp scenarios.

    Parameters
    ----------
    curve_id : str
        Identifier for the curve.
    start_year, end_year : int
        Year range (inclusive).
    y0 : float
        Value at the start of the range.
    y1 : float
        Value at the end of the range.
    resolution : str, default ``'1h'``
        Pandas frequency string.

    Returns
    -------
    pd.DataFrame
        Columns: ``curve_id``, ``timestamp``, ``value``.

    Examples
    --------
    >>> df = generate_linear("ramp", 2025, 2030, 1.0, 1.5)
    >>> df["value"].iloc[0]
    1.0
    """
    ts = _make_timestamp_range(start_year, end_year, resolution)
    values = np.linspace(y0, y1, len(ts))
    return _make_curve_df(curve_id, ts, values)


def generate_exponential_growth(
    curve_id: str,
    start_year: int,
    end_year: int,
    y0: float = 1.0,
    y1: float | None = None,
    resolution: str = "1h",
    annual_growth: float | None = None,
) -> pd.DataFrame:
    """Generate a smooth exponential growth curve.

    Two mutually exclusive interfaces:

    * **Endpoint mode** — provide *y0* and *y1*; the annual growth rate is
      derived so that the curve passes through both endpoints.
    * **Rate mode** — provide *annual_growth*; the curve starts at *y0* and
      compounds at the given rate.

    Exactly one of *y1* or *annual_growth* must be supplied.

    Parameters
    ----------
    curve_id : str
        Identifier for the curve.
    start_year, end_year : int
        Year range (inclusive).
    y0 : float, default 1.0
        Value at the start of the range.
    y1 : float or None
        Value at the end of the range.  Mutually exclusive with
        *annual_growth*.
    resolution : str, default ``'1h'``
        Pandas frequency string.
    annual_growth : float or None
        Fractional growth per year (e.g. 0.02 for 2 %).  Mutually exclusive
        with *y1*.

    Returns
    -------
    pd.DataFrame
        Columns: ``curve_id``, ``timestamp``, ``value``.

    Raises
    ------
    ValueError
        If both or neither of *y1* and *annual_growth* are provided.

    Examples
    --------
    >>> df = generate_exponential_growth("g", 2025, 2030, annual_growth=0.02)
    >>> df["value"].iloc[0]
    1.0

    >>> df = generate_exponential_growth("g", 2025, 2030, y0=100, y1=150)
    """
    if (y1 is not None) and (annual_growth is not None):
        raise ValueError("Provide either y1 or annual_growth, not both.")
    if (y1 is None) and (annual_growth is None):
        raise ValueError("Provide either y1 or annual_growth.")

    ts = _make_timestamp_range(start_year, end_year, resolution)

    # Fractional years since start
    start_ts = ts[0]
    seconds_per_year = 365.25 * 24 * 3600
    years_since_start = (ts - start_ts).total_seconds() / seconds_per_year

    if annual_growth is not None:
        # Rate mode: y(t) = y0 * (1 + annual_growth) ^ t
        values = y0 * (1 + annual_growth) ** years_since_start
    else:
        # Endpoint mode: solve for rate from y0, y1, total_years
        total_years = years_since_start[-1]
        if total_years == 0:
            values = np.full(len(ts), y0)
        else:
            # y1 = y0 * r^T  =>  r = (y1/y0)^(1/T)
            ratio = y1 / y0
            values = y0 * ratio ** (years_since_start / total_years)

    return _make_curve_df(curve_id, ts, values)


def generate_s_curve(
    curve_id: str,
    start_year: int,
    end_year: int,
    y0: float,
    y1: float,
    resolution: str = "1h",
    midpoint: str = None,
    steepness: float = 10.0,
) -> pd.DataFrame:
    """Generate a logistic S-curve transitioning from *y0* to *y1*.

    Uses actual time deltas for leap-safe and precise interpolation.

    Parameters
    ----------
    curve_id : str
        Identifier for the curve.
    start_year, end_year : int
        Year range (inclusive).
    y0 : float
        Value at the start of the range.
    y1 : float
        Value at the end of the range.
    resolution : str, default ``'1h'``
        Pandas frequency string.
    midpoint : str or None
        ISO timestamp for the inflection point.  Defaults to the midpoint
        of the time range.
    steepness : float or str, default 10.0
        Controls transition speed.  A numeric value is a raw multiplier;
        a string like ``'5y'`` sets the window in which ~90 % of the
        transition occurs.

    Returns
    -------
    pd.DataFrame
        Columns: ``curve_id``, ``timestamp``, ``value``.

    Examples
    --------
    >>> df = generate_s_curve("elec", 2025, 2050, 0.1, 0.9, steepness="5y")
    """
    ts = _make_timestamp_range(start_year, end_year, resolution)
    start = ts[0]
    end = ts[-1] + pd.Timedelta(seconds=1)  # match original end semantics

    # Midpoint in time
    if midpoint is None:
        mid = start + (end - start) / 2
    else:
        mid = pd.Timestamp(midpoint)

    # Compute time offset in seconds
    seconds_total = (end - start).total_seconds()
    seconds_from_mid = (ts - mid).total_seconds()

    # Logistic curve based on normalized offset from midpoint
    if isinstance(steepness, str) and steepness.endswith("y"):
        transition_years = float(steepness[:-1])
        seconds_for_90pct = transition_years * 365.25 * 24 * 3600
        x = 6 * seconds_from_mid / seconds_for_90pct
    else:
        x = steepness * seconds_from_mid / seconds_total

    values = y0 + (y1 - y0) / (1 + np.exp(-x))
    return _make_curve_df(curve_id, ts, values)


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

CurveLike = Union[
    pd.Series,                 # index = DatetimeIndex, values = factors
    pd.DataFrame,              # columns: ['timestamp', 'value'|'factor'|'multiplier']
    Mapping[Union[str, pd.Timestamp], float],  # timestamp -> factor
    str,
    Path,
]


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def apply_growth_curve_to_value(
    df: pd.DataFrame,
    curve_df: pd.DataFrame,
    *,
    how: str = "multiply",
    target_col: str = "value",
) -> pd.DataFrame:
    """Join a growth curve onto *df* by timestamp and apply it.

    Parameters
    ----------
    df : pd.DataFrame
        Must contain ``timestamp`` and *target_col*.
    curve_df : pd.DataFrame
        Must contain ``timestamp`` and ``value`` columns (extra columns
        like ``curve_id`` are allowed and will be ignored).
    how : ``'multiply'`` or ``'add'``, default ``'multiply'``
        How to combine the curve with the target column.
    target_col : str, default ``'value'``
        Column in *df* to transform.

    Returns
    -------
    pd.DataFrame
        Copy of *df* with *target_col* transformed.

    Raises
    ------
    ValueError
        If required columns are missing or *how* is invalid.
    """
    if "timestamp" not in df.columns:
        raise ValueError("df must have a 'timestamp' column")
    if target_col not in df.columns:
        raise ValueError(f"df must have '{target_col}' column")
    if "timestamp" not in curve_df.columns or "value" not in curve_df.columns:
        raise ValueError("curve_df must have 'timestamp' and 'value' columns")

    # Only use timestamp and value from curve_df
    curve_subset = curve_df[["timestamp", "value"]]
    merged = df.merge(curve_subset, on="timestamp", how="left", suffixes=("", "_curve"))

    curve_col = "value_curve"
    if curve_col not in merged.columns:
        raise RuntimeError("Internal error: expected 'value_curve' after merge.")

    if how == "multiply":
        merged[target_col] = merged[target_col] * merged[curve_col]
    elif how == "add":
        merged[target_col] = merged[target_col] + merged[curve_col]
    else:
        raise ValueError("how must be 'multiply' or 'add'")

    return merged.drop(columns=[curve_col])


def load_curve(curve: CurveLike) -> Any:
    """Load a growth curve from a flexible input.

    Parameters
    ----------
    curve : CurveLike
        One of: ``pd.Series`` (DatetimeIndex), ``pd.DataFrame``,
        ``Mapping[timestamp, factor]``, or a path (``str`` / ``Path``)
        to a ``.parquet`` or ``.csv`` file.

    Returns
    -------
    pd.Series, pd.DataFrame, or dict
        The same object for in-memory inputs; a DataFrame for file inputs.

    Raises
    ------
    ValueError
        If a file path has an unsupported extension.
    TypeError
        If *curve* is not a recognised type.
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

    if isinstance(curve, Mapping):
        return dict(curve)

    raise TypeError(
        "Unsupported curve type. Provide a pandas Series (DatetimeIndex), "
        "DataFrame with ['timestamp','value'| 'factor' | 'multiplier'], "
        "a mapping timestamp->factor, or a path to parquet/csv."
    )


def curve_to_series(curve_obj: Any, *, name: str = "value") -> pd.Series:
    """Normalize a curve into a timestamp-indexed Series.

    Parameters
    ----------
    curve_obj : pd.Series, pd.DataFrame, or Mapping
        The curve data.  DataFrames must contain ``timestamp`` and one of
        ``value``, ``factor``, or ``multiplier``.
    name : str, default ``'value'``
        Name assigned to the resulting Series.

    Returns
    -------
    pd.Series
        Sorted by DatetimeIndex.
    """
    if isinstance(curve_obj, pd.Series):
        s = curve_obj.copy()
        if not isinstance(s.index, pd.DatetimeIndex):
            s.index = pd.to_datetime(s.index, utc=False)
        s = s.sort_index()
        if s.name is None:
            s.name = name
        return s

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
    """Validate that a curve covers a target timestamp index.

    Parameters
    ----------
    curve : pd.Series
        Indexed by Timestamp.
    data_index : pd.DatetimeIndex
        Timestamps the curve will be applied to.
    required_min, required_max : pd.Timestamp or None
        Absolute bounds the curve must cover.
    require_complete_cover : bool, default True
        If ``True``, every timestamp in *data_index* must exist in *curve*.

    Raises
    ------
    ValueError
        On coverage or alignment issues.
    """
    if not isinstance(curve.index, pd.DatetimeIndex):
        raise ValueError("Curve must have a DatetimeIndex.")

    cmin, cmax = curve.index.min(), curve.index.max()

    if required_min is not None and cmin > required_min:
        raise ValueError(
            f"Curve starts at {cmin}, earlier coverage required: {required_min}."
        )
    if required_max is not None and cmax < required_max:
        raise ValueError(
            f"Curve ends at {cmax}, later coverage required: {required_max}."
        )

    if require_complete_cover:
        probe = curve.reindex(data_index)
        if probe.isna().any():
            missing = int(probe.isna().sum())
            missing_examples = data_index[probe.isna()][:5]
            raise ValueError(
                f"Curve is missing {missing} timestamps required by data_index. "
                f"Examples: {list(map(str, missing_examples))} ..."
            )


def map_curve_to_values(
    timestamps: pd.Series | pd.DatetimeIndex,
    curve: pd.Series,
    *,
    on_missing: str = "error",
) -> pd.Series:
    """Map a validated curve onto a vector of timestamps.

    Parameters
    ----------
    timestamps : pd.Series or pd.DatetimeIndex
        Target timestamps.
    curve : pd.Series
        Curve indexed by Timestamp.
    on_missing : ``'error'``, ``'ffill'``, ``'bfill'``, or ``'nearest'``
        Strategy for timestamps absent from *curve*.

    Returns
    -------
    pd.Series
        Aligned factors indexed by *timestamps*.

    Raises
    ------
    ValueError
        If *on_missing* is ``'error'`` and timestamps are missing.
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
        reindexed = curve.reindex(idx)
        vals = reindexed.ffill() if on_missing == "ffill" else reindexed.bfill()
        return pd.Series(vals.values, index=timestamps, name=curve.name or "value")

    if on_missing == "nearest":
        s = curve.sort_index()
        vals = s.reindex(idx, method="nearest")
        return pd.Series(vals.values, index=timestamps, name=curve.name or "value")

    raise ValueError("on_missing must be one of: 'error', 'ffill', 'bfill', 'nearest'.")


def load_and_prepare_curve(curve: CurveLike) -> pd.Series:
    """Load any ``CurveLike`` and return a normalized Series.

    Convenience wrapper combining :func:`load_curve` and
    :func:`curve_to_series`.

    Parameters
    ----------
    curve : CurveLike
        Any supported curve input.

    Returns
    -------
    pd.Series
        Sorted, timestamp-indexed Series.
    """
    obj = load_curve(curve)
    return curve_to_series(obj)
