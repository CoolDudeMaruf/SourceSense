"""
SourceSense – Physics-informed synthetic data engine.
Models relationships between time of day, traffic, PM, and interventions.
"""
import random
import math
from datetime import datetime

def generate_synthetic_reading(node_id: int, base_time: datetime, current_mode: str, previous_pm10: float = 40.0):
    """
    Generate realistic synthetic data based on time of day and typical urban patterns.
    """
    hour = base_time.hour
    minute = base_time.minute
    time_float = hour + minute / 60.0

    # Traffic profile: Morning rush (07:00-10:00), Evening rush (17:00-20:00)
    traffic_multiplier = 1.0
    if 7 <= time_float <= 10:
        traffic_multiplier = 1.5 + math.sin((time_float - 7) / 3 * math.pi) * 2.0
    elif 17 <= time_float <= 20:
        traffic_multiplier = 1.3 + math.sin((time_float - 17) / 3 * math.pi) * 1.5

    # Weather/dispersion: Worse at night/early morning due to inversion
    dispersion = 1.0
    if time_float < 6 or time_float > 20:
        dispersion = 0.6  # Poor dispersion, higher pollution
    else:
        dispersion = 1.2  # Better dispersion

    # Construction event logic (e.g. random spikes or scheduled work)
    construction_spike = 0
    if 8 <= time_float <= 18 and random.random() < 0.05:
        construction_spike = random.uniform(50, 150)

    # Base PM10 random walk
    pm10 = previous_pm10 * 0.8 + 20 * traffic_multiplier / dispersion + construction_spike + random.uniform(-5, 10)
    pm10 = max(10.0, min(pm10, 800.0))

    pm25 = pm10 * random.uniform(0.3, 0.6)
    pm1_0 = pm25 * random.uniform(0.5, 0.8)

    humidity = 60 + math.sin(time_float / 24 * math.pi) * 20 + random.uniform(-2, 2)
    temp = 25 + math.sin((time_float - 6) / 12 * math.pi) * 10 + random.uniform(-1, 1)

    is_spiking = pm10 > 100

    return {
        "Timestamp": base_time,
        "Temperature_C": round(temp, 1),
        "Humidity_Percent": round(humidity, 1),
        "PM1.0": round(pm1_0, 1),
        "PM2.5": round(pm25, 1),
        "PM10": round(pm10, 1),
        "MQ2": 300 if is_spiking else 150 + random.uniform(-10, 10),
        "MQ4": 200 if is_spiking else 100 + random.uniform(-10, 10),
        "MQ6": 150 if is_spiking else 80 + random.uniform(-5, 5),
        "MQ7": 300 if is_spiking else 120 + random.uniform(-10, 10),
        "MQ8": 200 if is_spiking else 100 + random.uniform(-10, 10),
        "MQ131": 100 if is_spiking else 50 + random.uniform(-5, 5),
        "MQ135": 150 if is_spiking else 80 + random.uniform(-5, 5),
    }
