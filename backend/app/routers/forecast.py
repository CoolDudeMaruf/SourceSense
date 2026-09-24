"""SourceSense – PM forecast router (ARIMA with insufficient-data guard)."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, asc

from app.database import get_db
from app.models.reading import Reading

router = APIRouter(prefix="/api/v1/forecast", tags=["forecast"])

MIN_ROWS_FOR_ARIMA = 50


@router.get("/{node_id}")
async def forecast_pm(
    node_id: int,
    steps: int = Query(6, ge=1, le=12, description="Number of 10-minute steps to forecast"),
    db: AsyncSession = Depends(get_db),
):
    """
    Forecast PM10 for the next `steps` intervals using ARIMA.
    Returns a 'insufficient_data' message if fewer than 50 clean readings exist.
    """
    q = (
        select(Reading)
        .where(
            Reading.node_id == node_id,
            Reading.pm10_corrected.is_not(None),
        )
        .order_by(asc(Reading.timestamp))
    )
    result = await db.execute(q)
    readings = result.scalars().all()

    if len(readings) < MIN_ROWS_FOR_ARIMA:
        return {
            "status": "insufficient_data",
            "message": (
                f"ARIMA requires at least {MIN_ROWS_FOR_ARIMA} clean PM10 readings. "
                f"Currently have {len(readings)}. Collect more data and try again."
            ),
            "available_readings": len(readings),
            "required_readings": MIN_ROWS_FOR_ARIMA,
        }

    try:
        import numpy as np
        from statsmodels.tsa.arima.model import ARIMA

        pm10_series = [r.pm10_corrected for r in readings]
        model = ARIMA(pm10_series, order=(2, 1, 2))
        fit = model.fit()
        forecast = fit.forecast(steps=steps)
        forecast_values = [round(max(0.0, float(v)), 2) for v in forecast]

        return {
            "status": "ok",
            "node_id": node_id,
            "steps": steps,
            "interval_minutes": 10,
            "forecast_pm10": forecast_values,
            "based_on_n_readings": len(readings),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast failed: {e}")
