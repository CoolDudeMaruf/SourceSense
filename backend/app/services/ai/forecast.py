"""
SourceSense – Forecasting.
"""

def generate_forecast(current_pm10: float, pm10_trend: float, time_aware_factor: float) -> dict:
    """
    Generates 10m, 20m, 30m forecast for PM10 based on current reading and short-term trend.
    This acts as the deterministic baseline that can later be replaced by a full ML model.
    """
    if current_pm10 is None:
        return {"forecast_10m": None, "forecast_20m": None, "forecast_30m": None}
        
    # Apply a decaying trend to prevent predicting infinity
    # A positive time_aware_factor implies traffic/weather is driving it up
    
    trend = pm10_trend
    if abs(trend) > 20: 
        trend = 20 * (1 if trend > 0 else -1) # Cap the immediate derivative
        
    f_10 = current_pm10 + trend * 10 * time_aware_factor
    f_20 = f_10 + trend * 0.8 * 10 * time_aware_factor
    f_30 = f_20 + trend * 0.5 * 10 * time_aware_factor
    
    # Clamp values
    return {
        "forecast_10m": max(0.0, round(f_10, 1)),
        "forecast_20m": max(0.0, round(f_20, 1)),
        "forecast_30m": max(0.0, round(f_30, 1)),
    }
