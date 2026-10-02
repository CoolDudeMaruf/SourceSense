"""
SourceSense – Database seeder.

Reads the real 31-row CSV dataset from 2026-08-06, runs the full
validation pipeline on each row, inserts into the DB, and auto-generates
a data quality report showing all flagged rows and why.

Usage:
    cd backend
    python seed.py
"""
import sys
import os
import csv
import json
from datetime import datetime
from pathlib import Path

# Allow running from backend/ directory
sys.path.insert(0, str(Path(__file__).parent))

# Use synchronous SQLAlchemy for the seed script
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.database import Base
from app.models.node import Node
from app.models.reading import Reading
from app.models.event import Event
from app.models.alert import Alert
from app.services.validator import validate_reading, get_effective_humidity, is_pm10_usable
from app.services.humidity_correction import correct_reading
from app.services.aqi_calculator import calculate_aqi
from app.services.classifier import classify

CSV_PATH = Path(__file__).parent / "seed_data" / "real_data_2026_08_06.csv"
REPORT_PATH = Path(__file__).parent / "data_quality_report.md"


def main():
    # Use sync engine for seeding
    sync_url = settings.get_sync_db_url()
    engine = create_engine(sync_url, echo=False)
    Base.metadata.create_all(engine)

    Session = sessionmaker(bind=engine)
    session = Session()

    # ── Ensure seed node exists ───────────────────────────────────────────────
    node = session.query(Node).filter_by(name="Mumbai_Pilot_Node_01").first()
    if not node:
        node = Node(
            name="Mumbai_Pilot_Node_01",
            location_lat=19.0760,
            location_lon=72.8777,
            description="IIT Mumbai pilot node — construction site, Andheri East",
            site_manager_name="Site Manager",
            site_manager_email="manager@example.com",
            site_manager_phone="+919999999999",
            pm10_threshold=50.0,
            relay_delay_min=5,
            calib_a=0.33,
            calib_b=0.17,
        )
        session.add(node)
        session.commit()
        session.refresh(node)
        print(f"[OK] Created node: {node.name} (id={node.id})")
    else:
        print(f"[OK] Node already exists: {node.name} (id={node.id})")

    # ── Check for existing seed data ──────────────────────────────────────────
    existing = session.query(Reading).filter_by(node_id=node.id).count()
    if existing > 0:
        print(f"[WARN]  Seed data already present ({existing} rows). Skipping insert.")
        generate_report(session, node)
        session.close()
        return

    # ── Read CSV ──────────────────────────────────────────────────────────────
    rows = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    print(f"-> Processing {len(rows)} rows from {CSV_PATH.name}...\n")

    prev_row = None
    prev_valid_humidity = None
    node_first_seen = None
    inserted = 0
    flagged_rows = []

    from app.ml.train_classifier import train_and_save
    from pathlib import Path as P
    model_path = P(__file__).parent / "app" / "ml" / "model.pkl"
    if not model_path.exists():
        print("-> Training classifier (first run)...")
        train_and_save(model_path)
        print("[OK] Classifier trained.")

    for i, raw in enumerate(rows):
        ts = datetime.strptime(raw["Timestamp"].strip(), "%Y-%m-%d %H:%M:%S")
        if node_first_seen is None:
            node_first_seen = ts

        row = {
            "Timestamp": ts,
            "PM1.0": float(raw["PM1.0"]),
            "PM2.5": float(raw["PM2.5"]),
            "PM10": float(raw["PM10"]),
            "Humidity_Percent": float(raw["Humidity_Percent"]),
            "MQ2": float(raw["MQ2"]),
            "MQ4": float(raw["MQ4"]),
            "MQ6": float(raw["MQ6"]),
            "MQ7": float(raw["MQ7"]),
            "MQ8": float(raw["MQ8"]),
            "MQ131": float(raw["MQ131"]),
            "MQ135": float(raw["MQ135"]),
        }

        # Validate
        quality_flags = validate_reading(
            row=row,
            prev_row=prev_row,
            node_first_seen=node_first_seen,
        )

        # Effective humidity
        effective_rh = get_effective_humidity(
            current_humidity=row["Humidity_Percent"],
            quality_flags=quality_flags,
            prev_valid_humidity=prev_valid_humidity,
        )
        if quality_flags.get("humidity") != "sensor_glitch":
            prev_valid_humidity = row["Humidity_Percent"]

        # PM correction
        correction = correct_reading(
            pm2_5_raw=row["PM2.5"],
            pm10_raw=row["PM10"],
            effective_rh=effective_rh,
            a=node.calib_a,
            b=node.calib_b,
            pm10_flagged=quality_flags.get("pm10") == "failed_read",
            humidity_flagged=quality_flags.get("humidity") == "sensor_glitch",
        )

        # AQI
        aqi_result = calculate_aqi(
            pm2_5=correction["pm2_5_corrected"],
            pm10=correction["pm10_corrected"],
        )

        # Classify
        clf_result = classify(
            pm2_5=row["PM2.5"],
            pm10=row["PM10"] if is_pm10_usable(quality_flags) else None,
            mq2=row["MQ2"], mq4=row["MQ4"], mq6=row["MQ6"],
            mq7=row["MQ7"], mq8=row["MQ8"], mq131=row["MQ131"],
            mq135=row["MQ135"],
            humidity=effective_rh or row["Humidity_Percent"],
            quality_flags=quality_flags,
        )

        # Store PM10 as NULL if failed read, not 0
        pm10_raw_store = None if quality_flags.get("pm10") == "failed_read" else row["PM10"]

        reading = Reading(
            node_id=node.id,
            timestamp=ts,
            temperature_c=row.get("Temperature_C") or float(raw["Temperature_C"]),
            humidity_percent=row["Humidity_Percent"],
            pm1_0_raw=row["PM1.0"],
            pm2_5_raw=row["PM2.5"],
            pm10_raw=pm10_raw_store,
            pm2_5_corrected=correction["pm2_5_corrected"],
            pm10_corrected=correction["pm10_corrected"],
            humidity_used=effective_rh,
            mq2=row["MQ2"], mq4=row["MQ4"], mq6=row["MQ6"],
            mq7=row["MQ7"], mq8=row["MQ8"], mq131=row["MQ131"],
            mq135=row["MQ135"],
            quality_flags=quality_flags,
            aqi=aqi_result["aqi"],
            aqi_category=aqi_result["aqi_category"],
            aqi_pm25_subindex=aqi_result["pm25_subindex"],
            aqi_pm10_subindex=aqi_result["pm10_subindex"],
            classifier_label=clf_result["label"],
            classifier_confidence=clf_result["confidence"],
            relay_state=False,
        )
        session.add(reading)

        flag_str = json.dumps(quality_flags) if quality_flags else ""
        status = "[WARN] " + flag_str if quality_flags else "[OK]"
        print(f"  Row {i+1:02d} | {ts.strftime('%H:%M:%S')} | PM10={row['PM10']:5.1f} | "
              f"RH={row['Humidity_Percent']:5.1f}% | AQI={aqi_result['aqi'] or '---':>3} | "
              f"{clf_result['label']:<22} | {status}")

        if quality_flags:
            flagged_rows.append({
                "row": i + 1,
                "timestamp": ts.isoformat(),
                "quality_flags": quality_flags,
                "pm10_raw": row["PM10"],
                "humidity": row["Humidity_Percent"],
                "pm10_stored": pm10_raw_store,
                "classifier_label": clf_result["label"],
                "aqi": aqi_result["aqi"],
                "aqi_category": aqi_result["aqi_category"],
            })

        prev_row = row
        inserted += 1

    session.commit()
    print(f"\n[OK] Inserted {inserted} readings for node '{node.name}'")

    generate_report(session, node, flagged_rows, total=len(rows))
    session.close()


def generate_report(session, node, flagged_rows=None, total=None):
    """Generate the data quality markdown report."""
    if flagged_rows is None:
        # Reload from DB for re-run case
        readings = session.query(Reading).filter_by(node_id=node.id).order_by(Reading.timestamp).all()
        total = len(readings)
        flagged_rows = []
        for r in readings:
            if r.quality_flags:
                flagged_rows.append({
                    "row": None,
                    "timestamp": r.timestamp.isoformat(),
                    "quality_flags": r.quality_flags,
                    "pm10_raw": r.pm10_raw,
                    "humidity": r.humidity_percent,
                    "pm10_stored": r.pm10_raw,
                    "classifier_label": r.classifier_label,
                    "aqi": r.aqi,
                    "aqi_category": r.aqi_category,
                })

    flag_counts = {
        "failed_read (pm10)": sum(1 for f in flagged_rows if f["quality_flags"].get("pm10") == "failed_read"),
        "below_detection": sum(1 for f in flagged_rows if "below_detection" in f["quality_flags"].values()),
        "possible_warmup": sum(1 for f in flagged_rows if "possible_warmup" in f["quality_flags"].values()),
        "sensor_glitch (humidity)": sum(1 for f in flagged_rows if f["quality_flags"].get("humidity") == "sensor_glitch"),
        "failed_read (MQ channel)": sum(1 for f in flagged_rows if any(
            k.startswith("mq") and v == "failed_read" for k, v in f["quality_flags"].items()
        )),
        "logging_gap": sum(1 for f in flagged_rows if f["quality_flags"].get("timestamp") == "logging_gap"),
    }

    report = f"""# SourceSense — Data Quality Report
**Generated from:** `seed_data/real_data_2026_08_06.csv`
**Node:** {node.name} (id={node.id})
**Session:** 2026-08-06 06:01–06:42

## Summary

| Metric | Value |
|--------|-------|
| Total readings | {total} |
| Flagged readings | {len(flagged_rows)} |
| Clean readings | {total - len(flagged_rows)} |
| Flag rate | {len(flagged_rows)/total*100:.1f}% |

## Flag Breakdown

| Flag Type | Count |
|-----------|-------|
"""
    for flag_type, count in flag_counts.items():
        report += f"| {flag_type} | {count} |\n"

    report += """
## Flagged Rows Detail

| Row | Timestamp | Flag(s) | Raw PM10 | PM10 Stored | Humidity | Classifier | AQI |
|-----|-----------|---------|----------|-------------|----------|------------|-----|
"""
    for f in flagged_rows:
        flags_str = ", ".join(f"{k}={v}" for k, v in f["quality_flags"].items() if k != "gap_minutes")
        row_num = f["row"] or "–"
        pm10_stored = "NULL" if f["pm10_stored"] is None else f['pm10_stored']
        report += (
            f"| {row_num} | {f['timestamp']} | {flags_str} | "
            f"{f['pm10_raw']} | {pm10_stored} | "
            f"{f['humidity']} | {f['classifier_label']} | {f['aqi'] or '–'} |\n"
        )

    report += f"""
## Data Quality Notes

### PM10 Zero Reads (rows 9–10 in session)
- **Timestamp:** 06:15:15 and 06:15:16
- **Detection:** PM10 = 0 while surrounding reads are 35–43 µg/m³
- **Action:** Flagged as `failed_read`, stored as NULL (not 0), excluded from AQI and relay calculations

### Humidity Sensor Glitch (row 11)
- **Timestamp:** 06:17:30
- **Value:** 7.0% (all other readings: 73–75%)
- **Detection:** RH < 10% threshold
- **Action:** Flagged as `sensor_glitch`; previous valid humidity (74.5%) used for PM correction

### MQ131 Zero Read (row 31)
- **Timestamp:** 06:42:25
- **Detection:** Single gas channel = 0 while all others active
- **Action:** `mq131 = failed_read` flagged for that row only; other channels unaffected

### PM1.0 / PM2.5 Below Detection (rows 1–26)
- **Pattern:** Both = 0 throughout 06:01–06:37 session
- **Detection:** Dual-zero condition; node uptime > 5 min → `below_detection`
- **Action:** Classifier falls back to PM10 + gas pattern; "warming up" badge shown in UI

### Timestamp Gaps
- **Pattern:** 2-second intra-burst cadence, 6–14 minute inter-burst gaps
- **Gaps > 10 min:** flagged as `logging_gap` with gap duration logged
"""

    REPORT_PATH.write_text(report, encoding="utf-8")
    print(f"\n[OK] Wrote data quality report to {REPORT_PATH}")
    print(f"   Flagged rows: {len(flagged_rows)}/{total}")


if __name__ == "__main__":
    main()
