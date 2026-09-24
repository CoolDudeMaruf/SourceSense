"""
SourceSense – Humidity correction for PM readings.

Applies the Laulainen / Chakrabarti hygroscopic growth correction:

    PM_corrected = PM_raw / (1 - a * (RH/100)^b)

where RH is relative humidity (%), and a, b are per-node calibration
constants (default: a=0.33, b=0.17, from published Indian urban studies).

References:
  Laulainen, N. S. (1993) — visibility / hygroscopic aerosol model
  Chakrabarti et al. (2004) — adaptation for South Asian urban dust
"""
from typing import Optional


def correct_pm(
    pm_raw: float,
    rh_percent: float,
    a: float = 0.33,
    b: float = 0.17,
) -> Optional[float]:
    """
    Apply hygroscopic growth correction to a single PM value.

    Parameters
    ----------
    pm_raw      : Raw PM reading in µg/m³
    rh_percent  : Relative humidity (%) — must NOT be a flagged/glitch value
    a, b        : Node-specific calibration constants

    Returns
    -------
    Corrected PM value in µg/m³, or None if correction cannot be applied
    (e.g. denominator ≤ 0).
    """
    if pm_raw is None or rh_percent is None:
        return None
    if pm_raw < 0:
        return None

    rh_fraction = rh_percent / 100.0
    denominator = 1.0 - a * (rh_fraction ** b)

    if denominator <= 0:
        # Pathological: correction factor would be infinite — return raw
        return pm_raw

    corrected = pm_raw / denominator
    return round(corrected, 2)


def correct_reading(
    pm2_5_raw: Optional[float],
    pm10_raw: Optional[float],
    effective_rh: Optional[float],
    a: float = 0.33,
    b: float = 0.17,
    pm10_flagged: bool = False,
    humidity_flagged: bool = False,
) -> dict:
    """
    Apply humidity correction to both PM2.5 and PM10 for a single reading.

    Rules:
      - Skip PM10 correction if pm10 is flagged as failed_read.
      - Skip all corrections if humidity is flagged as sensor_glitch AND
        no previous valid humidity is available (effective_rh is None).
      - If effective_rh is a substituted value (from previous valid reading),
        correction is still applied normally.

    Returns
    -------
    dict with keys: pm2_5_corrected, pm10_corrected, correction_applied (bool)
    """
    if effective_rh is None or humidity_flagged and effective_rh is None:
        return {
            "pm2_5_corrected": pm2_5_raw,
            "pm10_corrected": pm10_raw if not pm10_flagged else None,
            "correction_applied": False,
        }

    pm2_5_corr = None
    if pm2_5_raw is not None and pm2_5_raw > 0:
        pm2_5_corr = correct_pm(pm2_5_raw, effective_rh, a, b)
    else:
        pm2_5_corr = pm2_5_raw  # preserve 0 / None as-is for below-detection

    pm10_corr = None
    if not pm10_flagged and pm10_raw is not None:
        pm10_corr = correct_pm(pm10_raw, effective_rh, a, b)

    return {
        "pm2_5_corrected": pm2_5_corr,
        "pm10_corrected": pm10_corr,
        "correction_applied": True,
    }
