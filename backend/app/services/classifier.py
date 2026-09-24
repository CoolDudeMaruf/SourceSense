"""
SourceSense – Source Classifier Service.

Uses a RandomForestClassifier (scikit-learn) trained on synthetic data
seeded with known pollution source signatures.

Labels:
  construction_dust  – coarse mineral particles, high PM10/PM2.5 ratio
  vehicle_combustion – elevated MQ7 (CO), MQ2 (LPG/smoke), fine PM
  waste_burning      – MQ2+MQ135 elevated, mixed PM
  humid_haze         – high humidity, moderate fine PM, low gas activity
  clean              – low PM, low gas activity

Feature vector (9 features):
  [pm10_pm25_ratio, pm2_5, pm10, MQ2, MQ4, MQ6, MQ7, MQ8, MQ131, MQ135, humidity]
"""
import os
import logging
from pathlib import Path
from typing import Optional

import numpy as np
import joblib

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parent.parent / "ml" / "model.pkl"

LABELS = [
    "construction_dust",
    "vehicle_combustion",
    "waste_burning",
    "humid_haze",
    "clean",
]

# Sentinel value used when PM2.5=0 (ratio undefined)
RATIO_UNDEFINED_SENTINEL = -1.0


def _build_feature_vector(
    pm2_5: Optional[float],
    pm10: Optional[float],
    mq2: float,
    mq4: float,
    mq6: float,
    mq7: float,
    mq8: float,
    mq131: float,
    mq135: float,
    humidity: float,
) -> np.ndarray:
    """
    Construct the 11-element feature vector.
    Handles the case where PM2.5 = 0 (ratio undefined → sentinel -1).
    Failed MQ reads should be substituted with 0 before calling this.
    """
    pm2_5 = pm2_5 or 0.0
    pm10 = pm10 or 0.0

    if pm2_5 > 0:
        ratio = pm10 / pm2_5
    else:
        ratio = RATIO_UNDEFINED_SENTINEL

    return np.array([
        ratio, pm2_5, pm10,
        mq2, mq4, mq6, mq7, mq8, mq131, mq135,
        humidity,
    ], dtype=np.float32)


def load_or_train_model():
    """Load persisted model or train a new one from synthetic data."""
    if MODEL_PATH.exists():
        try:
            model = joblib.load(MODEL_PATH)
            logger.info("Classifier loaded from %s", MODEL_PATH)
            return model
        except Exception as e:
            logger.warning("Could not load model (%s), retraining…", e)

    logger.info("Training classifier from synthetic data…")
    from app.ml.train_classifier import train_and_save
    model = train_and_save(MODEL_PATH)
    return model


_model = None


def get_model():
    global _model
    if _model is None:
        _model = load_or_train_model()
    return _model


def classify(
    pm2_5: Optional[float],
    pm10: Optional[float],
    mq2: float,
    mq4: float,
    mq6: float,
    mq7: float,
    mq8: float,
    mq131: float,
    mq135: float,
    humidity: float,
    quality_flags: dict,
) -> dict:
    """
    Classify a sensor reading. Substitutes 0 for failed MQ channels.

    Returns
    -------
    dict: label, confidence, feature_used_pm_ratio (bool)
    """
    # Substitute failed MQ reads with 0 so model still runs
    mq_vals = {
        "mq2": mq2 if quality_flags.get("mq2") != "failed_read" else 0.0,
        "mq4": mq4 if quality_flags.get("mq4") != "failed_read" else 0.0,
        "mq6": mq6 if quality_flags.get("mq6") != "failed_read" else 0.0,
        "mq7": mq7 if quality_flags.get("mq7") != "failed_read" else 0.0,
        "mq8": mq8 if quality_flags.get("mq8") != "failed_read" else 0.0,
        "mq131": mq131 if quality_flags.get("mq131") != "failed_read" else 0.0,
        "mq135": mq135 if quality_flags.get("mq135") != "failed_read" else 0.0,
    }

    # If PM10 is a failed read, use None so ratio uses sentinel
    pm10_use = None if quality_flags.get("pm10") == "failed_read" else pm10

    features = _build_feature_vector(
        pm2_5=pm2_5, pm10=pm10_use, humidity=humidity, **mq_vals
    )

    model = get_model()
    proba = model.predict_proba([features])[0]
    label_idx = int(np.argmax(proba))
    label = model.classes_[label_idx]
    confidence = round(float(proba[label_idx]), 4)

    return {
        "label": label,
        "confidence": confidence,
        "pm_ratio_used": features[0] != RATIO_UNDEFINED_SENTINEL,
        "all_probabilities": {
            cls: round(float(p), 4)
            for cls, p in zip(model.classes_, proba)
        },
    }


def retrain(labelled_data: list[dict]) -> dict:
    """
    Retrain the model with real labelled data.

    Parameters
    ----------
    labelled_data : list of dicts, each with sensor fields + "label" key

    Returns
    -------
    dict with training accuracy and model path
    """
    from app.ml.train_classifier import train_with_real_data
    global _model
    result = train_with_real_data(labelled_data, MODEL_PATH)
    _model = None  # force reload
    return result
