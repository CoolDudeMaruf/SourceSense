<div align="center">

# 🌿 SourceSense 

### Enterprise-Grade IoT Air Quality Monitoring & Autonomous Pollution Remediation Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_+_Vite-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/3D_Twin-Three.js-black?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python)](https://python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](./LICENSE)

> **Sense → Understand → Act** — A full-stack, AI-powered platform that ingests real IoT environmental data, detects pollution sources, and autonomously triggers suppression hardware before dust levels reach dangerous thresholds.

**Developed for IIT Bombay Techfest — Bangladesh Regional Rounds**

</div>

---

## 📌 Table of Contents

- [What is SourceSense?](#-what-is-sourcesense)
- [Key Features at a Glance](#-key-features-at-a-glance)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Quick Start (Docker)](#-quick-start-docker)
- [Local Development Setup](#-local-development-setup)
- [API Reference](#-api-reference)
- [Machine Learning Pipeline](#-machine-learning-pipeline)
- [Data Quality & Sensor Validation](#-data-quality--sensor-validation)
- [Project Structure](#-project-structure)
- [Running Tests](#-running-tests)
- [Configuration & Environment Variables](#-configuration--environment-variables)

---

## 🌍 What is SourceSense?

SourceSense is a fully integrated, enterprise-grade air quality monitoring system designed for urban construction sites and industrial environments. It goes far beyond a simple dashboard — it is an **autonomous remediation engine**.

**The Problem:** Urban construction sites generate dangerous levels of PM2.5 and PM10 particulate matter. Manual monitoring is too slow, too expensive, and too unreliable to prevent health hazards effectively.

**The Solution:** SourceSense deploys a network of IoT sensor nodes across the site. Each node continuously monitors air quality, identifies the pollution source using AI, and automatically triggers suppression hardware (water sprinklers, foggers, ventilation fans) in real time — all without requiring a human to act.

---

## ✨ Key Features at a Glance

| Feature | Description |
|---|---|
| 📡 **Real-Time Telemetry** | WebSocket-powered live ingestion of PM2.5, PM10, Temperature, Humidity across all nodes |
| 🗺️ **Interactive Site Map** | Geospatial canvas with color-coded status halos (Green/Amber/Red) per sensor node |
| 🤖 **Autonomous Action Engine** | 4-state node machine (`NORMAL`, `PENDING_ACTION`, `ACTIVE`, `FAULT`) with smart threshold logic |
| 🛡️ **Safety Interlock System** | Automatically disables all actuators if hardware faults are detected — zero rogue operations |
| 🧊 **3D Digital Twin (WebGL)** | Live Three.js 3D simulation of hardware with synchronized particle emitters during active remediation |
| 🧠 **AI Source Classification** | Random Forest model identifies pollution source (`construction_dust`, `vehicle_combustion`, `waste_burning`, etc.) |
| 💧 **Humidity-Corrected AQI** | Applies Laulainen/Chakrabarti hygroscopic growth correction before computing CPCB-standard AQI |
| 🎛️ **Judge View & Fault Injection** | Manual override panel with a live data injection slider to demonstrate any system state on demand |
| 📊 **CSV Data Export** | One-click historical telemetry and event log export for compliance reporting |
| 🔔 **Automated Alerts** | SMS, WhatsApp, and Email alert dispatch via Twilio & SMTP when thresholds are crossed |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Hardware Node (ESP32 + PM Sensors + MQ Gas Sensors)                │
│  POST /api/v1/readings  (2s burst cadence, 6–14 min gaps real-world)│
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP POST
┌──────────────────────────────▼──────────────────────────────────────┐
│  FastAPI Backend (Python 3.11)                                      │
│  ┌─────────────┐  ┌─────────────────┐  ┌────────────────────────┐  │
│  │ Ingest POST │→ │   Validation    │→ │   Processing Pipeline  │  │
│  │ /readings   │  │  · PM10 zero    │  │  · Humidity Correction │  │
│  └─────────────┘  │  · RH glitch    │  │  · CPCB AQI Calc       │  │
│                   │  · TS gap check │  │  · RF Source Classifier│  │
│                   │  · MQ channels  │  │  · Relay Trigger Logic │  │
│                   └─────────────────┘  └────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  WebSocket /ws/live/{node_id}  — pushes update every 3s     │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│  SQLite / PostgreSQL Database                                       │
│  Tables: nodes | readings (quality_flags JSONB) | events | alerts   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│  React + Vite Frontend                                              │
│  Dashboard | Node Management | Event Log | Judge View (3D Twin)     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Recharts, Lucide Icons, React Router |
| **3D Simulation** | Three.js, React Three Fiber, @react-three/drei |
| **Mapping** | Leaflet, React-Leaflet, MapLibre GL |
| **Backend** | FastAPI, Python 3.11, SQLAlchemy (Async), Pydantic v2 |
| **Database** | SQLite (dev) / PostgreSQL 16 (production) |
| **AI/ML** | scikit-learn (RandomForestClassifier, 200 trees), statsmodels (ARIMA forecast) |
| **Real-Time** | WebSockets (FastAPI native) |
| **Alerts** | Twilio SMS/WhatsApp, SMTP Email |
| **DevOps** | Docker, Docker Compose |

---

## 🚀 Quick Start (Docker)

The fastest way to get the full system running.

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose installed

```bash
# 1. Clone the repository
git clone https://github.com/CoolDudeMaruf/SourceSense.git
cd SourceSense

# 2. Start all services (backend + frontend + database)
docker-compose up --build
```

After the containers start, open the following in your browser:

| Service | URL |
|---|---|
| 🖥️ **Frontend Dashboard** | http://localhost:5173 |
| ⚙️ **Backend API** | http://localhost:8000 |
| 📖 **Interactive API Docs** | http://localhost:8000/docs |

```bash
# 3. Seed the database with real sensor data (2026-08-06 session)
docker-compose exec backend python seed.py
```

```bash
# 4. (Optional) Run mock sensor to test live WebSocket stream & animations
cd backend
python mock_sensor.py
```
> This creates a fake sensor node, fires a data spike to trigger AQI > 300, activates the suppression relay, and streams live data every 3 seconds to demonstrate all real-time features.

---

## 💻 Local Development Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # Edit DATABASE_URL if needed
uvicorn app.main:app --reload  # Starts on http://localhost:8000
python seed.py                 # Seeds the database with real data
```

### Frontend

```bash
cd frontend
npm install
npm run dev                    # Starts on http://localhost:5173
```

---

## 📡 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/readings` | `POST` | Ingest a sensor reading from a hardware node |
| `/api/v1/readings` | `GET` | List readings (filter by `node_id`, `limit`) |
| `/api/v1/nodes` | `GET` | List all registered sensor nodes |
| `/api/v1/nodes` | `POST` | Register a new node |
| `/api/v1/nodes/{id}` | `PATCH` | Update node config (name, thresholds, calibration) |
| `/api/v1/nodes/{id}` | `DELETE` | Deactivate a node |
| `/api/v1/events` | `GET` | List suppression event log |
| `/api/v1/export/csv` | `GET` | Export CSV of all readings + quality flags |
| `/api/v1/forecast/{node_id}` | `GET` | ARIMA-based PM10 forecast for a node |
| `/api/v1/classifier/retrain` | `POST` | Retrain the RF model with new labelled data |
| `/ws/live/{node_id}` | `WS` | WebSocket stream of live sensor readings |

Full interactive documentation available at: **`http://localhost:8000/docs`**

---

## 🧠 Machine Learning Pipeline

### Pollution Source Classification

**Model:** `RandomForestClassifier` (scikit-learn, 200 trees)

**Feature Vector (11 features):**
| Feature | Description |
|---|---|
| `PM10 / PM2.5 ratio` | Dust coarseness indicator (-1 sentinel if PM2.5 = 0) |
| `PM2.5`, `PM10` | Raw particulate readings |
| `MQ2, MQ4, MQ6, MQ7, MQ8, MQ131, MQ135` | Gas sensor array readings |
| `Humidity_Percent` | Effective relative humidity after validation |

**Predicted Labels:**
| Label | Pollution Signature |
|---|---|
| `construction_dust` | High PM10/PM2.5 ratio (>4), moderate gas, dust-like profile |
| `vehicle_combustion` | High MQ7 (CO), elevated MQ2, moderate PM ratio |
| `waste_burning` | Very high MQ2 + MQ135, mixed PM pattern |
| `humid_haze` | High RH, fine PM dominant, low gas readings |
| `clean` | Low PM and low gas across all channels |

**Retrain with your own data:**
```bash
curl -X POST http://localhost:8000/api/v1/classifier/retrain \
  -H "Content-Type: application/json" \
  -d '{"labelled_data": [{"pm2_5": 17, "pm10": 39, ..., "label": "construction_dust"}]}'
```

### Relay Trigger Logic
```
Trigger ON  : source == "construction_dust"
              AND PM10_corrected > pm10_threshold (default: 50 µg/m³)
              AND condition sustained >= relay_delay_min (default: 5 min)
              AND reading has NO failed_read quality flag

Trigger OFF : PM10 drops below threshold on a clean, validated reading
```

---

## 🔬 Data Quality & Sensor Validation

The validation engine catches known hardware failure modes before data enters the pipeline.

| Rule | Trigger | Flag Applied | Effect |
|---|---|---|---|
| PM10 isolated zero | PM10=0 while previous was non-zero | `pm10: failed_read` | Stored as NULL, excluded from AQI |
| PM dual-zero (warmup) | PM1=PM2.5=0 within first 5 min | `pm_dual: possible_warmup` | UI shows "warming up" badge |
| PM dual-zero (below detection) | PM1=PM2.5=0 after 5 min | `pm_dual: below_detection` | Classifier uses PM10 + gas only |
| Humidity glitch | RH < 10% or > 100% | `humidity: sensor_glitch` | Previous valid RH substituted |
| MQ channel zero | Any MQx = 0 | `mq{x}: failed_read` | That channel substituted 0 |
| Timestamp gap | Gap > 10 minutes | `timestamp: logging_gap` | Gap duration logged in event |

**Humidity Correction Formula (Laulainen / Chakrabarti):**
```
PM_corrected = PM_raw / (1 - a × (RH/100)^b)
```
Default for Indian urban / Mumbai monsoon: `a = 0.33`, `b = 0.17` *(configurable per-node)*

---

## 📁 Project Structure

```
SourceSense/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app + lifespan events
│   │   ├── config.py                # Environment variable settings
│   │   ├── database.py              # Async SQLAlchemy engine & session
│   │   ├── models/                  # ORM models (node, reading, event, alert)
│   │   ├── schemas/                 # Pydantic v2 request/response schemas
│   │   ├── routers/                 # API route handlers
│   │   └── services/
│   │       ├── validator.py         # Sensor data quality checks
│   │       ├── humidity_correction.py
│   │       ├── aqi_calculator.py    # CPCB AQI standard implementation
│   │       ├── classifier.py        # Random Forest source classifier
│   │       ├── relay_logic.py       # Actuator trigger decisions
│   │       └── alert_dispatcher.py  # SMS / WhatsApp / Email alerts
│   ├── seed_data/
│   │   └── real_data_2026_08_06.csv # 31 rows of real-world sensor data
│   ├── seed.py                      # Database seeder + quality report generator
│   ├── mock_sensor.py               # Fake node for live demo/testing
│   ├── requirements.txt
│   ├── Dockerfile
│   └── tests/
│       ├── unit/                    # Validator, AQI, relay, humidity unit tests
│       └── integration/             # 31-row CSV end-to-end pipeline test
├── frontend/
│   └── src/
│       ├── components/              # AQIBadge, LiveReadingsCard, NodeMap, etc.
│       ├── pages/
│       │   ├── Dashboard.jsx        # Main command center view
│       │   ├── NodeManagement.jsx   # Node config & calibration
│       │   ├── EventLog.jsx         # Suppression event timeline
│       │   ├── JudgeView.jsx        # Competition view
│       │   └── ContestDashboard.jsx # Enterprise 3D Judge Dashboard
│       ├── hooks/
│       │   └── useWebSocket.js      # Live data WebSocket hook
│       └── utils/
│           ├── api.js               # REST API client
│           ├── aqiColors.js         # AQI color scale mapping
│           └── csvExport.js         # CSV download utility
├── docker-compose.yml
├── features.md
└── README.md
```

---

## 🧪 Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

**Expected Results:**
```
tests/unit/test_validator.py              12 passed
tests/unit/test_aqi.py                    9 passed
tests/unit/test_relay.py                  6 passed
tests/unit/test_humidity_correction.py    8 passed
tests/integration/test_ingestion.py       8 passed

========== 43 passed in 2.41s ==========
```

---

## ⚙️ Configuration & Environment Variables

Copy `.env.example` to `.env` inside the `backend/` folder and configure:

```bash
# Database
DATABASE_URL=sqlite+aiosqlite:///./sourcesense.db

# Alert Channels (optional — gracefully skipped if not set)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1xxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+1xxxxxxxxxx

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your_app_password
ALERT_EMAIL_TO=recipient@example.com
```

---

<div align="center">

**Built with ❤️ for IIT Bombay Techfest — Bangladesh Regional Rounds**

*SourceSense — Sense → Understand → Act*

</div>
