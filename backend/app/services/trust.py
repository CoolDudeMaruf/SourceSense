from app.services.ai.sensor_trust import get_sensor_trust

def calculate_sensor_trust(node_id: int, pm10: float, quality_flags: dict, timestamp) -> float:
    """
    Adapter function to bridge the missing calculate_sensor_trust with get_sensor_trust.
    get_sensor_trust returns 0-100.
    In the caller, trust_score * 100.0 is used, implying this should return 0.0-1.0.
    """
    trust_100 = get_sensor_trust(node_id, pm10, quality_flags)
    return trust_100 / 100.0
