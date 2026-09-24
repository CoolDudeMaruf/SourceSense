"""SourceSense – Pydantic schemas for events and alerts."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class EventOut(BaseModel):
    id: int
    node_id: int
    reading_id: Optional[int]
    timestamp: datetime
    pm10_raw: Optional[float]
    pm10_corrected: Optional[float]
    pm2_5_raw: Optional[float]
    pm2_5_corrected: Optional[float]
    classifier_label: Optional[str]
    classifier_confidence: Optional[float]
    quality_flags: dict
    relay_action: str
    trigger_reason: Optional[str]
    intensity: Optional[float] = None
    duration_min: Optional[int] = None
    water_used_l: Optional[float] = None
    energy_used_kwh: Optional[float] = None
    pm_before: Optional[float] = None
    pm_after_actual: Optional[float] = None
    pm_after_estimated_baseline: Optional[float] = None
    effectiveness: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertOut(BaseModel):
    id: int
    event_id: int
    channel: str
    recipient: str
    status: str
    message: Optional[str]
    error_detail: Optional[str]
    sent_at: datetime

    model_config = {"from_attributes": True}
