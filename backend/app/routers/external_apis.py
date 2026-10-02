from fastapi import APIRouter
from datetime import datetime

router = APIRouter(prefix="/api/v1/external", tags=["external_apis"])

external_data = {
    "water_cannon": [],
    "traffic_control": [],
    "fire_control": [],
    "industry_control": []
}

@router.post("/{system_name}")
async def receive_external_data(system_name: str, payload: dict):
    if system_name in external_data:
        payload["received_at"] = datetime.utcnow().isoformat()
        external_data[system_name].insert(0, payload)
        external_data[system_name] = external_data[system_name][:50]
    return {"status": "received"}

@router.get("/logs")
async def get_external_logs():
    return external_data
