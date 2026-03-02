"""Tests for generator.library.curves."""

import pytest
import pandas as pd
import numpy as np
from pathlib import Path

from generator.library.curves import (
    generate_constant,
    generate_linear,
    generate_s_curve,
    generate_exponential_growth,
    apply_growth_curve_to_value,
    load_curve,
    curve_to_series,
    validate_curve_alignment,
    map_curve_to_values,
    load_and_prepare_curve,
)


# ---------------------------------------------------------------------------
# generate_constant
# ---------------------------------------------------------------------------

class TestGenerateConstant:
    def test_all_values_equal(self):
        """Every value should equal the specified constant."""
        df = generate_constant("flat", 2025, 2025, 42.0, resolution="1D")
        assert (df["value"] == 42.0).all()

    def test_columns(self):
        """DataFrame should have curve_id, timestamp, and value columns."""
        df = generate_constant("flat", 2025, 2025, 1.0, resolution="1D")
        assert list(df.columns) == ["curve_id", "timestamp", "value"]
        assert (df["curve_id"] == "flat").all()

    def test_length(self):
        """Length should match the timestamp range at given resolution."""
        df = generate_constant("c", 2025, 2025, 1.0, resolution="1D")
        expected = len(pd.date_range("2025-01-01", "2025-12-31 23:59:59", freq="1D"))
        assert len(df) == expected


# ---------------------------------------------------------------------------
# generate_linear
# ---------------------------------------------------------------------------

class TestGenerateLinear:
    def test_basic_shape(self):
        """Linear curve should start at y0 and end at y1."""
        df = generate_linear("lin", 2025, 2030, 0.0, 1.0, resolution="1D")
        assert df["value"].iloc[0] == pytest.approx(0.0, abs=1e-9)
        assert df["value"].iloc[-1] == pytest.approx(1.0, abs=1e-9)

    def test_midpoint(self):
        """Value at the midpoint should be approximately (y0+y1)/2."""
        df = generate_linear("lin", 2025, 2030, 0.0, 1.0, resolution="1D")
        mid = len(df) // 2
        assert df["value"].iloc[mid] == pytest.approx(0.5, abs=0.01)

    def test_columns(self):
        """DataFrame should have curve_id, timestamp, and value columns."""
        df = generate_linear("lin", 2025, 2026, 0, 1)
        assert list(df.columns) == ["curve_id", "timestamp", "value"]
        assert (df["curve_id"] == "lin").all()

    def test_decreasing(self):
        """Linear curve from high to low should decrease monotonically."""
        df = generate_linear("dec", 2025, 2030, 10.0, 2.0, resolution="1D")
        values = df["value"].values
        assert all(values[i] >= values[i + 1] for i in range(len(values) - 1))

    def test_length(self):
        """Length should match the timestamp range at given resolution."""
        df = generate_linear("lin", 2025, 2025, 0, 1, resolution="1h")
        expected = len(pd.date_range("2025-01-01", "2025-12-31 23:59:59", freq="1h"))
        assert len(df) == expected


# ---------------------------------------------------------------------------
# generate_s_curve
# ---------------------------------------------------------------------------

class TestGenerateSCurve:
    def test_basic_shape(self):
        """S-curve should start near y0 and end near y1."""
        df = generate_s_curve("test", 2025, 2030, y0=0.0, y1=1.0)
        assert df["value"].iloc[0] == pytest.approx(0.0, abs=0.05)
        assert df["value"].iloc[-1] == pytest.approx(1.0, abs=0.05)

    def test_correct_length(self):
        """Hourly resolution over 1 year should produce many rows."""
        df = generate_s_curve("c1", 2025, 2025, y0=0.0, y1=1.0, resolution="1h")
        expected = len(pd.date_range("2025-01-01", "2025-12-31 23:59:59", freq="1h"))
        assert len(df) == expected

    def test_timestamp_range(self):
        """First and last timestamps should match the requested years."""
        df = generate_s_curve("c1", 2025, 2026, y0=0, y1=1)
        assert df["timestamp"].iloc[0] == pd.Timestamp("2025-01-01 00:00:00")
        assert df["timestamp"].iloc[-1].year == 2026

    def test_midpoint_parameter(self):
        """Custom midpoint shifts the inflection point."""
        df_early = generate_s_curve("e", 2025, 2035, 0, 1, midpoint="2027-01-01")
        df_late = generate_s_curve("l", 2025, 2035, 0, 1, midpoint="2033-01-01")
        mid_idx = len(df_early) // 2
        assert df_early["value"].iloc[mid_idx] > df_late["value"].iloc[mid_idx]

    def test_string_steepness(self):
        """Steepness given as '10y' string should produce a valid curve."""
        df = generate_s_curve("s", 2025, 2050, 0.0, 1.0, steepness="10y")
        assert len(df) > 0
        assert df["value"].iloc[0] < df["value"].iloc[-1]

    def test_custom_midpoint_string(self):
        """Midpoint given as a string timestamp should be accepted."""
        df = generate_s_curve("m", 2025, 2030, 0, 100, midpoint="2028-06-15")
        assert len(df) > 0
        assert "timestamp" in df.columns and "value" in df.columns

    def test_columns(self):
        """DataFrame should have curve_id, timestamp, and value columns."""
        df = generate_s_curve("id1", 2025, 2026, 0, 1)
        assert list(df.columns) == ["curve_id", "timestamp", "value"]
        assert (df["curve_id"] == "id1").all()


# ---------------------------------------------------------------------------
# generate_exponential_growth
# ---------------------------------------------------------------------------

class TestGenerateExponentialGrowth:
    def test_value_starts_near_one(self):
        """Growth factor at the start should be approximately 1.0."""
        df = generate_exponential_growth("g1", 2025, 2030, annual_growth=0.02)
        assert df["value"].iloc[0] == pytest.approx(1.0, abs=1e-6)

    def test_value_increases(self):
        """Growth factor should increase over time."""
        df = generate_exponential_growth("g1", 2025, 2030, annual_growth=0.02)
        assert df["value"].iloc[-1] > df["value"].iloc[0]

    def test_correct_columns(self):
        """DataFrame should have curve_id, timestamp, value."""
        df = generate_exponential_growth("g1", 2025, 2026, annual_growth=0.02)
        assert list(df.columns) == ["curve_id", "timestamp", "value"]

    def test_five_year_growth_factor(self):
        """After ~5 years at 2% growth, factor should be ~(1.02)^5."""
        df = generate_exponential_growth("g1", 2025, 2030, annual_growth=0.02)
        expected = (1.02) ** 5
        assert df["value"].iloc[-1] == pytest.approx(expected, rel=0.05)

    def test_y0_y1_mode(self):
        """Endpoint mode should start at y0 and end at y1."""
        df = generate_exponential_growth("g2", 2025, 2030, y0=100.0, y1=150.0)
        assert df["value"].iloc[0] == pytest.approx(100.0, abs=1e-6)
        assert df["value"].iloc[-1] == pytest.approx(150.0, rel=0.01)

    def test_y0_y1_equivalence_with_annual_growth(self):
        """Endpoint mode result should match rate mode for consistent params."""
        # Generate rate-mode curve and use its actual endpoint as y1
        df_rate = generate_exponential_growth("r", 2025, 2030, annual_growth=0.02, resolution="1D")
        y1 = df_rate["value"].iloc[-1]
        df_endpoint = generate_exponential_growth("e", 2025, 2030, y0=1.0, y1=y1, resolution="1D")
        np.testing.assert_allclose(
            df_rate["value"].values, df_endpoint["value"].values, rtol=1e-6
        )

    def test_both_params_raises(self):
        """Providing both y1 and annual_growth should raise ValueError."""
        with pytest.raises(ValueError, match="not both"):
            generate_exponential_growth("g", 2025, 2030, y1=2.0, annual_growth=0.02)

    def test_neither_param_raises(self):
        """Providing neither y1 nor annual_growth should raise ValueError."""
        with pytest.raises(ValueError, match="either"):
            generate_exponential_growth("g", 2025, 2030)


# ---------------------------------------------------------------------------
# apply_growth_curve_to_value
# ---------------------------------------------------------------------------

class TestApplyGrowthCurveToValue:
    def test_multiply_mode(self, sample_demand_df, sample_curve_df):
        """Multiply mode should scale values by growth factors."""
        result = apply_growth_curve_to_value(sample_demand_df, sample_curve_df, how="multiply")
        assert result["value"].iloc[0] == pytest.approx(
            sample_demand_df["value"].iloc[0] * sample_curve_df["value"].iloc[0], rel=1e-6
        )

    def test_add_mode(self, sample_demand_df, sample_curve_df):
        """Add mode should add curve values to original."""
        result = apply_growth_curve_to_value(sample_demand_df, sample_curve_df, how="add")
        expected_first = sample_demand_df["value"].iloc[0] + sample_curve_df["value"].iloc[0]
        assert result["value"].iloc[0] == pytest.approx(expected_first, rel=1e-6)

    def test_missing_timestamp_raises(self):
        """DataFrame without 'timestamp' column should raise ValueError."""
        df = pd.DataFrame({"value": [1, 2, 3]})
        curve = pd.DataFrame({"timestamp": [1, 2, 3], "value": [1.0, 1.1, 1.2]})
        with pytest.raises(ValueError, match="timestamp"):
            apply_growth_curve_to_value(df, curve)

    def test_missing_curve_columns_raises(self, sample_demand_df):
        """Curve without 'timestamp' and 'value' should raise ValueError."""
        bad_curve = pd.DataFrame({"ts": [1], "factor": [1.0]})
        with pytest.raises(ValueError, match="curve_df must have"):
            apply_growth_curve_to_value(sample_demand_df, bad_curve)

    def test_extra_curve_columns_allowed(self, sample_demand_df, sample_curve_df):
        """Curve with extra columns (like curve_id) should work fine."""
        curve_with_id = sample_curve_df.copy()
        curve_with_id["curve_id"] = "growth"
        result = apply_growth_curve_to_value(sample_demand_df, curve_with_id, how="multiply")
        assert result["value"].iloc[0] == pytest.approx(
            sample_demand_df["value"].iloc[0] * sample_curve_df["value"].iloc[0], rel=1e-6
        )
        assert "curve_id" not in result.columns  # extra cols not leaked


# ---------------------------------------------------------------------------
# load_curve
# ---------------------------------------------------------------------------

class TestLoadCurve:
    def test_series_passthrough(self):
        """Series input should be returned as-is."""
        s = pd.Series([1.0, 1.1], index=pd.date_range("2025-01-01", periods=2, freq="D"))
        result = load_curve(s)
        assert result is s

    def test_dataframe_passthrough(self):
        """DataFrame input should be returned as-is."""
        df = pd.DataFrame({"timestamp": ["2025-01-01"], "value": [1.0]})
        result = load_curve(df)
        assert result is df

    def test_dict_mapping(self):
        """Dict input should be converted to a plain dict."""
        d = {"2025-01-01": 1.0, "2025-01-02": 1.1}
        result = load_curve(d)
        assert isinstance(result, dict)
        assert result == d

    def test_parquet_file(self, tmp_dir):
        """Parquet file should be loaded into a DataFrame."""
        df = pd.DataFrame({"timestamp": pd.date_range("2025-01-01", periods=3, freq="D"), "value": [1.0, 1.1, 1.2]})
        path = tmp_dir / "curve.parquet"
        df.to_parquet(path, index=False)
        result = load_curve(path)
        assert isinstance(result, pd.DataFrame)
        assert len(result) == 3

    def test_csv_file(self, tmp_dir):
        """CSV file should be loaded into a DataFrame."""
        df = pd.DataFrame({"timestamp": ["2025-01-01", "2025-01-02"], "value": [1.0, 1.1]})
        path = tmp_dir / "curve.csv"
        df.to_csv(path, index=False)
        result = load_curve(path)
        assert isinstance(result, pd.DataFrame)
        assert len(result) == 2

    def test_unsupported_extension_raises(self, tmp_dir):
        """Unsupported file extension should raise ValueError."""
        path = tmp_dir / "curve.xlsx"
        path.touch()
        with pytest.raises(ValueError, match="Unsupported curve file extension"):
            load_curve(path)


# ---------------------------------------------------------------------------
# curve_to_series
# ---------------------------------------------------------------------------

class TestCurveToSeries:
    def test_from_series(self):
        """Series should be returned sorted with DatetimeIndex."""
        idx = pd.to_datetime(["2025-01-03", "2025-01-01", "2025-01-02"])
        s = pd.Series([3, 1, 2], index=idx)
        result = curve_to_series(s)
        assert isinstance(result.index, pd.DatetimeIndex)
        assert list(result.values) == [1, 2, 3]

    def test_from_dataframe(self):
        """DataFrame with 'timestamp' and 'value' columns should work."""
        df = pd.DataFrame({
            "timestamp": pd.date_range("2025-01-01", periods=3, freq="D"),
            "value": [1.0, 1.1, 1.2],
        })
        result = curve_to_series(df)
        assert isinstance(result, pd.Series)
        assert len(result) == 3

    def test_from_dict(self):
        """Dict of timestamp->factor should be converted to Series."""
        d = {"2025-01-01": 1.0, "2025-01-02": 1.1}
        result = curve_to_series(d)
        assert isinstance(result, pd.Series)
        assert len(result) == 2


# ---------------------------------------------------------------------------
# validate_curve_alignment
# ---------------------------------------------------------------------------

class TestValidateCurveAlignment:
    def test_complete_coverage_passes(self):
        """Curve covering all data timestamps should pass."""
        idx = pd.date_range("2025-01-01", periods=24, freq="1h")
        curve = pd.Series(np.ones(24), index=idx)
        validate_curve_alignment(curve, data_index=idx)  # should not raise

    def test_missing_timestamps_raises(self):
        """Curve missing timestamps that are in data_index should raise."""
        data_idx = pd.date_range("2025-01-01", periods=24, freq="1h")
        curve_idx = pd.date_range("2025-01-01", periods=12, freq="1h")
        curve = pd.Series(np.ones(12), index=curve_idx)
        with pytest.raises(ValueError, match="missing"):
            validate_curve_alignment(curve, data_index=data_idx)

    def test_bounds_check(self):
        """Curve starting after required_min should raise."""
        idx = pd.date_range("2025-01-02", periods=24, freq="1h")
        curve = pd.Series(np.ones(24), index=idx)
        with pytest.raises(ValueError, match="earlier coverage required"):
            validate_curve_alignment(
                curve,
                data_index=idx,
                required_min=pd.Timestamp("2025-01-01"),
            )


# ---------------------------------------------------------------------------
# map_curve_to_values
# ---------------------------------------------------------------------------

class TestMapCurveToValues:
    def test_error_mode(self):
        """Error mode should raise when timestamps are missing."""
        idx = pd.date_range("2025-01-01", periods=5, freq="1h")
        curve = pd.Series([1.0, 1.1, 1.2], index=idx[:3])
        with pytest.raises(ValueError, match="Missing"):
            map_curve_to_values(idx, curve, on_missing="error")

    def test_error_mode_exact_match(self):
        """Error mode with perfect coverage should return matching values."""
        idx = pd.date_range("2025-01-01", periods=3, freq="1h")
        curve = pd.Series([1.0, 1.1, 1.2], index=idx)
        result = map_curve_to_values(idx, curve, on_missing="error")
        assert list(result.values) == [1.0, 1.1, 1.2]

    def test_ffill_mode(self):
        """Forward-fill mode should fill gaps using previous values."""
        curve_idx = pd.to_datetime(["2025-01-01 00:00", "2025-01-01 02:00"])
        curve = pd.Series([1.0, 2.0], index=curve_idx)
        query_idx = pd.date_range("2025-01-01", periods=3, freq="1h")
        result = map_curve_to_values(query_idx, curve, on_missing="ffill")
        assert result.iloc[0] == 1.0
        assert result.iloc[1] == 1.0  # forward-filled
        assert result.iloc[2] == 2.0


# ---------------------------------------------------------------------------
# load_and_prepare_curve
# ---------------------------------------------------------------------------

class TestLoadAndPrepareCurve:
    def test_end_to_end_from_dataframe(self):
        """Convenience function should accept a DataFrame and return a Series."""
        df = pd.DataFrame({
            "timestamp": pd.date_range("2025-01-01", periods=5, freq="D"),
            "value": [1.0, 1.01, 1.02, 1.03, 1.04],
        })
        result = load_and_prepare_curve(df)
        assert isinstance(result, pd.Series)
        assert len(result) == 5

    def test_end_to_end_from_dict(self):
        """Convenience function should accept a dict and return a Series."""
        d = {"2025-01-01": 1.0, "2025-01-02": 1.1}
        result = load_and_prepare_curve(d)
        assert isinstance(result, pd.Series)
        assert len(result) == 2

    def test_end_to_end_from_parquet(self, tmp_dir):
        """Convenience function should load a parquet file and return a Series."""
        df = pd.DataFrame({
            "timestamp": pd.date_range("2025-01-01", periods=3, freq="D"),
            "value": [1.0, 1.1, 1.2],
        })
        path = tmp_dir / "curve.parquet"
        df.to_parquet(path, index=False)
        result = load_and_prepare_curve(str(path))
        assert isinstance(result, pd.Series)
        assert len(result) == 3
