"""SourceSense – Pydantic schemas for nodes."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class NodeCreate(BaseModel):
    name: str
    location_lat: float = 19.0760
    location_lon: float = 72.8777
    description: Optional[str] = None
    site_manager_name: Optional[str] = None
    site_manager_email: Optional[str] = None
    site_manager_phone: Optional[str] = None
    pm10_threshold: float = 50.0
    relay_delay_min: int = 5
    calib_a: float = 0.33
    calib_b: float = 0.17
    control_mode: str = "AUTONOMOUS"
    zone: str = "Z1"
    battery_level: float = 100.0
    is_charging: bool = False
    health_score: float = 100.0
    power_consumption_w: float = 2.5
    last_cleaning_date: Optional[datetime] = None
    last_battery_replacement: Optional[datetime] = None


class NodeUpdate(BaseModel):
    name: Optional[str] = None
    location_lat: Optional[float] = None
    location_lon: Optional[float] = None
    description: Optional[str] = None
    site_manager_name: Optional[str] = None
    site_manager_email: Optional[str] = None
    site_manager_phone: Optional[str] = None
    pm10_threshold: Optional[float] = None
    relay_delay_min: Optional[int] = None
    calib_a: Optional[float] = None
    calib_b: Optional[float] = None
    is_active: Optional[bool] = None
    control_mode: Optional[str] = None
    zone: Optional[str] = None
    battery_level: Optional[float] = None
    is_charging: Optional[bool] = None
    health_score: Optional[float] = None
    power_consumption_w: Optional[float] = None
    last_cleaning_date: Optional[datetime] = None
    last_battery_replacement: Optional[datetime] = None


class NodeOut(BaseModel):
    id: int
    name: str
    location_lat: float
    location_lon: float
    description: Optional[str]
    site_manager_name: Optional[str]
    site_manager_email: Optional[str]
    site_manager_phone: Optional[str]
    pm10_threshold: float
    relay_delay_min: int
    calib_a: float
    calib_b: float
    is_active: bool
    control_mode: str
    zone: str
    battery_level: float
    is_charging: bool
    health_score: float
    power_consumption_w: float
    last_cleaning_date: Optional[datetime]
    last_battery_replacement: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}
