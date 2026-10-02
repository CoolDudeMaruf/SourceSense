"""SourceSense – Pydantic schemas for sensor readings."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator, field_serializer


class SensorPayload(BaseModel):
    """Incoming JSON payload from a hardware node. Column names match CSV schema exactly."""
    node_id: int
    Timestamp: datetime
    Temperature_C: float
    Humidity_Percent: float
    PM1_0: float = Field(alias="PM1.0")
    PM2_5: float = Field(alias="PM2.5")
    PM10: float
    MQ2: float
    MQ4: float
    MQ6: float
    MQ7: float
    MQ8: float
    MQ131: float
    MQ135: float
    battery_level: Optional[float] = None
    is_solar_charging: Optional[bool] = None

    model_config = {"populate_by_name": True}


class ReadingOut(BaseModel):
    """Response schema for a reading record."""
    id: int
    node_id: int
    timestamp: datetime
    temperature_c: Optional[float]
    humidity_percent: Optional[float]
    pm1_0_raw: Optional[float]
    pm2_5_raw: Optional[float]
    pm10_raw: Optional[float]
    pm2_5_corrected: Optional[float]
    pm10_corrected: Optional[float]
    humidity_used: Optional[float]
    mq2: Optional[float]
    mq4: Optional[float]
    mq6: Optional[float]
    mq7: Optional[float]
    mq8: Optional[float]
    mq131: Optional[float]
    mq135: Optional[float]
    aqi: Optional[int]
    aqi_category: Optional[str]
    aqi_pm25_subindex: Optional[int]
    aqi_pm10_subindex: Optional[int]
    classifier_label: Optional[str]
    classifier_confidence: Optional[float]
    relay_state: bool
    action_reason: Optional[str] = None
    intensity: Optional[float] = None
    duration_min: Optional[int] = None
    quality_flags: dict
    is_synthetic: bool = False
    sensor_trust_score: float = 100.0
    forecast_10m: Optional[float] = None
    forecast_20m: Optional[float] = None
    forecast_30m: Optional[float] = None
    battery_level: Optional[float] = None
    is_solar_charging: Optional[bool] = None
    power_consumption_w: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer('timestamp', 'created_at')
    def serialize_dt(self, dt: datetime, _info):
        if dt.tzinfo is None:
            return dt.isoformat() + "Z"
        return dt.isoformat()


class IngestionResponse(BaseModel):
    """Response returned after a POST /api/v1/readings call."""
    status: str
    reading_id: int
    quality_flags: dict
    validation_summary: dict
    aqi: Optional[int]
    aqi_category: Optional[str]
    classifier_label: Optional[str]
    classifier_confidence: Optional[float]
    relay_state: bool
    relay_action: Optional[str]  # "ON" | "OFF" | None
    is_synthetic: bool = False
    sensor_trust_score: float = 100.0
    forecast_10m: Optional[float] = None
    forecast_20m: Optional[float] = None
    forecast_30m: Optional[float] = None
