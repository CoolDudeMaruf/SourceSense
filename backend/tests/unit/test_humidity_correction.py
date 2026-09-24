"""Unit tests for the humidity correction service."""
import pytest
from app.services.humidity_correction import correct_pm, correct_reading


class TestCorrectPM:
    def test_basic_correction(self):
        """PM correction increases value at 74% RH with default a=0.33, b=0.17."""
        raw = 40.0
        corrected = correct_pm(raw, rh_percent=74.0)
        assert corrected is not None
        assert corrected > raw  # correction always increases PM at high RH

    def test_zero_pm_stays_zero(self):
        """PM_raw=0 → corrected=0 (not negative, not None)."""
        result = correct_pm(0.0, rh_percent=74.0)
        assert result == 0.0

    def test_none_pm_returns_none(self):
        """None PM_raw → None."""
        assert correct_pm(None, rh_percent=74.0) is None

    def test_negative_pm_returns_none(self):
        """Negative PM is invalid → None."""
        assert correct_pm(-5.0, rh_percent=74.0) is None

    def test_formula_at_known_rh(self):
        """Verify formula at RH=74, a=0.33, b=0.17 against manual calculation."""
        rh = 74.0
        a, b = 0.33, 0.17
        raw = 43.0
        denominator = 1.0 - a * (rh / 100) ** b
        expected = round(raw / denominator, 2)
        result = correct_pm(raw, rh_percent=rh, a=a, b=b)
        assert result == pytest.approx(expected, abs=0.01)

    def test_very_high_rh_increases_correction(self):
        """Higher RH → larger correction factor."""
        raw = 30.0
        low_rh = correct_pm(raw, rh_percent=40.0)
        high_rh = correct_pm(raw, rh_percent=95.0)
        assert high_rh > low_rh


class TestCorrectReading:
    def test_skips_pm10_when_flagged(self):
        """pm10_flagged=True → pm10_corrected is None."""
        result = correct_reading(
            pm2_5_raw=17.0, pm10_raw=43.0, effective_rh=74.5,
            pm10_flagged=True
        )
        assert result["pm10_corrected"] is None
        assert result["pm2_5_corrected"] is not None  # PM2.5 still corrected

    def test_skips_all_when_no_rh(self):
        """effective_rh=None with humidity_flagged=True → raw values pass through."""
        result = correct_reading(
            pm2_5_raw=17.0, pm10_raw=43.0, effective_rh=None,
            humidity_flagged=True
        )
        assert result["correction_applied"] is False

    def test_uses_substituted_rh(self):
        """Substituted previous-valid humidity is used for correction."""
        result = correct_reading(
            pm2_5_raw=17.0, pm10_raw=43.0,
            effective_rh=74.5,   # substituted from previous valid reading
            humidity_flagged=True  # current reading is glitched but rh is substituted
        )
        # Since effective_rh is provided, correction should still apply
        assert result["pm10_corrected"] is not None

    def test_correction_applied_flag(self):
        """correction_applied is True when correction runs."""
        result = correct_reading(pm2_5_raw=17.0, pm10_raw=43.0, effective_rh=74.5)
        assert result["correction_applied"] is True
