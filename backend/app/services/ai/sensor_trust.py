"""
SourceSense – Sensor Trust & Fusion Layer.
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# State dictionary to hold historical node trust context
# node_id -> {"trust_score": float, "last_pm10": float, "consecutive_errors": int}
_trust_context = {}

def get_sensor_trust(node_id: int, current_pm10: Optional[float], quality_flags: dict) -> float:
    """
    Calculate a dynamic trust score for a sensor (0-100%).
    Penalizes missing values, impossible jumps, or quality flags.
    """
    if node_id not in _trust_context:
        _trust_context[node_id] = {"trust_score": 100.0, "last_pm10": current_pm10, "consecutive_errors": 0}
        
    ctx = _trust_context[node_id]
    
    # Base penalities
    if quality_flags:
        penalty = len(quality_flags) * 5.0
        ctx["trust_score"] -= penalty
        ctx["consecutive_errors"] += 1
    else:
        # Recover slowly
        ctx["trust_score"] = min(100.0, ctx["trust_score"] + 2.0)
        ctx["consecutive_errors"] = 0

    # Value jump anomalies
    if current_pm10 is not None and ctx["last_pm10"] is not None:
        jump = abs(current_pm10 - ctx["last_pm10"])
        # If jump is larger than 600ug in a few seconds, it's highly suspicious
        if jump > 600:
            ctx["trust_score"] -= 20.0
            ctx["consecutive_errors"] += 1
    
    # Hard bounds
    ctx["trust_score"] = max(0.0, min(100.0, ctx["trust_score"]))
    
    # Update state
    if current_pm10 is not None:
        ctx["last_pm10"] = current_pm10
        
    return round(ctx["trust_score"], 1)

def apply_sensor_fusion(node_id: int, readings_pool: list, trust_scores: dict) -> float:
    """
    Future implementation: use neighbor sensors to estimate value if this sensor is untrusted.
    """
    pass
