"""SourceSense – Node ORM model."""
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Node(Base):
    __tablename__ = "nodes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    location_lat: Mapped[float] = mapped_column(Float, nullable=False, default=19.0760)
    location_lon: Mapped[float] = mapped_column(Float, nullable=False, default=72.8777)
    description: Mapped[str] = mapped_column(String(256), nullable=True)
    site_manager_name: Mapped[str] = mapped_column(String(128), nullable=True)
    site_manager_email: Mapped[str] = mapped_column(String(256), nullable=True)
    site_manager_phone: Mapped[str] = mapped_column(String(32), nullable=True)

    # Relay / trigger config
    pm10_threshold: Mapped[float] = mapped_column(Float, default=50.0)
    relay_delay_min: Mapped[int] = mapped_column(Integer, default=5)

    # Humidity-correction calibration
    calib_a: Mapped[float] = mapped_column(Float, default=0.33)
    calib_b: Mapped[float] = mapped_column(Float, default=0.17)

    # AI and Control Layer
    control_mode: Mapped[str] = mapped_column(String(32), default="AUTONOMOUS") # MANUAL, SIMULATION, AUTONOMOUS
    zone: Mapped[str] = mapped_column(String(32), default="Z1")

    is_active: Mapped[bool] = mapped_column(default=True)
    
    # Telemetry and Maintenance
    battery_level: Mapped[float] = mapped_column(Float, default=100.0) # percentage
    power_consumption_w: Mapped[float] = mapped_column(Float, default=2.5) # watts
    last_cleaning_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    last_battery_replacement: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    readings: Mapped[list["Reading"]] = relationship("Reading", back_populates="node", lazy="select")
    events: Mapped[list["Event"]] = relationship("Event", back_populates="node", lazy="select")
