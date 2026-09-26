"""
SourceSense – Intervention Optimizer.
Decides WHEN, WHERE, HOW MUCH, and HOW LONG to spray.
"""
def optimize_intervention(zone: str, pm10: float, forecast_30m: float, 
                          sensor_trust: float, classifier_label: str, classifier_confidence: float, aqi: float = 0) -> dict:
    """
    Returns optimization plan: intensity (%), duration (minutes), expected resources, and decision confidence.
    """
    if pm10 is None or forecast_30m is None:
        return {"action": "NONE", "reason": "Missing data", "confidence": 0}

    # Weather events cannot be mitigated by physical interventions
    if classifier_label == "humid_haze":
         return {"action": "NONE", "reason": "Weather event (Humid Haze), no mitigation possible.", "confidence": classifier_confidence}
         
    decision_confidence = (sensor_trust / 100.0) * classifier_confidence * 100.0
    
    if aqi <= 100 and pm10 <= 100:
        return {"action": "NONE", "reason": f"AQI Low ({int(aqi)}), below concern threshold.", "confidence": decision_confidence}

    # Dynamic calculation based on continuous sensor data (PM10 & Forecast)
    base_pm = max(pm10, forecast_30m)
    # PM10 ranges from ~50 (20% intensity) to ~350+ (100% intensity)
    intensity = min(100, max(20, int(((base_pm - 50) / 300) * 80 + 20)))
    # Duration scales with intensity: 20% -> 1 min, 100% -> 5 mins
    duration = max(1, round((intensity / 100.0) * 5.0))
    
    # Determine action type and text description based on classifier
    if classifier_label == "vehicle_combustion":
        action_type = "TRAFFIC_ADVISORY"
        if aqi > 200:
            reason = f"Severe traffic emissions (AQI {int(aqi)}). Issuing heavy diversion advisory for {duration} hrs."
        else:
            reason = f"Moderate traffic emissions (AQI {int(aqi)}). Issuing light routing advisory for {duration} hrs."
            
    elif classifier_label == "waste_burning":
        action_type = "FIRE_DISPATCH"
        if aqi > 200:
            reason = f"Severe burning event (AQI {int(aqi)}). Dispatching heavy multi-unit fire control (Priority {intensity}%)."
        else:
            reason = f"Moderate burning (AQI {int(aqi)}). Dispatching local inspector (Priority {intensity}%)."
            
    else: # construction_dust or mixed_industrial
        action_type = "SPRAY"
        if aqi > 200:
            reason = f"High dust density (AQI {int(aqi)}). High-pressure spray ({intensity}%) for {duration} mins."
        else:
            reason = f"Moderate dust (AQI {int(aqi)}). Light misting ({intensity}%) for {duration} mins."
        
    # Estimated resources: a 100% intensity pump uses ~1.5L/min and 0.05 kWh/min
    # Only applies if we are actually spraying!
    if action_type == "SPRAY":
        water_used = (intensity / 100.0) * 1.5 * duration
        energy_used = (intensity / 100.0) * 0.05 * duration
    else:
        water_used = 0.0
        energy_used = 0.0
    
    # Expected PM reduction: Higher intensity/duration -> more reduction, but bounded
    expected_reduction_pct = min(50.0, (intensity / 100.0) * (duration / 5.0) * 40.0)
    
    return {
        "action": action_type,
        "intensity": intensity,
        "duration_min": duration,
        "estimated_water_l": round(water_used, 1),
        "estimated_energy_kwh": round(energy_used, 2),
        "expected_pm_reduction_pct": round(expected_reduction_pct, 1),
        "reason": reason,
        "confidence": round(decision_confidence, 1)
    }
