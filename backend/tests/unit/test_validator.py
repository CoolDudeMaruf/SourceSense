"""
Unit tests for the data validation service.

Covers:
  - PM10=0 mid-session → failed_read
  - Humidity spike (7.0%) → sensor_glitch
  - Timestamp gap (14-min) → logging_gap
  - PM1.0=PM2.5=0 in first 5 min → possible_warmup
  - PM1.0=PM2.5=0 after warm-up → below_detection
  - MQ131=0 → failed_read on that channel only
  - Valid row → no flags
"""
import pytest
from datetime import datetime, timedelta
from app.services.validator import (
    validate_reading,
    FLAG_FAILED_READ,
    FLAG_BELOW_DETECTION,
    FLAG_POSSIBLE_WARMUP,
    FLAG_SENSOR_GLITCH,
    FLAG_LOGGING_GAP,
)

BASE_TS = datetime(2026, 8, 6, 6, 15, 15)


def _make_row(ts=None, pm1=0.0, pm25=0.0, pm10=35.0, rh=74.5,
              mq2=228, mq4=197, mq6=154, mq7=339, mq8=210, mq131=94, mq135=173):
    return {
        "Timestamp": ts or BASE_TS,
        "PM1.0": pm1,
        "PM2.5": pm25,
        "PM10": pm10,
        "Humidity_Percent": rh,
        "MQ2": mq2, "MQ4": mq4, "MQ6": mq6,
        "MQ7": mq7, "MQ8": mq8, "MQ131": mq131, "MQ135": mq135,
    }


def _make_prev(pm10=35.0, ts=None):
    return _make_row(pm10=pm10, ts=ts or BASE_TS - timedelta(seconds=2))


class TestPM10ZeroMidSession:
    def test_pm10_zero_with_nonzero_prev_is_failed_read(self):
        """PM10=0 while previous reading had PM10=35 → failed_read."""
        row = _make_row(pm10=0.0)
        prev = _make_prev(pm10=35.0)
        flags = validate_reading(row, prev_row=prev)
        assert flags.get("pm10") == FLAG_FAILED_READ

    def test_pm10_nonzero_is_clean(self):
        """PM10=35 with nonzero prev → no pm10 flag."""
        row = _make_row(pm10=35.0)
        prev = _make_prev(pm10=33.0)
        flags = validate_reading(row, prev_row=prev)
        assert "pm10" not in flags

    def test_pm10_zero_no_prev_is_failed_read(self):
        """PM10=0 with no previous reading (first row) → failed_read (conservative)."""
        row = _make_row(pm10=0.0)
        flags = validate_reading(row, prev_row=None)
        assert flags.get("pm10") == FLAG_FAILED_READ


class TestHumidityGlitch:
    def test_humidity_7_percent_is_glitch(self):
        """RH=7.0 (< 10 threshold) → sensor_glitch."""
        row = _make_row(rh=7.0)
        prev = _make_prev()
        flags = validate_reading(row, prev_row=prev)
        assert flags.get("humidity") == FLAG_SENSOR_GLITCH

    def test_humidity_105_is_glitch(self):
        """RH=105 (> 100 threshold) → sensor_glitch."""
        row = _make_row(rh=105.0)
        flags = validate_reading(row)
        assert flags.get("humidity") == FLAG_SENSOR_GLITCH

    def test_normal_humidity_not_flagged(self):
        """RH=74.5 → no humidity flag."""
        row = _make_row(rh=74.5)
        flags = validate_reading(row)
        assert "humidity" not in flags


class TestTimestampGap:
    def test_14_min_gap_is_logging_gap(self):
        """Gap of 14 minutes between readings → logging_gap."""
        ts_prev = datetime(2026, 8, 6, 6, 1, 5)
        ts_curr = datetime(2026, 8, 6, 6, 15, 15)  # 14 min 10 sec gap
        prev = _make_row(ts=ts_prev)
        curr = _make_row(ts=ts_curr)
        flags = validate_reading(curr, prev_row=prev)
        assert flags.get("timestamp") == FLAG_LOGGING_GAP
        assert flags.get("gap_minutes") > 14.0

    def test_2_sec_gap_is_not_flagged(self):
        """2-second gap (intra-burst) → no timestamp flag."""
        ts_prev = datetime(2026, 8, 6, 6, 15, 15)
        ts_curr = datetime(2026, 8, 6, 6, 15, 17)
        prev = _make_row(ts=ts_prev)
        curr = _make_row(ts=ts_curr)
        flags = validate_reading(curr, prev_row=prev)
        assert "timestamp" not in flags

    def test_6_min_gap_not_flagged(self):
        """6-minute gap (below 10-minute threshold) → no flag."""
        ts_prev = datetime(2026, 8, 6, 6, 1, 5)
        ts_curr = datetime(2026, 8, 6, 6, 7, 5)
        prev = _make_row(ts=ts_prev)
        curr = _make_row(ts=ts_curr)
        flags = validate_reading(curr, prev_row=prev)
        assert "timestamp" not in flags


class TestPMDualZero:
    def test_dual_zero_in_warmup(self):
        """PM1=PM2.5=0, within first 5 min → possible_warmup."""
        first_seen = datetime(2026, 8, 6, 6, 1, 5)
        ts = datetime(2026, 8, 6, 6, 3, 12)  # 2 min into session
        row = _make_row(ts=ts, pm1=0, pm25=0)
        flags = validate_reading(row, node_first_seen=first_seen)
        assert flags.get("pm_dual") == FLAG_POSSIBLE_WARMUP

    def test_dual_zero_after_warmup(self):
        """PM1=PM2.5=0, after 5 min → below_detection."""
        first_seen = datetime(2026, 8, 6, 6, 1, 5)
        ts = datetime(2026, 8, 6, 6, 15, 15)  # 14 min in
        row = _make_row(ts=ts, pm1=0, pm25=0)
        flags = validate_reading(row, node_first_seen=first_seen)
        assert flags.get("pm_dual") == FLAG_BELOW_DETECTION

    def test_nonzero_pm25_not_dual_zero(self):
        """PM2.5=17 → no pm_dual flag."""
        row = _make_row(pm1=0, pm25=17)
        flags = validate_reading(row)
        assert "pm_dual" not in flags


class TestMQZeroRead:
    def test_mq131_zero_flagged(self):
        """MQ131=0 at 06:42:25 → mq131 failed_read."""
        row = _make_row(mq131=0)
        flags = validate_reading(row)
        assert flags.get("mq131") == FLAG_FAILED_READ

    def test_mq131_zero_does_not_affect_other_channels(self):
        """MQ131=0 → only mq131 flagged, not mq2 etc."""
        row = _make_row(mq131=0)
        flags = validate_reading(row)
        assert "mq2" not in flags
        assert "mq7" not in flags

    def test_all_mq_nonzero_clean(self):
        """All MQ sensors > 0 → no MQ flags."""
        row = _make_row()
        flags = validate_reading(row)
        for sensor in ["mq2", "mq4", "mq6", "mq7", "mq8", "mq131", "mq135"]:
            assert sensor not in flags


class TestCleanRow:
    def test_fully_valid_row_has_no_flags(self):
        """A fully valid row (PM values non-zero) produces an empty flags dict."""
        # Use non-zero PM1.0 and PM2.5 to avoid below_detection flag
        row = _make_row(pm1=5.0, pm25=17.0, pm10=40.0, rh=74.5, mq131=94)
        prev = _make_prev(pm10=38.0)
        flags = validate_reading(row, prev_row=prev)
        assert flags == {}
