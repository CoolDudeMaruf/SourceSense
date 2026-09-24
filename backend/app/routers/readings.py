"""
SourceSense – Sensor readings ingestion router.

POST /api/v1/readings  — ingest a new sensor reading
GET  /api/v1/readings  — paginated list of readings (optional node_id filter)
GET  /api/v1/readings/{reading_id} — single reading detail
"""
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models.node import Node
from app.models.reading import Reading
from app.models.event import Event
from app.models.alert import Alert
from app.schemas.reading import SensorPayload, ReadingOut, IngestionResponse
from app.services.validator import (
    validate_reading, get_effective_humidity,
    is_pm10_usable, summarise_flags,
)
from app.services.humidity_correction import correct_reading
from app.services.aqi_calculator import calculate_aqi
from app.services.classifier import classify
from app.services.relay_logic import relay_manager
from app.services import alert_dispatcher

from app.services.ai import (
    get_sensor_trust, analyze_history, generate_forecast, 
    optimize_intervention, safety_gate
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/readings", tags=["readings"])

# In-memory per-node state for validation context
_node_context: dict[int, dict] = {}


def _get_node_context(node_id: int) -> dict:
    if node_id not in _node_context:
        _node_context[node_id] = {
            "prev_row": None,
            "prev_valid_humidity": None,
            "first_seen": None,
        }
    return _node_context[node_id]


@router.post("", response_model=IngestionResponse, status_code=201)
async def ingest_reading(payload: SensorPayload, db: AsyncSession = Depends(get_db)):
    """Ingest a new sensor reading, run validation, compute AQI + classification."""
    # ── Fetch node ────────────────────────────────────────────────────────────
    result = await db.execute(select(Node).where(Node.id == payload.node_id))
    node: Optional[Node] = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail=f"Node {payload.node_id} not found")

    ctx = _get_node_context(payload.node_id)
    if ctx["first_seen"] is None:
        ctx["first_seen"] = payload.Timestamp

    # ── Row dict for validation ───────────────────────────────────────────────
    row = {
        "Timestamp": payload.Timestamp,
        "PM1.0": payload.PM1_0,
        "PM2.5": payload.PM2_5,
        "PM10": payload.PM10,
        "Humidity_Percent": payload.Humidity_Percent,
        "MQ2": payload.MQ2, "MQ4": payload.MQ4, "MQ6": payload.MQ6,
        "MQ7": payload.MQ7, "MQ8": payload.MQ8, "MQ131": payload.MQ131,
        "MQ135": payload.MQ135,
    }

    # ── Validate ──────────────────────────────────────────────────────────────
    quality_flags = validate_reading(
        row=row,
        prev_row=ctx["prev_row"],
        node_first_seen=ctx["first_seen"],
    )

    # ── Effective humidity (substitute if glitched) ───────────────────────────
    effective_rh = get_effective_humidity(
        current_humidity=payload.Humidity_Percent,
        quality_flags=quality_flags,
        prev_valid_humidity=ctx["prev_valid_humidity"],
    )
    if quality_flags.get("humidity") != "sensor_glitch":
        ctx["prev_valid_humidity"] = payload.Humidity_Percent

    # ── PM correction ─────────────────────────────────────────────────────────
    correction = correct_reading(
        pm2_5_raw=payload.PM2_5,
        pm10_raw=payload.PM10,
        effective_rh=effective_rh,
        a=node.calib_a,
        b=node.calib_b,
        pm10_flagged=quality_flags.get("pm10") == "failed_read",
        humidity_flagged=quality_flags.get("humidity") == "sensor_glitch",
    )

    # ── AQI ───────────────────────────────────────────────────────────────────
    aqi_result = calculate_aqi(
        pm2_5=correction["pm2_5_corrected"],
        pm10=correction["pm10_corrected"],
    )

    # ── Classification ────────────────────────────────────────────────────────
    clf_result = classify(
        pm2_5=payload.PM2_5,
        pm10=payload.PM10 if is_pm10_usable(quality_flags) else None,
        mq2=payload.MQ2, mq4=payload.MQ4, mq6=payload.MQ6,
        mq7=payload.MQ7, mq8=payload.MQ8, mq131=payload.MQ131,
        mq135=payload.MQ135,
        humidity=effective_rh or payload.Humidity_Percent,
        quality_flags=quality_flags,
    )

    # ── AI Intelligence Layer ─────────────────────────────────────────────────
    trust_score = get_sensor_trust(node.id, payload.PM10, quality_flags)
    
    history_analysis = analyze_history(
        zone=node.zone, 
        pm10=correction["pm10_corrected"], 
        timestamp=payload.Timestamp
    )
    
    pm10_trend = 0.0
    if ctx.get("prev_row") and ctx["prev_row"].get("PM10"):
         pm10_trend = payload.PM10 - ctx["prev_row"]["PM10"]
         
    time_factor = 1.2 if history_analysis.get("is_recurring") else 1.0
    forecast_data = generate_forecast(correction["pm10_corrected"], pm10_trend, time_factor)

    # Optimizer
    opt_plan = optimize_intervention(
         zone=node.zone,
         pm10=correction["pm10_corrected"],
         forecast_30m=forecast_data["forecast_30m"],
         sensor_trust=trust_score,
         classifier_label=clf_result["label"],
         classifier_confidence=clf_result["confidence"]
    )
    
    # Safety Gate
    safe_decision = safety_gate(node.id, node.control_mode, opt_plan)
    
    # We override the old relay logic with the AI decision
    relay_state = safe_decision["relay_action"] == "ON"
    relay_action = safe_decision["relay_action"] if relay_state != ctx.get("prev_relay_state", False) else None
    ctx["prev_relay_state"] = relay_state

    # ── Persist reading ───────────────────────────────────────────────────────
    reading = Reading(
        node_id=node.id,
        timestamp=payload.Timestamp,
        temperature_c=payload.Temperature_C,
        humidity_percent=payload.Humidity_Percent,
        pm1_0_raw=payload.PM1_0,
        pm2_5_raw=payload.PM2_5,
        pm10_raw=payload.PM10 if quality_flags.get("pm10") != "failed_read" else None,
        pm2_5_corrected=correction["pm2_5_corrected"],
        pm10_corrected=correction["pm10_corrected"],
        humidity_used=effective_rh,
        mq2=payload.MQ2, mq4=payload.MQ4, mq6=payload.MQ6,
        mq7=payload.MQ7, mq8=payload.MQ8, mq131=payload.MQ131,
        mq135=payload.MQ135,
        quality_flags=quality_flags,
        aqi=aqi_result["aqi"],
        aqi_category=aqi_result["aqi_category"],
        aqi_pm25_subindex=aqi_result["pm25_subindex"],
        aqi_pm10_subindex=aqi_result["pm10_subindex"],
        classifier_label=clf_result["label"],
        classifier_confidence=clf_result["confidence"],
        relay_state=relay_state,
        sensor_trust_score=trust_score,
        forecast_10m=forecast_data["forecast_10m"],
        forecast_20m=forecast_data["forecast_20m"],
        forecast_30m=forecast_data["forecast_30m"],
    )
    db.add(reading)
    await db.flush()

    # ── Log suppression event if relay changed ────────────────────────────────
    if relay_action in ("ON", "OFF"):
        event = Event(
            node_id=node.id,
            reading_id=reading.id,
            timestamp=payload.Timestamp,
            pm10_raw=payload.PM10,
            pm10_corrected=correction["pm10_corrected"],
            pm2_5_raw=payload.PM2_5,
            pm2_5_corrected=correction["pm2_5_corrected"],
            classifier_label=clf_result["label"],
            classifier_confidence=clf_result["confidence"],
            quality_flags=quality_flags,
            relay_action=relay_action,
            trigger_reason=safe_decision.get("reason"),
            intensity=opt_plan.get("intensity") if relay_action == "ON" else None,
            duration_min=opt_plan.get("duration_min") if relay_action == "ON" else None,
            water_used_l=opt_plan.get("estimated_water_l") if relay_action == "ON" else None,
            energy_used_kwh=opt_plan.get("estimated_energy_kwh") if relay_action == "ON" else None,
            pm_before=correction["pm10_corrected"] if relay_action == "ON" else None,
        )
        db.add(event)
        await db.flush()

        # Dispatch alerts
        dispatch_results = alert_dispatcher.dispatch(
            event_data={
                "relay_action": relay_action,
                "pm10_corrected": correction["pm10_corrected"],
                "classifier_label": clf_result["label"],
                "classifier_confidence": clf_result["confidence"],
                "timestamp": str(payload.Timestamp),
                "node_name": node.name,
                "trigger_reason": safe_decision.get("reason"),
            },
            site_manager_phone=node.site_manager_phone,
            site_manager_email=node.site_manager_email,
        )
        for res in dispatch_results:
            alert = Alert(
                event_id=event.id,
                channel=res["channel"],
                recipient=res["recipient"],
                status=res["status"],
                message=res.get("message"),
                error_detail=res.get("detail"),
            )
            db.add(alert)

    await db.commit()
    await db.refresh(reading)

    # Update context
    ctx["prev_row"] = row

    return IngestionResponse(
        status="ok",
        reading_id=reading.id,
        quality_flags=quality_flags,
        validation_summary=summarise_flags(quality_flags),
        aqi=aqi_result["aqi"],
        aqi_category=aqi_result["aqi_category"],
        classifier_label=clf_result["label"],
        classifier_confidence=clf_result["confidence"],
        relay_state=relay_state,
        relay_action=relay_action,
        sensor_trust_score=trust_score,
        forecast_10m=forecast_data["forecast_10m"],
        forecast_20m=forecast_data["forecast_20m"],
        forecast_30m=forecast_data["forecast_30m"],
    )


@router.get("", response_model=list[ReadingOut])
async def list_readings(
    node_id: Optional[int] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    q = select(Reading).order_by(desc(Reading.timestamp)).limit(limit).offset(offset)
    if node_id:
        q = q.where(Reading.node_id == node_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{reading_id}", response_model=ReadingOut)
async def get_reading(reading_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Reading).where(Reading.id == reading_id))
    reading = result.scalar_one_or_none()
    if not reading:
        raise HTTPException(status_code=404, detail="Reading not found")
    return reading
