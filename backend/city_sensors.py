"""
SourceSense – City-Wide 8-Node Sensor Simulator
================================================
Simulates 8 sensor nodes spread across a fictional Dhaka-area city,
each with a DISTINCT pollution profile that triggers different AI actions:

 Node │ Location             │ Scenario                      │ AI Action
──────┼──────────────────────┼───────────────────────────────┼──────────────────────────────
  1   | Gulshan Construction         | Active construction site       | SPRAY (water mist ON)
  2   | Farmgate Traffic             | Peak-hour vehicle combustion   | Traffic advisory + monitoring
  3   | Amin Bazar Dump              | Waste burning / garbage fire   | Fire control dispatch
  4   | Hatirjheel Lakefront         | Humid sea-haze, no action      | No action (weather event)
  5   | Motijheel Commercial         | Clean air, normal baseline     | Standby - all good
  6   | Tejgaon Industrial           | Mixed construction + vehicles  | SPRAY (elevated combined)
  7   | Kamalapur Station            | Faulty sensor (PM10 spikes)    | Safety block (low trust)
  8   | Dhanmondi Lake               | Rising dust storm incoming     | Forecast-triggered SPRAY

Run with:
    python city_sensors.py [--loop] [--interval 5]

Options:
    --loop          Keep sending readings continuously (default: send one full cycle)
    --interval N    Seconds between reading cycles (default: 5)
    --reset         Delete existing city nodes and recreate them
    --once          Send exactly one reading per node and exit
"""
import requests
import time
import random
import math
import argparse
import sys
from datetime import datetime, timedelta

API_URL = "http://127.0.0.1:8000/api/v1"

# ─── Node definitions ─────────────────────────────────────────────────────────
# Each node maps to a real Dhaka-area landmark with realistic coordinates.
# 'scenario' drives the sensor data generation logic.

CITY_NODES = [
    {
        "name": "Node-01 Gulshan Construction",
        "location_lat": 23.7925,
        "location_lon": 90.4078,
        "zone": "Z1",
        "description": "Active high-rise construction site, heavy earthmoving equipment",
        "control_mode": "AUTONOMOUS",
        "pm10_threshold": 60.0,
        "scenario": "construction_dust",
        "calib_a": 0.33,
        "calib_b": 0.17,
    },
    {
        "name": "Node-02 Farmgate Traffic",
        "location_lat": 23.7561,
        "location_lon": 90.3872,
        "zone": "Z2",
        "description": "Dense traffic corridor, peak-hour diesel combustion",
        "control_mode": "AUTONOMOUS",
        "pm10_threshold": 70.0,
        "scenario": "vehicle_combustion",
        "calib_a": 0.28,
        "calib_b": 0.15,
    },
    {
        "name": "Node-03 Amin Bazar Dumping Ground",
        "location_lat": 23.7915,
        "location_lon": 90.3168,
        "zone": "Z3",
        "description": "Municipal waste dumping ground, periodic burn events",
        "control_mode": "AUTONOMOUS",
        "pm10_threshold": 80.0,
        "scenario": "waste_burning",
        "calib_a": 0.40,
        "calib_b": 0.20,
    },
    {
        "name": "Node-04 Hatirjheel Lakefront",
        "location_lat": 23.7667,
        "location_lon": 90.4069,
        "zone": "Z4",
        "description": "Lake promenade, sea-haze and salt aerosols",
        "control_mode": "SIMULATION",
        "pm10_threshold": 100.0,
        "scenario": "humid_haze",
        "calib_a": 0.20,
        "calib_b": 0.10,
    },
    {
        "name": "Node-05 Motijheel Commercial",
        "location_lat": 23.7250,
        "location_lon": 90.4172,
        "zone": "Z5",
        "description": "Premium commercial zone, greenery and low traffic",
        "control_mode": "AUTONOMOUS",
        "pm10_threshold": 50.0,
        "scenario": "clean",
        "calib_a": 0.25,
        "calib_b": 0.12,
    },
    {
        "name": "Node-06 Tejgaon Industrial",
        "location_lat": 23.7600,
        "location_lon": 90.3950,
        "zone": "Z6",
        "description": "Mixed industrial estate: construction + vehicle depot",
        "control_mode": "AUTONOMOUS",
        "pm10_threshold": 65.0,
        "scenario": "mixed_industrial",
        "calib_a": 0.35,
        "calib_b": 0.18,
    },
    {
        "name": "Node-07 Kamalapur Station Faulty",
        "location_lat": 23.7330,
        "location_lon": 90.4265,
        "zone": "Z7",
        "description": "Railway station vicinity, sensor has intermittent PM10 faults",
        "control_mode": "AUTONOMOUS",
        "pm10_threshold": 60.0,
        "scenario": "faulty_sensor",
        "calib_a": 0.30,
        "calib_b": 0.15,
    },
    {
        "name": "Node-08 Dhanmondi Lake Upwind",
        "location_lat": 23.7461,
        "location_lon": 90.3742,
        "zone": "Z8",
        "description": "Upwind lakeside, construction debris and seasonal dust storm",
        "control_mode": "AUTONOMOUS",
        "pm10_threshold": 55.0,
        "scenario": "dust_storm_rising",
        "calib_a": 0.32,
        "calib_b": 0.16,
    },
]


# ─── Sensor data generators per scenario ─────────────────────────────────────

def _jitter(val, pct=0.08):
    """Add ±pct% noise to a value."""
    return val * (1 + random.uniform(-pct, pct))


def _time_of_day_factor():
    """Returns a factor 0.6–1.4 based on current hour (peak: 8-10 AM, 5-7 PM)."""
    h = datetime.now().hour + datetime.now().minute / 60
    # Morning peak
    if 7 <= h <= 10:
        return 1.0 + 0.4 * math.exp(-((h - 8.5) ** 2) / 2)
    # Evening peak
    if 17 <= h <= 20:
        return 1.0 + 0.35 * math.exp(-((h - 18.5) ** 2) / 2)
    # Night / off-peak
    if 0 <= h <= 5:
        return 0.6
    return 0.9


def gen_construction_dust(t):
    """Node 1 – Active construction: high PM10, moderate CO, triggers SPRAY."""
    tod = _time_of_day_factor()
    pm10 = _jitter(185 * tod)          # µg/m³ — very elevated, Poor+
    pm25 = pm10 * _jitter(0.38)
    pm1_0 = pm25 * _jitter(0.55)
    return {
        "Temperature_C": _jitter(29.5),
        "Humidity_Percent": _jitter(62.0),
        "PM1.0": pm1_0, "PM2.5": pm25, "PM10": pm10,
        "MQ2": _jitter(210),            # LPG/smoke moderate (equipment)
        "MQ4": _jitter(130),
        "MQ6": _jitter(110),
        "MQ7": _jitter(180),            # CO from diesel equipment
        "MQ8": _jitter(95),
        "MQ131": _jitter(60),
        "MQ135": _jitter(160),
    }


def gen_vehicle_combustion(t):
    """Node 2 – Peak traffic: high CO (MQ7), fine PM dominates, advisory issued."""
    tod = _time_of_day_factor()
    pm25 = _jitter(95 * tod)           # Fine PM dominant → PM2.5 driving AQI
    pm10 = pm25 * _jitter(1.6)
    pm1_0 = pm25 * _jitter(0.7)
    return {
        "Temperature_C": _jitter(31.0),
        "Humidity_Percent": _jitter(55.0),
        "PM1.0": pm1_0, "PM2.5": pm25, "PM10": pm10,
        "MQ2": _jitter(350),            # Smoke very high
        "MQ4": _jitter(160),
        "MQ6": _jitter(140),
        "MQ7": _jitter(480),            # CO extremely elevated (diesel exhaust)
        "MQ8": _jitter(110),
        "MQ131": _jitter(75),
        "MQ135": _jitter(390),          # VOCs high
    }


def gen_waste_burning(t):
    """Node 3 – Garbage fire: all MQ sensors spike, mixed PM, fire control triggered."""
    # Simulate intermittent burn events (active ~40% of the time)
    is_burning = random.random() < 0.55
    base = 2.5 if is_burning else 0.4
    pm10 = _jitter(210 * base if is_burning else 65)
    pm25 = pm10 * _jitter(0.55)
    pm1_0 = pm25 * _jitter(0.65)
    return {
        "Temperature_C": _jitter(34.0 if is_burning else 30.0),
        "Humidity_Percent": _jitter(48.0),
        "PM1.0": pm1_0, "PM2.5": pm25, "PM10": pm10,
        "MQ2": _jitter(580 if is_burning else 160),   # LPG/smoke extreme during fire
        "MQ4": _jitter(290 if is_burning else 90),
        "MQ6": _jitter(250 if is_burning else 80),
        "MQ7": _jitter(310 if is_burning else 100),
        "MQ8": _jitter(200 if is_burning else 70),
        "MQ131": _jitter(180 if is_burning else 55),
        "MQ135": _jitter(620 if is_burning else 150), # Air quality index gas extreme
    }


def gen_humid_haze(t):
    """Node 4 – Coastal sea-haze: high humidity, moderate PM2.5, gas sensors low → No action."""
    pm25 = _jitter(68)
    pm10 = pm25 * _jitter(1.4)         # PM2.5 slightly drives AQI (Moderate)
    pm1_0 = pm25 * _jitter(0.75)
    return {
        "Temperature_C": _jitter(27.0),
        "Humidity_Percent": _jitter(88.0),  # Very high — sea humidity
        "PM1.0": pm1_0, "PM2.5": pm25, "PM10": pm10,
        "MQ2": _jitter(100),            # Gas sensors low (not combustion)
        "MQ4": _jitter(75),
        "MQ6": _jitter(65),
        "MQ7": _jitter(80),
        "MQ8": _jitter(70),
        "MQ131": _jitter(45),
        "MQ135": _jitter(90),
    }


def gen_clean(t):
    """Node 5 – BKC clean zone: all values low, AQI Good/Satisfactory → standby."""
    pm25 = _jitter(18)
    pm10 = pm25 * _jitter(1.8)
    pm1_0 = pm25 * _jitter(0.5)
    return {
        "Temperature_C": _jitter(28.5),
        "Humidity_Percent": _jitter(58.0),
        "PM1.0": pm1_0, "PM2.5": pm25, "PM10": pm10,
        "MQ2": _jitter(95),
        "MQ4": _jitter(65),
        "MQ6": _jitter(55),
        "MQ7": _jitter(70),
        "MQ8": _jitter(60),
        "MQ131": _jitter(40),
        "MQ135": _jitter(75),
    }


def gen_mixed_industrial(t):
    """Node 6 – Govandi industrial mix: combined construction + vehicle → elevated SPRAY."""
    tod = _time_of_day_factor()
    # Phase between construction (daytime) and vehicle (peak hours)
    is_construction_heavy = 8 <= datetime.now().hour <= 16
    pm10 = _jitter(155 * tod if is_construction_heavy else 110 * tod)
    pm25 = pm10 * _jitter(0.45 if is_construction_heavy else 0.60)
    pm1_0 = pm25 * _jitter(0.58)
    return {
        "Temperature_C": _jitter(30.5),
        "Humidity_Percent": _jitter(65.0),
        "PM1.0": pm1_0, "PM2.5": pm25, "PM10": pm10,
        "MQ2": _jitter(280),
        "MQ4": _jitter(150),
        "MQ6": _jitter(130),
        "MQ7": _jitter(260),            # Moderate CO from both sources
        "MQ8": _jitter(110),
        "MQ131": _jitter(65),
        "MQ135": _jitter(230),
    }


# Global faulty sensor state for Node 7
_node7_fault_cycle = 0

def gen_faulty_sensor(t):
    """Node 7 – Kurla station faulty: intermittent PM10 spikes (failed reads),
    sensor trust will drop → safety gate blocks intervention."""
    global _node7_fault_cycle
    _node7_fault_cycle += 1
    pm25 = _jitter(55)
    pm10_real = _jitter(85)
    pm1_0 = pm25 * _jitter(0.6)

    # Every 4th reading, inject an impossible PM10 spike (sensor fault)
    is_fault = (_node7_fault_cycle % 4 == 0)
    pm10 = pm10_real * random.uniform(12, 18) if is_fault else pm10_real

    return {
        "Temperature_C": _jitter(30.0),
        "Humidity_Percent": _jitter(61.0),
        "PM1.0": pm1_0, "PM2.5": pm25, "PM10": pm10,
        "MQ2": _jitter(175),
        "MQ4": _jitter(110),
        "MQ6": _jitter(95),
        "MQ7": _jitter(200),
        "MQ8": _jitter(85),
        "MQ131": _jitter(55),
        "MQ135": _jitter(165),
        "_is_fault": is_fault,          # internal marker (not sent to API)
    }


# Global rising dust level for Node 8
_dust_storm_pm10 = 40.0

def gen_dust_storm_rising(t):
    """Node 8 – Powai: slowly rising PM10 trend triggers forecast-based SPRAY
    before threshold is actually breached."""
    global _dust_storm_pm10
    # Slowly climb: +3 µg/m³ per reading, then reset after 80 readings (~7 min)
    _dust_storm_pm10 += _jitter(3.0, pct=0.3)
    if _dust_storm_pm10 > 220:
        _dust_storm_pm10 = 40.0   # Reset to simulate storm passing

    pm10 = _dust_storm_pm10
    pm25 = pm10 * _jitter(0.35)   # Coarse mineral dust — high ratio
    pm1_0 = pm25 * _jitter(0.45)
    return {
        "Temperature_C": _jitter(28.0),
        "Humidity_Percent": _jitter(52.0),
        "PM1.0": pm1_0, "PM2.5": pm25, "PM10": pm10,
        "MQ2": _jitter(140),
        "MQ4": _jitter(100),
        "MQ6": _jitter(85),
        "MQ7": _jitter(120),
        "MQ8": _jitter(80),
        "MQ131": _jitter(50),
        "MQ135": _jitter(130),
    }


SCENARIO_GENERATORS = {
    "construction_dust": gen_construction_dust,
    "vehicle_combustion": gen_vehicle_combustion,
    "waste_burning":      gen_waste_burning,
    "humid_haze":         gen_humid_haze,
    "clean":              gen_clean,
    "mixed_industrial":   gen_mixed_industrial,
    "faulty_sensor":      gen_faulty_sensor,
    "dust_storm_rising":  gen_dust_storm_rising,
}

SCENARIO_LABELS = {
    "construction_dust": "[CONSTR]  Construction Dust   -> SPRAY expected",
    "vehicle_combustion": "[TRAFFIC] Vehicle Combustion  -> Traffic advisory",
    "waste_burning":      "[FIRE]    Waste Burning       -> Fire control",
    "humid_haze":         "[HAZE]    Humid Sea-Haze      -> No action (weather)",
    "clean":              "[CLEAN]   Clean Air           -> Standby",
    "mixed_industrial":   "[INDUST]  Mixed Industrial    -> SPRAY (combined)",
    "faulty_sensor":      "[FAULT]   Faulty Sensor       -> Safety block",
    "dust_storm_rising":  "[STORM]   Dust Storm Rising   -> Forecast SPRAY",
}


# ─── Node management ──────────────────────────────────────────────────────────

def get_or_create_node(node_info: dict, reset: bool = False) -> int:
    """Find existing node by name or create it; optionally reset (delete+recreate)."""
    try:
        nodes = requests.get(f"{API_URL}/nodes", timeout=30).json()
    except Exception as e:
        print(f"  ERROR Cannot reach backend at {API_URL}: {e}")
        sys.exit(1)

    existing = next((n for n in nodes if n.get("name") == node_info["name"]), None)

    create_payload = {
        "name":               node_info["name"],
        "location_lat":       node_info["location_lat"],
        "location_lon":       node_info["location_lon"],
        "zone":               node_info["zone"],
        "description":        node_info.get("description", ""),
        "pm10_threshold":     node_info.get("pm10_threshold", 60.0),
        "control_mode":       node_info.get("control_mode", "AUTONOMOUS"),
        "calib_a":            node_info.get("calib_a", 0.33),
        "calib_b":            node_info.get("calib_b", 0.17),
        "status":             "active",
    }

    if existing:
        if reset:
            requests.delete(f"{API_URL}/nodes/{existing['id']}", timeout=30)
        else:
            # Update to make sure coords/config are fresh
            requests.put(f"{API_URL}/nodes/{existing['id']}", json=create_payload, timeout=30)
            return existing["id"]

    res = requests.post(f"{API_URL}/nodes", json=create_payload, timeout=30)
    if res.status_code not in (200, 201):
        print(f"  ERROR Failed to create node: {res.text}")
        sys.exit(1)
    return res.json()["id"]


def send_reading(node_id: int, scenario: str, t: datetime) -> dict | None:
    """Generate and POST one reading for the given node."""
    gen = SCENARIO_GENERATORS[scenario]
    data = gen(t)

    # Strip internal markers before sending
    is_fault = data.pop("_is_fault", False)

    payload = {
        "node_id": node_id,
        "Timestamp": t.isoformat(),
        **data,
    }

    try:
        res = requests.post(f"{API_URL}/readings", json=payload, timeout=30)
        if res.status_code == 201:
            resp = res.json()
            return {
                "aqi": resp.get("aqi"),
                "aqi_category": resp.get("aqi_category"),
                "classifier_label": resp.get("classifier_label"),
                "relay_state": resp.get("relay_state"),
                "trust": resp.get("sensor_trust_score"),
                "is_fault": is_fault,
            }
        else:
            print(f"    ERROR {res.status_code}: {res.text[:80]}")
    except Exception as e:
        print(f"    ERROR Network error: {e}")
    return None


# ─── Main loop ────────────────────────────────────────────────────────────────

def print_banner():
    print()
    print("=" * 74)
    print("  SourceSense -- City-Wide 8-Node Sensor Simulator")
    print("  8 nodes | 8 scenarios | Real AI decisions in real-time")
    print("=" * 74)
    print(f"  {'Node':<4}  {'Location':<32}  {'Expected AI Action'}")
    print("-" * 74)
    for i, node in enumerate(CITY_NODES, 1):
        label = SCENARIO_LABELS[node["scenario"]]
        name = node["name"].split(" ", 1)[1][:31].ljust(31)
        print(f"  [{i:2d}]  {name}  {label}")
    print("=" * 74)
    print()


def print_reading_result(i: int, node: dict, result: dict | None, t: datetime):
    if result is None:
        print(f"  [{i:2d}] {node['name'][:35]:<35} ERROR: No response")
        return

    aqi     = result.get("aqi") or "---"
    cat     = (result.get("aqi_category") or "N/A")[:13]
    label   = (result.get("classifier_label") or "unknown").replace("_", " ")[:18]
    relay   = "[ON] " if result.get("relay_state") else "[off]"
    trust   = result.get("trust") or 100.0
    fault   = " !! FAULT" if result.get("is_fault") else ""
    trust_mark = "LOW" if trust < 50 else "MID" if trust < 80 else "OK "

    print(
        f"  [{i:2d}] {node['name'][:30]:<30}  "
        f"AQI {str(aqi):>3} {cat:<14}"
        f"| {label:<20}| Relay {relay} "
        f"| Trust {trust_mark} {trust:5.1f}%{fault}"
    )


def main():
    parser = argparse.ArgumentParser(description="SourceSense 8-Node City Sensor Simulator")
    parser.add_argument("--loop",     action="store_true", help="Keep sending indefinitely")
    parser.add_argument("--once",     action="store_true", help="Send one cycle and exit")
    parser.add_argument("--reset",    action="store_true", help="Delete and recreate nodes")
    parser.add_argument("--interval", type=float, default=5.0, help="Seconds between cycles (default: 5)")
    args = parser.parse_args()

    print_banner()

    # ── Initialize all 8 nodes ───────────────────────────────────────────────
    print("Initializing city nodes...")
    node_ids = []
    for node_info in CITY_NODES:
        nid = get_or_create_node(node_info, reset=args.reset)
        node_ids.append(nid)
        print(f"  OK [{nid:3d}] {node_info['name']}")

    print(f"\n{'-'*74}")
    print(f"  Sending readings every {args.interval}s {'(one cycle)' if args.once else '(loop, Ctrl+C to stop)'}")
    print(f"{'-'*74}\n")

    cycle = 0
    try:
        while True:
            cycle += 1
            t = datetime.now()
            print(f"  --- Cycle {cycle:04d} | {t.strftime('%H:%M:%S')} " + "-" * 45)

            for i, (node_info, node_id) in enumerate(zip(CITY_NODES, node_ids), 1):
                result = send_reading(node_id, node_info["scenario"], t)
                print_reading_result(i, node_info, result, t)

            print()

            if args.once:
                break
            if not (args.loop or not args.once):
                # Default: run one cycle and exit unless --loop
                break

            time.sleep(args.interval)

    except KeyboardInterrupt:
        print("\n\n  Simulation stopped by user.")

    print("\n  Done. Open the dashboard to see all 8 nodes live.\n")


if __name__ == "__main__":
    main()
