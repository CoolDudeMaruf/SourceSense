"""SourceSense – Event ORM model (suppression events)."""
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey, func
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    node_id: Mapped[int] = mapped_column(Integer, ForeignKey("nodes.id"), nullable=False, index=True)
    reading_id: Mapped[int] = mapped_column(Integer, ForeignKey("readings.id"), nullable=True)

    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, index=True)
    pm10_raw: Mapped[float] = mapped_column(Float, nullable=True)
    pm10_corrected: Mapped[float] = mapped_column(Float, nullable=True)
    pm2_5_raw: Mapped[float] = mapped_column(Float, nullable=True)
    pm2_5_corrected: Mapped[float] = mapped_column(Float, nullable=True)
    classifier_label: Mapped[str] = mapped_column(String(64), nullable=True)
    classifier_confidence: Mapped[float] = mapped_column(Float, nullable=True)
    quality_flags: Mapped[dict] = mapped_column(JSON, default=dict)
    relay_action: Mapped[str] = mapped_column(String(16), nullable=False)  # "ON" | "OFF"
    trigger_reason: Mapped[str] = mapped_column(String(256), nullable=True)

    # ── Optimizer and Impact Layer ──────────────────────────────────────────
    intensity: Mapped[float] = mapped_column(Float, nullable=True)
    duration_min: Mapped[int] = mapped_column(Integer, nullable=True)
    water_used_l: Mapped[float] = mapped_column(Float, nullable=True)
    energy_used_kwh: Mapped[float] = mapped_column(Float, nullable=True)
    pm_before: Mapped[float] = mapped_column(Float, nullable=True)
    pm_after_actual: Mapped[float] = mapped_column(Float, nullable=True)
    pm_after_estimated_baseline: Mapped[float] = mapped_column(Float, nullable=True)
    effectiveness: Mapped[float] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    node: Mapped["Node"] = relationship("Node", back_populates="events")
    reading: Mapped["Reading"] = relationship("Reading", back_populates="event")
    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="event", lazy="select")
