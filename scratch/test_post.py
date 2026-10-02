import requests

url = "https://sourcesense4.onrender.com/api/v1/readings"
payload = {
    "node_id": 30,
    "Timestamp": "2026-10-02T12:00:00Z",
    "Temperature_C": 25.0,
    "Humidity_Percent": 60.0,
    "PM1.0": 10.0,
    "PM2.5": 12.0,
    "PM10": 15.0,
    "MQ2": 100.0,
    "MQ4": 50.0,
    "MQ6": 80.0,
    "MQ7": 15.0,
    "MQ8": 100.0,
    "MQ131": 50.0,
    "MQ135": 80.0,
    "battery_level": 85.0,
    "is_solar_charging": True
}

print(f"Sending POST to {url}...")
try:
    res = requests.post(url, json=payload, timeout=20)
    print("Status Code:", res.status_code)
    print("Response Headers:", res.headers)
    print("Response Body:", res.text)
except Exception as e:
    print("Error:", e)
