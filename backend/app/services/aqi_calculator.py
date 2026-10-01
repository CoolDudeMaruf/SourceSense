"""
SourceSense – AQI Calculator using CPCB (India) breakpoints.

CPCB National Air Quality Index — PM2.5 and PM10 sub-indices.
Reference: CPCB AQI bulletin (2014), revised guidelines.

Categories:
  0–50    Good
  51–100  Satisfactory
  101–200 Moderate
  201–300 Poor
  301–400 Very Poor
  401–500 Severe
"""
from typing import Optional


# ── CPCB breakpoint tables ────────────────────────────────────────────────────
# Format: (Conc_Low, Conc_High, AQI_Low, AQI_High)

PM25_BREAKPOINTS = [
    (0.0,   30.0,   0,   50),
    (30.1,  60.0,  51,  100),
    (60.1,  90.0, 101,  200),
    (90.1, 120.0, 201,  300),
    (120.1, 250.0, 301, 400),
    (250.1, 500.0, 401, 500),
]

PM10_BREAKPOINTS = [
    (0.0,   50.0,   0,   50),
    (50.1,  100.0,  51,  100),
    (100.1, 250.0, 101,  200),
    (250.1, 350.0, 201,  300),
    (350.1, 430.0, 301,  400),
    (430.1, 600.0, 401,  500),
]

CATEGORIES = [
    (0,   50,  "Good",        "#00B050"),
    (51,  100, "Satisfactory","#92D050"),
    (101, 200, "Moderate",    "#FFFF00"),
    (201, 300, "Poor",        "#FF7C00"),
    (301, 400, "Very Poor",   "#FF0000"),
    (401, 999, "Severe",      "#7030A0"),
]


def _sub_index(concentration: float, breakpoints: list) -> Optional[int]:
    """Calculate AQI sub-index for a given pollutant concentration."""
    if concentration < 0:
        return None
    for c_lo, c_hi, aqi_lo, aqi_hi in breakpoints:
        if c_lo <= concentration <= c_hi:
            # Linear interpolation
            sub = ((aqi_hi - aqi_lo) / (c_hi - c_lo)) * (concentration - c_lo) + aqi_lo
            return round(sub)
    # Beyond highest breakpoint
    return 500


def calculate_aqi(
    pm2_5: Optional[float],
    pm10: Optional[float],
) -> dict:
    """
    Calculate CPCB AQI from corrected PM2.5 and PM10.

    Parameters
    ----------
    pm2_5 : Corrected PM2.5 (µg/m³), or None if not available
    pm10  : Corrected PM10  (µg/m³), or None if failed_read

    Returns
    -------
    dict with keys: aqi, aqi_category, aqi_color, pm25_subindex, pm10_subindex
    """
    pm25_si = _sub_index(pm2_5, PM25_BREAKPOINTS) if pm2_5 is not None and pm2_5 >= 0 else None
    pm10_si = _sub_index(pm10,  PM10_BREAKPOINTS)  if pm10  is not None and pm10  >= 0 else None

    sub_indices = [si for si in [pm25_si, pm10_si] if si is not None]
    if not sub_indices:
        return {
            "aqi": None,
            "aqi_category": "Unavailable",
            "aqi_color": "#CCCCCC",
            "pm25_subindex": None,
            "pm10_subindex": None,
        }

    overall_aqi = max(sub_indices)
    category, color = _get_category(overall_aqi)
    
    primary_pollutant = "PM2.5" if pm25_si == overall_aqi else "PM10"

    return {
        "aqi": overall_aqi,
        "aqi_category": category,
        "aqi_color": color,
        "pm25_subindex": pm25_si,
        "pm10_subindex": pm10_si,
        "primary_pollutant": primary_pollutant,
    }


def _get_category(aqi: int) -> tuple[str, str]:
    for lo, hi, cat, color in CATEGORIES:
        if lo <= aqi <= hi:
            return cat, color
    return "Severe", "#7030A0"
