"""SourceSense – Reading ORM model."""
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, Boolean, ForeignKey, func
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Reading(Base):
    __tablename__ = "readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    node_id: Mapped[int] = mapped_column(Integer, ForeignKey("nodes.id"), nullable=False, index=True)

    # ── Raw sensor values (exactly matching CSV schema) ───────────────────────
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, index=True)
    temperature_c: Mapped[float] = mapped_column(Float, nullable=True)
    humidity_percent: Mapped[float] = mapped_column(Float, nullable=True)
    pm1_0_raw: Mapped[float] = mapped_column(Float, nullable=True)
    pm2_5_raw: Mapped[float] = mapped_column(Float, nullable=True)
    pm10_raw: Mapped[float] = mapped_column(Float, nullable=True)
    mq2: Mapped[float] = mapped_column(Float, nullable=True)
    mq4: Mapped[float] = mapped_column(Float, nullable=True)
    mq6: Mapped[float] = mapped_column(Float, nullable=True)
    mq7: Mapped[float] = mapped_column(Float, nullable=True)
    mq8: Mapped[float] = mapped_column(Float, nullable=True)
    mq131: Mapped[float] = mapped_column(Float, nullable=True)
    mq135: Mapped[float] = mapped_column(Float, nullable=True)

    # ── Corrected / derived values ────────────────────────────────────────────
    pm2_5_corrected: Mapped[float] = mapped_column(Float, nullable=True)
    pm10_corrected: Mapped[float] = mapped_column(Float, nullable=True)
    humidity_used: Mapped[float] = mapped_column(Float, nullable=True)  # effective RH after glitch subst.

    # ── AQI ──────────────────────────────────────────────────────────────────
    aqi: Mapped[int] = mapped_column(Integer, nullable=True)
    aqi_category: Mapped[str] = mapped_column(String(32), nullable=True)
    aqi_pm25_subindex: Mapped[int] = mapped_column(Integer, nullable=True)
    aqi_pm10_subindex: Mapped[int] = mapped_column(Integer, nullable=True)

    # ── Classifier output ─────────────────────────────────────────────────────
    classifier_label: Mapped[str] = mapped_column(String(64), nullable=True)
    classifier_confidence: Mapped[float] = mapped_column(Float, nullable=True)

    # ── Relay state ───────────────────────────────────────────────────────────
    relay_state: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ── AI Layer ─────────────────────────────────────────────────────────────
    action_reason: Mapped[str] = mapped_column(String(256), nullable=True)
    intensity: Mapped[float] = mapped_column(Float, nullable=True)
    duration_min: Mapped[int] = mapped_column(Integer, nullable=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    sensor_trust_score: Mapped[float] = mapped_column(Float, default=100.0)
    forecast_10m: Mapped[float] = mapped_column(Float, nullable=True)
    forecast_20m: Mapped[float] = mapped_column(Float, nullable=True)
    forecast_30m: Mapped[float] = mapped_column(Float, nullable=True)

    # ── Quality flags (JSONB) ─────────────────────────────────────────────────
    # Example: {"pm10": "failed_read", "humidity": "sensor_glitch", "mq131": "failed_read",
    #           "pm_dual": "below_detection", "timestamp": "logging_gap", "gap_minutes": 14.2}
    quality_flags: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    node: Mapped["Node"] = relationship("Node", back_populates="readings")
    event: Mapped["Event"] = relationship("Event", back_populates="reading", uselist=False)
