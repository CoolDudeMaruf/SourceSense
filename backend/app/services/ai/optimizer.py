"""
SourceSense – Intervention Optimizer.
Decides WHEN, WHERE, HOW MUCH, and HOW LONG to spray.
"""
def optimize_intervention(zone: str, pm10: float, forecast_30m: float, 
                          sensor_trust: float, classifier_label: str, classifier_confidence: float) -> dict:
    """
    Returns optimization plan: intensity (%), duration (minutes), expected resources, and decision confidence.
    """
    if pm10 is None or forecast_30m is None:
        return {"action": "NONE", "reason": "Missing data", "confidence": 0}

    # Don't optimize if not construction dust
    if classifier_label != "construction_dust":
         return {"action": "NONE", "reason": f"Not construction dust ({classifier_label})", "confidence": classifier_confidence}
         
    decision_confidence = (sensor_trust / 100.0) * classifier_confidence * 100.0
    
    # Simple physics rules based on PM level
    if forecast_30m > 150:
        intensity = 100
        duration = 5
        reason = f"High predicted risk ({forecast_30m} ug/m3). Max intervention."
    elif forecast_30m > 80:
        intensity = 70
        duration = 3
        reason = f"Moderate predicted risk ({forecast_30m} ug/m3). Standard intervention."
    elif pm10 > 50:
        intensity = 40
        duration = 2
        reason = f"Current PM10 ({pm10} ug/m3) slightly elevated. Light intervention."
    else:
        return {"action": "NONE", "reason": "PM below concern threshold.", "confidence": decision_confidence}
        
    # Estimated resources: a 100% intensity pump uses ~1.5L/min and 0.05 kWh/min
    water_used = (intensity / 100.0) * 1.5 * duration
    energy_used = (intensity / 100.0) * 0.05 * duration
    
    # Expected PM reduction: Higher intensity/duration -> more reduction, but bounded
    expected_reduction_pct = min(50.0, (intensity / 100.0) * (duration / 5.0) * 40.0)
    
    return {
        "action": "SPRAY",
        "intensity": intensity,
        "duration_min": duration,
        "estimated_water_l": round(water_used, 1),
        "estimated_energy_kwh": round(energy_used, 2),
        "expected_pm_reduction_pct": round(expected_reduction_pct, 1),
        "reason": reason,
        "confidence": round(decision_confidence, 1)
    }
