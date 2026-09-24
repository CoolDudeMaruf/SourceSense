"""
SourceSense – History-based Intelligence.
"""
from datetime import datetime

# Simple in-memory tracker of historical baseline by hour and zone.
# (zone_id, hour) -> [list of historical pm10]
_historical_patterns = {}

def analyze_history(zone: str, pm10: float, timestamp: datetime) -> dict:
    """
    Detects if a reading matches a recurring pattern or if it is an abnormal event.
    Returns a dict with 'is_recurring', 'historical_baseline', 'similarity'.
    """
    if pm10 is None:
         return {"is_recurring": False, "historical_baseline": None, "similarity": 0.0}
         
    hour = timestamp.hour
    key = (zone, hour)
    
    if key not in _historical_patterns:
        _historical_patterns[key] = []
        
    history = _historical_patterns[key]
    
    baseline = sum(history) / len(history) if history else pm10
    
    # Keep last 50 readings for this hour/zone
    history.append(pm10)
    if len(history) > 50:
        history.pop(0)
        
    # Check if current pm10 is close to historical baseline (if we have enough data)
    similarity = 0.0
    is_recurring = False
    
    if len(history) > 5:
        # If we have a pattern of high pollution at this hour
        if baseline > 80:
             # Current matches the high baseline pattern
             if abs(pm10 - baseline) < 30:
                 similarity = max(0, 1.0 - abs(pm10 - baseline) / 100.0)
                 is_recurring = True
                 
    return {
        "is_recurring": is_recurring,
        "historical_baseline": round(baseline, 1),
        "similarity": round(similarity * 100, 1) # percentage
    }
