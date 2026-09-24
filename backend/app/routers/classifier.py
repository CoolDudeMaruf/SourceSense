"""SourceSense – Classifier retrain router."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.services.classifier import retrain

router = APIRouter(prefix="/api/v1/classifier", tags=["classifier"])


class LabelledRow(BaseModel):
    pm2_5: Optional[float] = None
    pm10: Optional[float] = None
    humidity_percent: float
    mq2: float
    mq4: float
    mq6: float
    mq7: float
    mq8: float
    mq131: float
    mq135: float
    label: str  # one of the 5 class labels


class RetrainRequest(BaseModel):
    labelled_data: list[LabelledRow]


@router.post("/retrain")
async def retrain_classifier(payload: RetrainRequest, db: AsyncSession = Depends(get_db)):
    """
    Retrain the RandomForest classifier with real labelled data.
    Mixes provided data with synthetic training data (300 samples/class).
    """
    data = [row.model_dump() for row in payload.labelled_data]
    result = retrain(data)
    return {"status": "retrained", **result}
