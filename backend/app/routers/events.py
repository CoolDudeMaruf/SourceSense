"""SourceSense – Events router."""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_

from app.database import get_db
from app.models.event import Event
from app.schemas.event import EventOut

router = APIRouter(prefix="/api/v1/events", tags=["events"])


@router.get("", response_model=list[EventOut])
async def list_events(
    node_id: Optional[int] = Query(None),
    relay_action: Optional[str] = Query(None, description="ON or OFF"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if node_id:
        filters.append(Event.node_id == node_id)
    if relay_action:
        filters.append(Event.relay_action == relay_action.upper())
    if date_from:
        filters.append(Event.timestamp >= date_from)
    if date_to:
        filters.append(Event.timestamp <= date_to)

    q = (
        select(Event)
        .where(and_(*filters))
        .order_by(desc(Event.timestamp))
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(q)
    return result.scalars().all()
