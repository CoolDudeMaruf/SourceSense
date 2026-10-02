"""SourceSense – Async SQLAlchemy database setup."""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

engine = create_async_engine(
    settings.get_async_db_url(),
    echo=False,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI dependency – yields an async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def create_all_tables():
    """Create all tables on startup (idempotent)."""
    async with engine.begin() as conn:
        from app.models import node, reading, event, alert  # noqa: F401 – register models
        await conn.run_sync(Base.metadata.create_all)

    # Auto-migration: add new columns outside the main transaction so a
    # duplicate-column error on re-deploy does NOT poison the whole connection.
    # PostgreSQL supports "ADD COLUMN IF NOT EXISTS" (pg 9.6+).
    from sqlalchemy import text
    migrations = [
        "ALTER TABLE readings ADD COLUMN IF NOT EXISTS battery_level FLOAT;",
        "ALTER TABLE readings ADD COLUMN IF NOT EXISTS is_solar_charging BOOLEAN;",
    ]
    for stmt in migrations:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(stmt))
        except Exception:
            pass  # Column already exists on this DB instance (SQLite fallback)


async def seed_essential_nodes():
    """Ensure essential demo nodes exist directly in DB on startup."""
    from sqlalchemy import select
    from app.models.node import Node
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(select(Node).where(Node.name == "00 - Judge View Node"))
            judge_node = result.scalar_one_or_none()
            if not judge_node:
                judge_node = Node(
                    name="01 - Judge View Node (Sim)",
                    location_lat=23.8105,
                    location_lon=90.4130,
                    zone="Demo",
                    description="Barrier-free demonstrator node — cycles actions every 10 sec",
                    control_mode="AUTONOMOUS",
                    pm10_threshold=100.0,
                    calib_a=0.33,
                    calib_b=0.17,
                    is_active=True,
                    battery_level=99.0,
                    is_charging=True,
                    health_score=100.0,
                    power_consumption_w=0.15
                )
                session.add(judge_node)
                await session.commit()
                await session.refresh(judge_node)

            from app.models.reading import Reading
            from datetime import datetime, timezone, timedelta
            existing_readings = (await session.execute(select(Reading).where(Reading.node_id == judge_node.id))).scalars().all()
            if not existing_readings:
                now = datetime.now(timezone.utc)
                initial_scenarios = [
                    ("construction_dust", 260.0, 38.0, 280),
                    ("vehicle_combustion", 310.0, 85.0, 310),
                    ("waste_burning", 340.0, 120.0, 340),
                    ("humid_haze", 180.0, 95.0, 180),
                    ("clean", 28.0, 15.0, 30),
                ]
                for idx, (label, pm10, pm25, aqi) in enumerate(initial_scenarios):
                    r = Reading(
                        node_id=judge_node.id,
                        timestamp=now - timedelta(seconds=(5 - idx) * 10),
                        temperature_c=29.5,
                        humidity_percent=60.0,
                        pm1_0_raw=pm25 * 0.6,
                        pm2_5_raw=pm25,
                        pm10_raw=pm10,
                        pm2_5_corrected=pm25,
                        pm10_corrected=pm10,
                        humidity_used=60.0,
                        mq2=280, mq4=210, mq6=170, mq7=300, mq8=180, mq131=95, mq135=190,
                        quality_flags={"pm10": "normal", "humidity": "normal"},
                        aqi=aqi,
                        aqi_category="Severe" if aqi > 200 else "Moderate" if aqi > 100 else "Good",
                        classifier_label=label,
                        classifier_confidence=0.92,
                        relay_state=(aqi > 100 and label != "humid_haze"),
                        action_reason=f"Demonstration reading for {label}",
                        sensor_trust_score=100.0,
                        battery_level=99.0,
                        is_solar_charging=True
                    )
                    session.add(r)
                await session.commit()

            # Seed Physical Edge Node 30 if it doesn't exist
            res30 = await session.execute(select(Node).where(Node.id == 30))
            node30 = res30.scalar_one_or_none()
            if not node30:
                node30 = Node(
                    id=30,
                    name="00 - AI Edge Test Node",
                    location_lat=23.8103,
                    location_lon=90.4125,
                    zone="Demo",
                    description="Hardware ESP8266 Edge Device",
                    control_mode="AUTONOMOUS",
                    pm10_threshold=100.0,
                    calib_a=0.33,
                    calib_b=0.17,
                    is_active=True,
                    battery_level=100.0,
                    is_charging=True,
                    health_score=100.0,
                    power_consumption_w=0.15
                )
                session.add(node30)
                await session.commit()
        except Exception:
            pass

