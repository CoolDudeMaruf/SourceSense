# SourceSense — Data Quality Report
**Generated from:** `seed_data/real_data_2026_08_06.csv`
**Node:** Mumbai_Pilot_Node_01 (id=1)
**Session:** 2026-08-06 06:01–06:42

## Summary

| Metric | Value |
|--------|-------|
| Total readings | 31 |
| Flagged readings | 27 |
| Clean readings | 4 |
| Flag rate | 87.1% |

## Flag Breakdown

| Flag Type | Count |
|-----------|-------|
| failed_read (pm10) | 2 |
| below_detection | 20 |
| possible_warmup | 6 |
| sensor_glitch (humidity) | 1 |
| failed_read (MQ channel) | 1 |
| logging_gap | 1 |

## Flagged Rows Detail

| Row | Timestamp | Flag(s) | Raw PM10 | PM10 Stored | Humidity | Classifier | AQI |
|-----|-----------|---------|----------|-------------|----------|------------|-----|
| 1 | 2026-08-06T06:01:05 | pm_dual=possible_warmup | 35.0 | 35.0 | 73.2 | construction_dust | 52 |
| 2 | 2026-08-06T06:01:07 | pm_dual=possible_warmup | 36.0 | 36.0 | 73.3 | construction_dust | 53 |
| 3 | 2026-08-06T06:03:12 | pm_dual=possible_warmup | 37.0 | 37.0 | 73.5 | construction_dust | 55 |
| 4 | 2026-08-06T06:03:14 | pm_dual=possible_warmup | 37.0 | 37.0 | 73.5 | construction_dust | 55 |
| 5 | 2026-08-06T06:05:22 | pm_dual=possible_warmup | 38.0 | 38.0 | 73.8 | construction_dust | 56 |
| 6 | 2026-08-06T06:05:24 | pm_dual=possible_warmup | 38.0 | 38.0 | 73.9 | construction_dust | 56 |
| 7 | 2026-08-06T06:19:33 | pm_dual=below_detection, timestamp=logging_gap | 40.0 | 40.0 | 74.1 | construction_dust | 59 |
| 8 | 2026-08-06T06:19:35 | pm_dual=below_detection | 41.0 | 41.0 | 74.2 | construction_dust | 60 |
| 9 | 2026-08-06T06:21:44 | pm10=failed_read, pm_dual=below_detection | 0.0 | NULL | 74.7 | construction_dust | – |
| 10 | 2026-08-06T06:21:46 | pm10=failed_read, pm_dual=below_detection | 0.0 | NULL | 74.8 | construction_dust | – |
| 11 | 2026-08-06T06:23:30 | pm_dual=below_detection, humidity=sensor_glitch | 42.0 | 42.0 | 7.0 | construction_dust | 62 |
| 12 | 2026-08-06T06:23:32 | pm_dual=below_detection | 43.0 | 43.0 | 74.6 | construction_dust | 63 |
| 13 | 2026-08-06T06:25:44 | pm_dual=below_detection | 40.0 | 40.0 | 74.7 | construction_dust | 59 |
| 14 | 2026-08-06T06:25:46 | pm_dual=below_detection | 41.0 | 41.0 | 74.8 | construction_dust | 61 |
| 15 | 2026-08-06T06:27:55 | pm_dual=below_detection | 39.0 | 39.0 | 74.9 | construction_dust | 58 |
| 16 | 2026-08-06T06:27:57 | pm_dual=below_detection | 40.0 | 40.0 | 75.0 | construction_dust | 59 |
| 17 | 2026-08-06T06:29:08 | pm_dual=below_detection | 38.0 | 38.0 | 75.1 | construction_dust | 56 |
| 18 | 2026-08-06T06:29:10 | pm_dual=below_detection | 39.0 | 39.0 | 75.1 | construction_dust | 58 |
| 19 | 2026-08-06T06:31:20 | pm_dual=below_detection | 37.0 | 37.0 | 75.2 | construction_dust | 55 |
| 20 | 2026-08-06T06:31:22 | pm_dual=below_detection | 38.0 | 38.0 | 75.2 | construction_dust | 56 |
| 21 | 2026-08-06T06:33:35 | pm_dual=below_detection | 36.0 | 36.0 | 75.3 | construction_dust | 53 |
| 22 | 2026-08-06T06:33:37 | pm_dual=below_detection | 37.0 | 37.0 | 75.4 | construction_dust | 55 |
| 23 | 2026-08-06T06:35:48 | pm_dual=below_detection | 35.0 | 35.0 | 75.4 | construction_dust | 52 |
| 24 | 2026-08-06T06:35:50 | pm_dual=below_detection | 36.0 | 36.0 | 75.5 | construction_dust | 53 |
| 25 | 2026-08-06T06:37:02 | pm_dual=below_detection | 34.0 | 34.0 | 75.5 | construction_dust | 50 |
| 26 | 2026-08-06T06:37:04 | pm_dual=below_detection | 35.0 | 35.0 | 75.6 | construction_dust | 52 |
| 31 | 2026-08-06T06:42:25 | mq131=failed_read | 43.0 | 43.0 | 75.8 | construction_dust | 63 |

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
