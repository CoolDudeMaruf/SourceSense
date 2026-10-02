import requests
import datetime
import random
import time
import argparse

API_URL = "http://localhost:8000/api/v1"

def create_test_node(name, lat, lon, zone):
    try:
        nodes = requests.get(f"{API_URL}/nodes").json()
        for n in nodes:
            if n.get("name") == name:
                print(f"Node '{name}' already exists with ID: {n['id']}")
                return n["id"]
        
        res = requests.post(f"{API_URL}/nodes", json={
            "name": name,
            "location_lat": lat,
            "location_lon": lon,
            "zone": zone,
            "status": "active",
            "health_score": 100.0,
            "battery_level": 100.0,
            "is_charging": True
        })
        print(f"Created node '{name}' with ID: {res.json()['id']}")
        return res.json()["id"]
    except Exception as e:
        print(f"Error connecting to backend: {e}")
        return None

def send_test_reading(node_id, pm10_val, event_type="construction_dust"):
    current_time = datetime.datetime.now()
    
    if event_type == "industrial_emissions":
        pm25 = pm10_val * 0.7 
        pm1_0 = pm25 * 0.8
        mq131 = 300 + pm10_val/2
        mq135 = 450 + pm10_val  
        mq7 = 150 + pm10_val/3
    elif event_type == "construction_dust":
        pm25 = pm10_val * 0.3
        pm1_0 = pm25 * 0.4
        mq131 = 80
        mq135 = 100
        mq7 = 100
    elif event_type == "waste_burning":
        pm25 = pm10_val * 0.6
        pm1_0 = pm25 * 0.7
        mq131 = 150
        mq135 = 350 + pm10_val
        mq7 = 200 + pm10_val/2
    elif event_type == "vehicle_combustion":
        pm25 = pm10_val * 0.4
        pm1_0 = pm25 * 0.6
        mq131 = 80 + pm10_val/4
        mq135 = 100 + pm10_val/3
        mq7 = 350 + pm10_val
    else: # clean or humid_haze
        pm25 = pm10_val * 0.2
        pm1_0 = pm25 * 0.3
        mq131 = 50
        mq135 = 50
        mq7 = 50

    payload = {
        "node_id": node_id,
        "Timestamp": current_time.strftime("%Y-%m-%dT%H:%M:%S"),
        "Temperature_C": 28.5,
        "Humidity_Percent": 95.0 if event_type == "humid_haze" else 65.0,
        "PM1.0": pm1_0,
        "PM2.5": pm25,
        "PM10": pm10_val,
        "MQ2": 300 if event_type == "waste_burning" else 150,
        "MQ4": 100,
        "MQ6": 80,
        "MQ7": mq7,
        "MQ8": 100,
        "MQ131": mq131,
        "MQ135": mq135
    }
    
    res = requests.post(f"{API_URL}/readings", json=payload)
    if res.status_code == 201:
        print(f"Sent reading for {event_type}: PM10={pm10_val}")
    else:
        print(f"Failed to send reading: {res.text}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test Sensor Script")
    parser.add_description = "Use this to manually trigger a specific AI event and test the pipeline."
    parser.add_argument("--pm10", type=float, default=250.0, help="PM10 value to send (e.g., 250 for high pollution)")
    parser.add_argument("--type", type=str, default="construction_dust", choices=["construction_dust", "vehicle_combustion", "industrial_emissions", "waste_burning", "humid_haze", "clean"], help="Type of event to simulate")
    parser.add_argument("--duration", type=int, default=6, help="Number of minutes to send readings (default 6 mins to trigger 5-min persistence)")
    args = parser.parse_args()

    node_id = create_test_node(
        name=f"Test Node ({args.type})",
        lat=23.9500 + random.uniform(-0.01, 0.01),
        lon=90.4000 + random.uniform(-0.01, 0.01),
        zone="Test Zone"
    )
    
    if not node_id:
        print("Failed to initialize test node. Exiting.")
        sys.exit(1)

    print(f"\nSending {args.type} data with PM10 ~ {args.pm10} for {args.duration} minutes...")
    print("Wait for the 5-minute persistence threshold to trigger the AI intervention!")
    
    for i in range(args.duration):
        send_test_reading(node_id, args.pm10 + random.uniform(-5, 5), args.type)
        time.sleep(1) # Send 1 reading per second (each acts as 1 minute in simulated backend time)
    
    print("\nFinished sending test scenario. Check the dashboard!")
