# SourceSense: Full Repository Audit Report

## 1. Current Architecture
SourceSense currently operates as a decoupled two-tier system (Edge + Cloud) with a React/Vite frontend dashboard.
- **Backend:** FastAPI application utilizing SQLite (`sourcesense.db`). It exposes a REST API for readings, events, and nodes, alongside a WebSocket implementation for live telemetry.
- **Frontend:** React application built with Vite and TailwindCSS. It provides a real-time dashboard, node management, event logs, and a 3D digital twin.
- **Edge / Firmware:** ESP32-based Arduino firmware (`EdgeNode.ino`) integrating Eloquent::ML for TinyML inference. It reads analog sensors and controls a local relay.

## 2. Actual Data Flow
1. Data generation relies heavily on `mock_sensor.py`, which posts synthetic payloads to `/api/v1/readings`.
2. The backend ingests the payload, runs a basic data validator (checking for zero-reads and humidity glitches), and applies a hygroscopic growth correction.
3. The reading is passed to a RandomForest classifier (`classifier.py`) and an AQI calculator.
4. The system evaluates "AI Intelligence" (`ai/synthetic.py`) to generate trust scores, forecasts, and optimization plans, which currently appear to be heavily mocked or synthetic.
5. `relay_logic.py` (or the AI safety gate) determines the relay state and triggers an event log if an intervention occurs.
6. The frontend consumes this data via REST polling and WebSocket updates.

## 3. Actual ML Pipeline
- **Training:** The current RandomForest model is trained on synthetic data (`train_classifier.py`). There is no established pipeline for real labeled data, validation sets, or hyperparameter tuning.
- **Feature Vector Discrepancy:** The backend classifier expects an **11-feature** vector: `[pm10_pm25_ratio, pm2_5, pm10, MQ2, MQ4, MQ6, MQ7, MQ8, MQ131, MQ135, humidity]`.
- **Edge Inference:** The ESP32 firmware (`EdgeNode.ino`) only constructs a **6-feature** vector: `[pm25, pm10, co, no2, temperature, humidity]` and attempts to run `classifier.predict(features)`. This is a critical mismatch; the edge model and backend model are completely misaligned.

## 4. Actual Actuator Path
- **Edge (Fail-Safe):** If the local TinyML model detects an anomaly and thresholds are crossed, the ESP32 directly sets `RELAY_PIN` to `HIGH`.
- **Backend:** The backend determines relay states via `relay_logic.py` (and the newer AI optimizer) and logs it.
- **Actuator Verification:** There is **zero feedback**. Both the edge and the backend assume that issuing a "PUMP ON" command guarantees water is spraying. There is no flow sensor or current monitoring abstraction.

## 5. Broken / Incomplete Modules
- **`EdgeNode.ino` Network Stack:** The `sendToCloud` function is an empty stub. The firmware is entirely disconnected from the cloud in reality.
- **AI Intelligence Layer:** Functions like `get_sensor_trust`, `analyze_history`, `generate_forecast`, and `optimize_intervention` rely on simplistic math and synthetic logic rather than true physical models or robust ML.
- **AQI Calculator:** It only calculates based on PM2.5 and PM10, despite the presence of numerous gas sensors.

## 6. Technical Risks
- **No Temporal Persistence on Edge:** The edge firmware triggers the relay based on a single loop's reading (`pm25 > 50.0 || pm10 > 80.0`). This is highly susceptible to false positives from sensor noise.
- **Unverified Actuation:** Actuating a high-power water pump without safety checks, tank level verification, or flow feedback is physically dangerous and unreliable.
- **Lack of Multi-Node Reasoning:** The current control pipeline operates on a per-node basis. There is no spatial correlation, neighbor agreement, or plume tracking used to confirm an event before actuation.

## 7. Duplicated Systems
- **Decision Logic:** The logic to trigger an intervention exists in both the edge firmware (hardcoded thresholds) and the backend (`relay_logic.py` + AI optimizer). They are not synchronized and could easily conflict if the edge actually connected to the cloud.

## 8. Inconsistencies & Unsupported Claims
- **Feature Schema:** As mentioned, 11 features on the backend vs. 6 features on the edge.
- **False Claims:** The documentation and UI imply a fully integrated "AI Trust Engine", "Predictive Forecasting", and "Digital Twin" that are actually powered by randomized/synthetic data generators or simplistic heuristics rather than real computational models.
- **Exact Source ID:** The system claims to identify exact sources (e.g., "Construction Dust") based solely on local gas/PM signatures, without acknowledging the probabilistic nature of the inference or incorporating spatial/wind data.

## 9. Recommended Migration Plan

### Phase 1: Core Architecture & Truthfulness (P0)
1. **Unify the Control Pipeline:** Establish the backend as the authoritative decision-maker. The edge should focus on reliable sensing, buffering, and fail-safe safety shutdowns, not primary decision logic.
2. **Fix the Feature Schema:** Align the edge and backend to use the exact same feature vector, units, and preprocessing steps.
3. **Sensor Trust Engine:** Replace synthetic trust scores with a real engine that evaluates data freshness, missing values, neighbor agreement, and baseline drift.
4. **Implement Temporal Persistence:** Ensure no event or actuation triggers without sustained evidence over a configured time window (e.g., $N$ seconds).
5. **Actuator Verification:** Implement a verification abstraction in the backend (e.g., expecting a simulated flow rate response when the pump is ON).

### Phase 2: Advanced Intelligence (P1)
6. **Multi-Node Localization:** Shift from single-node classification to zone-based probable source localization using PM gradients and neighbor agreement.
7. **Active Sensing:** Allow the backend to command the edge nodes to increase their sampling rate (`INVESTIGATION MODE`) when an anomaly is suspected.
8. **Intervention Optimization:** Implement a real utility function that weighs pollution reduction against water/energy costs and false-action penalties.
9. **Closed-Loop Measurement:** Calculate and store the actual PM drop, comparing it against a forecasted "untreated" trajectory and a reference zone.

### Phase 3: Final Polish & Validation (P2)
10. **Refine the Digital Twin:** Ensure the 3D visualization is driven entirely by real backend state, clearly separating live nodes from simulated ones.
11. **Deterministic Demo Scenarios:** Build robust Python scripts to reliably inject specific scenarios (Construction Dust, Sensor Failure, Communication Loss) for judging.
12. **Documentation Rewrite:** Remove all marketing fluff and unsupported claims. Clearly define what is implemented, what is simulated, and what is planned.
