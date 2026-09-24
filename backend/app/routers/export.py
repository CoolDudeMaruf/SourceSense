"""SourceSense – CSV export router."""
import csv
import io
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, asc
from datetime import date

from app.database import get_db
from app.models.reading import Reading

router = APIRouter(prefix="/api/v1/export", tags=["export"])

CSV_HEADERS = [
    "Timestamp", "Temperature_C", "Humidity_Percent",
    "PM1.0", "PM2.5", "PM10",
    "MQ2", "MQ4", "MQ6", "MQ7", "MQ8", "MQ131", "MQ135",
    "PM2.5_corrected", "PM10_corrected",
    "AQI", "AQI_category",
    "classifier_label", "classifier_confidence",
    "relay_state", "quality_flags",
]


@router.get("/csv")
async def export_csv(
    node_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Export readings as CSV matching the original hardware schema + derived columns.
    quality_flags is serialised as a JSON string in the last column.
    """
    q = select(Reading).order_by(asc(Reading.timestamp))
    if node_id:
        q = q.where(Reading.node_id == node_id)
    if date_from:
        q = q.where(Reading.timestamp >= date_from)
    if date_to:
        q = q.where(Reading.timestamp <= date_to)

    result = await db.execute(q)
    readings = result.scalars().all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(CSV_HEADERS)

    for r in readings:
        writer.writerow([
            r.timestamp, r.temperature_c, r.humidity_percent,
            r.pm1_0_raw, r.pm2_5_raw, r.pm10_raw,
            r.mq2, r.mq4, r.mq6, r.mq7, r.mq8, r.mq131, r.mq135,
            r.pm2_5_corrected, r.pm10_corrected,
            r.aqi, r.aqi_category,
            r.classifier_label, r.classifier_confidence,
            r.relay_state,
            str(r.quality_flags),
        ])

    buf.seek(0)
    filename = f"sourcesense_export_node{node_id or 'all'}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
