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
                    name="00 - Judge View Node",
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
        except Exception:
            pass

