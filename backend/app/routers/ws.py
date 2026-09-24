"""SourceSense – WebSocket live feed router."""
import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import AsyncSessionLocal
from app.models.reading import Reading

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])

# Connection manager
class ConnectionManager:
    def __init__(self):
        self._connections: dict[int, list[WebSocket]] = {}

    async def connect(self, ws: WebSocket, node_id: int):
        await ws.accept()
        self._connections.setdefault(node_id, []).append(ws)
        logger.info("WS connected: node %d (total: %d)", node_id, len(self._connections[node_id]))

    def disconnect(self, ws: WebSocket, node_id: int):
        conns = self._connections.get(node_id, [])
        if ws in conns:
            conns.remove(ws)

    async def broadcast(self, node_id: int, data: dict):
        conns = self._connections.get(node_id, [])
        dead = []
        for ws in conns:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            conns.remove(ws)

    async def broadcast_all(self, data: dict):
        for node_id in list(self._connections.keys()):
            await self.broadcast(node_id, data)


manager = ConnectionManager()


@router.websocket("/ws/live/{node_id}")
async def ws_live_feed(ws: WebSocket, node_id: int):
    """
    WebSocket endpoint. On connect, sends the latest reading immediately,
    then streams new readings as they arrive (poll every 3s).
    """
    await manager.connect(ws, node_id)
    try:
        last_id: Optional[int] = None
        while True:
            async with AsyncSessionLocal() as db:
                q = (
                    select(Reading)
                    .where(Reading.node_id == node_id)
                    .order_by(desc(Reading.timestamp))
                    .limit(1)
                )
                result = await db.execute(q)
                reading: Optional[Reading] = result.scalar_one_or_none()

            if reading and reading.id != last_id:
                last_id = reading.id
                payload = {
                    "id": reading.id,
                    "node_id": reading.node_id,
                    "timestamp": reading.timestamp.isoformat(),
                    "pm1_0_raw": reading.pm1_0_raw,
                    "pm2_5_raw": reading.pm2_5_raw,
                    "pm10_raw": reading.pm10_raw,
                    "pm2_5_corrected": reading.pm2_5_corrected,
                    "pm10_corrected": reading.pm10_corrected,
                    "humidity_percent": reading.humidity_percent,
                    "temperature_c": reading.temperature_c,
                    "aqi": reading.aqi,
                    "aqi_category": reading.aqi_category,
                    "classifier_label": reading.classifier_label,
                    "classifier_confidence": reading.classifier_confidence,
                    "relay_state": reading.relay_state,
                    "quality_flags": reading.quality_flags,
                }
                await ws.send_json(payload)

            await asyncio.sleep(3)
    except WebSocketDisconnect:
        manager.disconnect(ws, node_id)
        logger.info("WS disconnected: node %d", node_id)
    except Exception as e:
        logger.error("WS error: %s", e)
        manager.disconnect(ws, node_id)
