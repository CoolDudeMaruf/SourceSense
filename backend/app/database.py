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
