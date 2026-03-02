"""Shared fixtures for generator tests."""

import pytest
import pandas as pd
import numpy as np
from pathlib import Path
import tempfile
import shutil


@pytest.fixture
def tmp_dir():
    """Create a temporary directory that is cleaned up after the test."""
    d = tempfile.mkdtemp()
    yield Path(d)
    shutil.rmtree(d, ignore_errors=True)


@pytest.fixture
def sample_timestamps():
    """Generate sample hourly timestamps for one year."""
    return pd.date_range("2025-01-01", "2025-12-31 23:00:00", freq="1h")


@pytest.fixture
def sample_daily_timestamps():
    """Generate sample daily timestamps for one year."""
    return pd.date_range("2025-01-01", "2025-12-31", freq="1D")


@pytest.fixture
def sample_demand_df(sample_timestamps):
    """Create a sample demand DataFrame."""
    n = len(sample_timestamps)
    return pd.DataFrame({
        "timestamp": sample_timestamps,
        "value": np.random.uniform(100, 500, n),
        "geography": "geo_01",
        "segment": "housing",
    })


@pytest.fixture
def sample_curve_df(sample_timestamps):
    """Create a sample growth curve DataFrame."""
    n = len(sample_timestamps)
    return pd.DataFrame({
        "timestamp": sample_timestamps,
        "value": np.linspace(1.0, 1.05, n),
    })
