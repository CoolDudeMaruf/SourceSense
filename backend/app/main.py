"""SourceSense – FastAPI application entrypoint."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_all_tables
from app.routers import readings, nodes, events, export, forecast, classifier, ws, external_apis, economics

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s – %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables + pre-load classifier model."""
    logger.info("SourceSense starting up…")
    await create_all_tables()
    # Pre-warm the classifier (trains if no model.pkl exists)
    from app.services.classifier import get_model
    get_model()
    logger.info("Startup complete.")
    yield
    logger.info("SourceSense shutting down.")


app = FastAPI(
    title="SourceSense API",
    description=(
        "IoT Air Quality Monitoring & Pollution Source Detection System.\n\n"
        "Pilot: Mumbai, India. Pipeline: Sense → Understand → Act.\n\n"
        "Sensors: PM1.0/2.5/10, Temperature, Humidity, MQ2/4/6/7/8/131/135.\n"
        "Actions: CPCB AQI calculation, RandomForest source classification, "
        "relay-triggered water-mist suppression."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount routers ─────────────────────────────────────────────────────────────
app.include_router(readings.router)
app.include_router(nodes.router)
app.include_router(events.router)
app.include_router(export.router)
app.include_router(forecast.router)
app.include_router(classifier.router)
app.include_router(economics.router)
app.include_router(ws.router)
app.include_router(external_apis.router)


@app.get("/", tags=["health"])
async def root():
    return {"service": "SourceSense", "version": "1.0.0", "status": "operational"}


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
