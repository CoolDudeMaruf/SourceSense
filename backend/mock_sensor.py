import requests
import time
from datetime import datetime, timedelta
import random
import sys

API_URL = "http://localhost:8000/api/v1"

# Define our virtual nodes tailored to Gazipur DUET and surroundings
VIRTUAL_NODES = [
    {"name": "Gazipur City", "location_lat": 23.9999, "location_lon": 90.4203, "zone": "Gazipur", "type": "industrial_emissions"},
]


def get_or_create_node(node_info):
    try:
        nodes = requests.get(f"{API_URL}/nodes").json()
        for n in nodes:
            if n.get("name") == node_info["name"]:
                requests.put(f"{API_URL}/nodes/{n['id']}", json={
                    "name": node_info["name"],
                    "location_lat": node_info["location_lat"],
                    "location_lon": node_info["location_lon"],
                    "zone": node_info["zone"],
                    "status": "active"
                })
                return n["id"]
        
        # Create it
        res = requests.post(f"{API_URL}/nodes", json={
            "name": node_info["name"],
            "location_lat": node_info["location_lat"],
            "location_lon": node_info["location_lon"],
            "zone": node_info["zone"],
            "status": "active"
        })
        return res.json()["id"]
    except Exception as e:
        print(f"Error connecting to backend: {e}")
        sys.exit(1)

def main():
    print("==============================================")
    print(" Starting Championship Demo Scenario")
    print("==============================================")
    
    node_ids = []
    for info in VIRTUAL_NODES:
        nid = get_or_create_node(info)
        node_ids.append(nid)
        print(f"Initialized '{info['name']}' with ID: {nid}")

    print("\n--- Phase 1: 06:45 AM - Normal Baseline ---")
    base_time = datetime.now().replace(hour=6, minute=45, second=0, microsecond=0)
    
    def send_scenario_reading(node_idx, current_time, pm10_val, is_faulty=False):
        nid = node_ids[node_idx]
        info = VIRTUAL_NODES[node_idx]
        
        if info["type"] == "industrial_emissions":
            pm25 = pm10_val * 0.7  # Industrial has more PM2.5 compared to dust
            pm1_0 = pm25 * 0.8
            mq131 = 300 + pm10_val/2 # High NOx / Ozone
            mq135 = 450 + pm10_val   # High NH3 / VOCs
            mq7 = 150 + pm10_val/3
        else:
            pm25 = pm10_val * 0.4
            pm1_0 = pm25 * 0.6
            mq131 = 80 + pm10_val/4
            mq135 = 100 + pm10_val/3
            mq7 = 350 + pm10_val # High CO for vehicles
        
        payload = {
            "node_id": nid,
            "Timestamp": current_time.strftime("%Y-%m-%dT%H:%M:%S"),
            "Temperature_C": 28.5, # Gazipur climate
            "Humidity_Percent": 65.0,
            "PM1.0": pm1_0,
            "PM2.5": pm25,
            "PM10": pm10_val,
            "MQ2": 150 + pm10_val/2,
            "MQ4": 100 + pm10_val/3,
            "MQ6": 80 + pm10_val/4,
            "MQ7": mq7,
            "MQ8": 100,
            "MQ131": mq131,
            "MQ135": mq135
        }
        
        if is_faulty:
            # Drop a random massive spike that makes no physical sense
            payload["PM10"] = pm10_val + random.uniform(800, 1200)
            
        try:
            res = requests.post(f"{API_URL}/readings", json=payload)
            if res.status_code != 201:
                print(f"Error: {res.text}")
        except Exception as e:
            pass

    # Send 10 minutes of baseline
    for m in range(10):
        t = base_time + timedelta(minutes=m)
        send_scenario_reading(0, t, pm10_val=45 + random.uniform(-2, 2))
        send_scenario_reading(1, t, pm10_val=44 + random.uniform(-2, 2))
        send_scenario_reading(2, t, pm10_val=46 + random.uniform(-2, 2))
        send_scenario_reading(3, t, pm10_val=30 + random.uniform(-2, 2))
        time.sleep(0.5)

    print("\n--- Phase 2: 07:00 AM - Traffic Increases, Pollution Rises ---")
    base_time = base_time + timedelta(minutes=15)
    pm10_trend = 45.0
    for m in range(15):
        t = base_time + timedelta(minutes=m)
        pm10_trend += 8.0 # Rises quickly due to traffic and morning inversion
        
        # Sensor 3 goes faulty at minute 5
        is_faulty = (m >= 5)
        
        send_scenario_reading(0, t, pm10_val=pm10_trend + random.uniform(-5, 5))
        send_scenario_reading(1, t, pm10_val=pm10_trend + random.uniform(-5, 5))
        send_scenario_reading(2, t, pm10_val=pm10_trend + random.uniform(-5, 5), is_faulty=is_faulty)
        send_scenario_reading(3, t, pm10_val=35 + random.uniform(-2, 2)) # Zone 1 unaffected
        
        if m == 5:
            print("[EVENT] Sensor 03 reports impossible data jump! Trust system should catch this.")
        if m == 10:
            print("[EVENT] AI Forecast predicting high risk in Gazipur. Safety gate validating intervention.")
            
        time.sleep(1)
        
    print("\n--- Phase 3: 07:15 AM - Intervention Active, PM Drops ---")
    base_time = base_time + timedelta(minutes=15)
    for m in range(15):
        t = base_time + timedelta(minutes=m)
        pm10_trend -= 6.0 # Drops due to spray
        pm10_trend = max(35.0, pm10_trend)
        
        send_scenario_reading(0, t, pm10_val=pm10_trend + random.uniform(-2, 2))
        send_scenario_reading(1, t, pm10_val=pm10_trend + random.uniform(-2, 2))
        send_scenario_reading(2, t, pm10_val=pm10_trend + random.uniform(-2, 2), is_faulty=True) # Remains faulty
        send_scenario_reading(3, t, pm10_val=35 + random.uniform(-2, 2))
        
        if m == 14:
            print("[EVENT] Intervention complete. Measuring Counterfactual Impact.")
            
        time.sleep(1)

    print("\nScenario complete. Check dashboard for AI Analysis, Trust Scores, and Impact estimation.")

if __name__ == "__main__":
    main()
