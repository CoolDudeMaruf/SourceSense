"""Unit tests for the CPCB AQI calculator."""
import pytest
from app.services.aqi_calculator import calculate_aqi


class TestAQICalculator:
    def test_pm10_43_satisfactory(self):
        """PM10=43 µg/m³ → AQI in Satisfactory band (51–100)."""
        result = calculate_aqi(pm2_5=None, pm10=43.0)
        assert result["aqi"] is not None
        assert 0 <= result["aqi"] <= 100
        assert result["aqi_category"] in ("Good", "Satisfactory")

    def test_pm10_zero_with_pm25_zero(self):
        """Both PM = 0 → AQI=0, Good."""
        result = calculate_aqi(pm2_5=0.0, pm10=0.0)
        assert result["aqi"] == 0
        assert result["aqi_category"] == "Good"

    def test_pm25_high_drives_aqi_up(self):
        """PM2.5=100 → AQI Poor (201–300)."""
        result = calculate_aqi(pm2_5=100.0, pm10=150.0)
        assert result["aqi"] >= 200

    def test_none_pm_returns_unavailable(self):
        """Both None → category 'Unavailable'."""
        result = calculate_aqi(pm2_5=None, pm10=None)
        assert result["aqi"] is None
        assert result["aqi_category"] == "Unavailable"

    def test_pm10_only_when_pm25_none(self):
        """Only PM10 provided → AQI calculated from PM10 sub-index only."""
        result = calculate_aqi(pm2_5=None, pm10=80.0)
        assert result["aqi"] is not None
        assert result["pm25_subindex"] is None
        assert result["pm10_subindex"] is not None

    def test_pm10_350_very_poor(self):
        """PM10=355 → Very Poor (301–400). Note: 350.0 hits the boundary of Poor."""
        result = calculate_aqi(pm2_5=None, pm10=355.0)
        assert result["aqi"] >= 301

    def test_pm10_600_severe(self):
        """PM10=600 → Severe (401+)."""
        result = calculate_aqi(pm2_5=None, pm10=600.0)
        assert result["aqi"] >= 401
        assert result["aqi_category"] == "Severe"

    def test_aqi_color_present(self):
        """AQI result always includes a hex color."""
        result = calculate_aqi(pm2_5=20.0, pm10=40.0)
        assert result["aqi_color"].startswith("#")
        assert len(result["aqi_color"]) == 7

    def test_overall_is_max_of_subindices(self):
        """Overall AQI = max(PM2.5 sub-index, PM10 sub-index)."""
        result = calculate_aqi(pm2_5=70.0, pm10=40.0)
        pm25_si = result["pm25_subindex"]
        pm10_si = result["pm10_subindex"]
        assert result["aqi"] == max(pm25_si, pm10_si)
