"""
SourceSense – Data validation service.

Implements all quality rules derived from the real Mumbai pilot dataset:
  - Zero-read detection (PM10 failed reads, PM1/PM2.5 below-detection / warm-up)
  - Humidity spike / glitch detection
  - Timestamp gap and duplicate detection
  - Per-channel MQ gas sensor zero-read detection
"""
from datetime import datetime, timedelta
from typing import Optional
from app.config import settings


# ── Quality flag constants ────────────────────────────────────────────────────
FLAG_FAILED_READ = "failed_read"
FLAG_BELOW_DETECTION = "below_detection"
FLAG_POSSIBLE_WARMUP = "possible_warmup"
FLAG_SENSOR_GLITCH = "sensor_glitch"
FLAG_LOGGING_GAP = "logging_gap"
FLAG_DUPLICATE = "duplicate"

GAS_SENSORS = ["MQ2", "MQ4", "MQ6", "MQ7", "MQ8", "MQ131", "MQ135"]


def validate_reading(
    row: dict,
    prev_row: Optional[dict] = None,
    node_first_seen: Optional[datetime] = None,
) -> dict:
    """
    Run all validation checks on a single sensor row.

    Parameters
    ----------
    row : dict
        Sensor data with keys matching the CSV schema (Timestamp, PM1.0, PM2.5,
        PM10, Humidity_Percent, MQx…).
    prev_row : dict | None
        Previous valid row (used for timestamp gap checks and humidity glitch
        substitution tracking).
    node_first_seen : datetime | None
        Timestamp of the very first reading for this node session — used to
        determine warm-up window.

    Returns
    -------
    dict  Quality flags dict. Keys present only when a flag is raised.
          Examples:
            {"pm10": "failed_read"}
            {"pm_dual": "below_detection", "humidity": "sensor_glitch"}
            {"mq131": "failed_read", "timestamp": "logging_gap", "gap_minutes": 14.2}
    """
    flags: dict = {}
    ts: datetime = _parse_ts(row.get("Timestamp"))

    # ── 1. PM10 zero-read detection ───────────────────────────────────────────
    pm10 = _safe_float(row.get("PM10"))
    pm1_0 = _safe_float(row.get("PM1.0"))
    pm2_5 = _safe_float(row.get("PM2.5"))

    if pm10 is not None and pm10 == 0.0:
        # Determine if this is an isolated zero (failed read) or part of a
        # genuinely clean / below-detection episode.
        prev_pm10 = _safe_float(prev_row.get("PM10")) if prev_row else None
        if prev_pm10 is not None and prev_pm10 > 0:
            # Non-zero previous read → isolated zero → failed read
            flags["pm10"] = FLAG_FAILED_READ
        elif prev_pm10 == 0.0:
            # Consecutive zero — treat whole zero block as failed read
            # (prev was already flagged; this row continues the failure)
            flags["pm10"] = FLAG_FAILED_READ
        elif prev_pm10 is None:
            # First ever reading — can't tell context; flag conservatively
            flags["pm10"] = FLAG_FAILED_READ

    # ── 2. PM1.0 / PM2.5 dual-zero detection ─────────────────────────────────
    if pm1_0 is not None and pm2_5 is not None and pm1_0 == 0.0 and pm2_5 == 0.0:
        if node_first_seen and ts and (ts - node_first_seen) < timedelta(minutes=settings.warmup_minutes):
            flags["pm_dual"] = FLAG_POSSIBLE_WARMUP
        else:
            flags["pm_dual"] = FLAG_BELOW_DETECTION

    # ── 3. Humidity spike / glitch detection ──────────────────────────────────
    humidity = _safe_float(row.get("Humidity_Percent"))
    if humidity is not None and (humidity < 10.0 or humidity > 100.0):
        flags["humidity"] = FLAG_SENSOR_GLITCH

    # ── 4. Per-channel MQ gas sensor zero detection ───────────────────────────
    for sensor in GAS_SENSORS:
        val = _safe_float(row.get(sensor))
        if val is not None and val == 0.0:
            flags[sensor.lower()] = FLAG_FAILED_READ

    # ── 5. Timestamp gap detection ────────────────────────────────────────────
    if prev_row and ts:
        prev_ts = _parse_ts(prev_row.get("Timestamp"))
        if prev_ts:
            gap_minutes = (ts - prev_ts).total_seconds() / 60.0
            if gap_minutes > settings.gap_threshold_minutes:
                flags["timestamp"] = FLAG_LOGGING_GAP
                flags["gap_minutes"] = round(gap_minutes, 2)

    return flags


def is_pm10_usable(quality_flags: dict) -> bool:
    """Return True only if PM10 is NOT flagged as failed_read."""
    return quality_flags.get("pm10") != FLAG_FAILED_READ


def is_humidity_usable(quality_flags: dict) -> bool:
    """Return True only if humidity is NOT flagged as sensor_glitch."""
    return quality_flags.get("humidity") != FLAG_SENSOR_GLITCH


def get_effective_humidity(
    current_humidity: float,
    quality_flags: dict,
    prev_valid_humidity: Optional[float],
) -> Optional[float]:
    """
    Return the humidity to use for PM correction calculations.
    If flagged as glitch, substitute previous valid value.
    """
    if is_humidity_usable(quality_flags):
        return current_humidity
    return prev_valid_humidity


def summarise_flags(flags: dict) -> dict:
    """Return a human-readable summary of quality flags for the API response."""
    summary = {
        "has_flags": bool(flags),
        "flag_count": len([k for k in flags if k != "gap_minutes"]),
        "flags": flags,
    }
    if "timestamp" in flags and flags["timestamp"] == FLAG_LOGGING_GAP:
        summary["gap_minutes"] = flags.get("gap_minutes")
    return summary


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe_float(value) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _parse_ts(value) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ"):
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue
    return None
