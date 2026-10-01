"""SourceSense – Node management router."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime, timezone

from app.database import get_db
from app.models.node import Node
from app.schemas.node import NodeCreate, NodeUpdate, NodeOut

router = APIRouter(prefix="/api/v1/nodes", tags=["nodes"])

@router.get("/dashboard/maintenance")
async def get_maintenance_dashboard(db: AsyncSession = Depends(get_db)):
    """
    Predictive maintenance dashboard endpoint.
    Flags sensors that require physical cleaning or battery replacement.
    """
    q = select(Node).where(Node.is_active == True)
    result = await db.execute(q)
    nodes = result.scalars().all()
    
    maintenance_alerts = []
    for node in nodes:
        alerts = []
        if node.battery_level is not None and node.battery_level < 20.0:
            alerts.append(f"Low battery: {node.battery_level}%")
        if node.power_consumption_w is not None and node.power_consumption_w > 5.0:
            alerts.append(f"High power consumption: {node.power_consumption_w}W")
            
        now = datetime.now(timezone.utc)
        if node.last_cleaning_date:
            days_since_clean = (now - node.last_cleaning_date).days
            if days_since_clean > 30:
                alerts.append(f"Sensor cleaning overdue ({days_since_clean} days)")
        else:
            alerts.append("Sensor has never been cleaned")
            
        if node.last_battery_replacement:
            days_since_replace = (now - node.last_battery_replacement).days
            if days_since_replace > 365:
                alerts.append(f"Battery replacement recommended ({days_since_replace} days)")
                
        if alerts:
            maintenance_alerts.append({
                "node_id": node.id,
                "node_name": node.name,
                "location": f"{node.location_lat}, {node.location_lon}",
                "alerts": alerts
            })
            
    return {"status": "ok", "maintenance_alerts": maintenance_alerts}


@router.post("", response_model=NodeOut, status_code=201)
async def create_node(payload: NodeCreate, db: AsyncSession = Depends(get_db)):
    node = Node(**payload.model_dump())
    db.add(node)
    await db.commit()
    await db.refresh(node)
    return node


@router.get("", response_model=list[NodeOut])
async def list_nodes(
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db)
):
    q = select(Node).order_by(Node.name)
    if active_only:
        q = q.where(Node.is_active == True)  # noqa: E712
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{node_id}", response_model=NodeOut)
async def get_node(node_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node


@router.patch("/{node_id}", response_model=NodeOut)
async def update_node(node_id: int, payload: NodeUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(node, field, value)
    await db.commit()
    await db.refresh(node)
    return node


@router.delete("/{node_id}", status_code=204)
async def deactivate_node(node_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    node.is_active = False
    await db.commit()
