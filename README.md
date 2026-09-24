# SourceSense — IoT Air Quality Monitoring System

> **Pilot city:** Mumbai, India | **Pipeline:** Sense → Understand → Act

SourceSense is a full-stack pollution source detection and auto-suppression system for urban construction/road dust. It ingests real IoT sensor data, validates it against known hardware failure modes, computes CPCB AQI, classifies pollution sources using a Random Forest model, and triggers water-mist suppression relays automatically.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Hardware Node (ESP32 + PM + Gas sensors)                        │
│  POST /api/v1/readings — irregular cadence (2s bursts, 6-14m gaps)│
└─────────────────────────────┬────────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────────┐
│  FastAPI Backend (Python 3.11)                                   │
│  ┌─────────────┐  ┌────────────────┐  ┌──────────────────────┐  │
│  │ Ingest POST │→ │  Validation    │→ │  Processing Pipeline │  │
│  │ /readings   │  │  · PM10 zero   │  │  · Humidity Correct  │  │
│  └─────────────┘  │  · RH glitch   │  │  · CPCB AQI Calc     │  │
│                   │  · TS gaps     │  │  · RF Classifier     │  │
│                   │  · MQ channels │  │  · Relay Logic       │  │
│                   └────────────────┘  └──────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  WebSocket /ws/live/{node_id} — streams every 3s            │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬────────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────────┐
│  PostgreSQL                                                      │
│  nodes | readings (quality_flags JSONB) | events | alerts        │
└─────────────────────────────┬────────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────────┐
│  React + Tailwind Frontend (Vite)                                │
│  Dashboard | Node Mgmt | Event Log | Data Quality Panel          │
└──────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites
- Docker + Docker Compose
- (For local dev without Docker) Python 3.11, Node 20, PostgreSQL 16

### 1. One-command startup (Docker)

```bash
# From project root
docker-compose up --build
```

Services:
| Service   | URL                     |
|-----------|-------------------------|
| Frontend  | http://localhost:5173   |
| Backend   | http://localhost:8000   |
| API Docs  | http://localhost:8000/docs |
| DB        | localhost:5432          |

### 2. Seed real data + generate quality report

```bash
docker-compose exec backend python seed.py
```

This inserts all 31 rows from the 2026-08-06 session with correct quality flags and prints `data_quality_report.md`.

### 3. Test Live Animations (Mock Sensor)
To test the real-time websocket stream and dashboard animations (pollution spikes and suppression radius), you can run a fake node data generator:

```bash
cd backend
python mock_sensor.py
```
This will automatically create a "Fake Node" on the map, send historical data to trigger a spike (AQI > 300) and suppression relay, and then continue streaming live data every 3 seconds.

**Cleaning up the Fake Node:**
Once you are ready to connect physical devices, you can delete the fake node using its ID (you can see the ID in the console output or the Node Management tab):
```bash
curl -X DELETE http://localhost:8000/api/v1/nodes/{fake_node_id}
```

### 3. Local development (no Docker)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env           # edit DATABASE_URL if needed
uvicorn app.main:app --reload
python seed.py                 # seed DB with real data
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

Expected output:
```
tests/unit/test_validator.py            12 passed
tests/unit/test_aqi.py                  9 passed
tests/unit/test_relay.py                6 passed
tests/unit/test_humidity_correction.py  8 passed
tests/integration/test_ingestion.py     8 passed
```

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/readings` | POST | Ingest sensor reading |
| `/api/v1/readings` | GET | List readings (filter by node_id) |
| `/api/v1/nodes` | GET/POST | List / create nodes |
| `/api/v1/nodes/{id}` | PATCH/DELETE | Update / deactivate node |
| `/api/v1/events` | GET | Suppression event log |
| `/api/v1/export/csv` | GET | Export CSV (original schema + quality_flag) |
| `/api/v1/forecast/{node_id}` | GET | PM10 ARIMA forecast |
| `/api/v1/classifier/retrain` | POST | Retrain RF model with real labelled data |
| `/ws/live/{node_id}` | WS | Real-time reading stream |

---

## Sensor Payload Format

```json
{
  "node_id": 1,
  "Timestamp": "2026-08-06T06:15:15",
  "Temperature_C": 31.7,
  "Humidity_Percent": 74.4,
  "PM1.0": 0,
  "PM2.5": 0,
  "PM10": 42,
  "MQ2": 228, "MQ4": 197, "MQ6": 154,
  "MQ7": 339, "MQ8": 210, "MQ131": 94, "MQ135": 173
}
```

---

## Data Quality Rules

| Rule | Trigger | Flag | Effect |
|------|---------|------|--------|
| PM10 isolated zero | PM10=0 with non-zero previous | `pm10: failed_read` | Stored as NULL, excluded from AQI |
| PM dual-zero (warmup) | PM1=PM2.5=0, within first 5 min | `pm_dual: possible_warmup` | UI shows "warming up" badge |
| PM dual-zero (below detection) | PM1=PM2.5=0, after 5 min | `pm_dual: below_detection` | Classifier uses PM10+gas only |
| Humidity glitch | RH < 10% or > 100% | `humidity: sensor_glitch` | Previous valid RH used for correction |
| MQ channel zero | Any MQx = 0 | `mq{x}: failed_read` | That channel substituted 0 in classifier |
| Timestamp gap | Gap > 10 minutes | `timestamp: logging_gap` | Gap duration logged |

---

## Humidity Correction

Laulainen / Chakrabarti hygroscopic growth correction:

```
PM_corrected = PM_raw / (1 - a × (RH/100)^b)
```

**Default calibration constants** (Indian urban, Mumbai monsoon):
- `a = 0.33`
- `b = 0.17`

These are configurable per-node in Node Management → Calibration a/b.

**To calibrate for your node:**
1. Collect collocated measurements at known RH levels
2. Fit `a` and `b` to minimize residuals vs. a reference gravimetric sampler
3. Update via `PATCH /api/v1/nodes/{id}` with your values

---

## Source Classification

**Model:** `RandomForestClassifier` (scikit-learn, 200 trees)

**Feature vector (11 features):**
| Feature | Description |
|---------|-------------|
| PM10/PM2.5 ratio | −1 sentinel if PM2.5=0 |
| PM2.5, PM10 | Raw values |
| MQ2, MQ4, MQ6, MQ7, MQ8, MQ131, MQ135 | Gas sensor readings |
| Humidity_Percent | Effective RH |

**Labels:**
| Label | Signature |
|-------|-----------|
| `construction_dust` | High PM10/PM2.5 ratio (>4), moderate gas, dust-like gas profile |
| `vehicle_combustion` | High MQ7 (CO), elevated MQ2, moderate PM ratio |
| `waste_burning` | Very high MQ2+MQ135, mixed PM |
| `humid_haze` | High RH, fine PM dominant, low gas |
| `clean` | Low PM + low gas across all channels |

**Retrain with real data:**
```bash
curl -X POST http://localhost:8000/api/v1/classifier/retrain \
  -H "Content-Type: application/json" \
  -d '{"labelled_data": [{"pm2_5": 17, "pm10": 39, ..., "label": "construction_dust"}]}'
```

---

## Relay Trigger Logic

```
Trigger ON  : label == "construction_dust"
              AND PM10_corrected > pm10_threshold
              AND condition sustained for >= relay_delay_min minutes
              AND reading has NO failed_read flag

Trigger OFF : PM10 drops below threshold (on a clean reading)
```

Default threshold: **50 µg/m³** | Default delay: **5 minutes**

---

## Alert Configuration

Set in `backend/.env`:
```bash
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_FROM_NUMBER=+1xxx      # SMS
TWILIO_WHATSAPP_FROM=+1xxx    # WhatsApp Business
SMTP_HOST=smtp.gmail.com
SMTP_USER=you@gmail.com
SMTP_PASSWORD=app-password
```

Channels gracefully skipped if credentials are absent.

---

## Project Structure

```
sourcesense/
├── backend/
│   ├── app/
│   │   ├── main.py              FastAPI app + lifespan
│   │   ├── config.py            Env-var settings
│   │   ├── database.py          Async SQLAlchemy
│   │   ├── models/              ORM models (node, reading, event, alert)
│   │   ├── schemas/             Pydantic schemas
│   │   ├── routers/             API routers
│   │   ├── services/
│   │   │   ├── validator.py     Data quality checks
│   │   │   ├── humidity_correction.py
│   │   │   ├── aqi_calculator.py
│   │   │   ├── classifier.py
│   │   │   ├── relay_logic.py
│   │   │   └── alert_dispatcher.py
│   │   └── ml/
│   │       └── train_classifier.py
│   ├── seed_data/real_data_2026_08_06.csv  (31 rows)
│   ├── seed.py                  DB seeder + quality report
│   └── tests/
│       ├── unit/                Validator, AQI, relay, humidity tests
│       └── integration/         31-row CSV pipeline test
├── frontend/
│   └── src/
│       ├── components/          AQIBadge, LiveReadingsCard, NodeMap, etc.
│       ├── pages/               Dashboard, NodeManagement, EventLog
│       ├── hooks/               useWebSocket
│       └── utils/               api.js, aqiColors.js, csvExport.js
├── docker-compose.yml
└── README.md
```

---

## Phase 1: The "Digital Twin" Dashboard (Software & UI)
Elevate the UI from a standard dashboard to a sci-fi command center.

- `[x]` **3D Map Integration**: Integrate `react-map-gl` or `three.js` to display a 3D view of the target construction site or city.
- `[x]` **Real-time Animations**: Add glowing pulse animations to the map nodes when pollution spikes.
- `[x]` **Suppression Radius Visuals**: Render a blue "mist radius" on the map when a node's relay is triggered.
- `[x]` **Impact Metrics**: Add a "Dust Suppressed (kg)" counter to the main dashboard, calculated based on PM10 drop rates during suppression.
