"""
SourceSense – ML training module.

Generates synthetic labelled training data based on known pollution source
signatures observed in Indian urban environments (Mumbai pilot context).

Source signature characteristics used:
  construction_dust  : high PM10 (50–250), high PM10/PM2.5 ratio (4–10),
                       moderate MQ2/MQ4, low MQ7 (CO)
  vehicle_combustion : moderate PM2.5 (20–80), ratio 2–4, very high MQ7 (CO),
                       elevated MQ2
  waste_burning      : high MQ2+MQ135 (smoke+VOC), mixed PM, moderate ratio
  humid_haze         : high humidity (85–100%), elevated fine PM (10–40),
                       ratio near 1, low gas activity
  clean              : low PM (<10), low all gas sensors
"""
import logging
from pathlib import Path
from typing import Optional

import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

logger = logging.getLogger(__name__)

LABELS = [
    "construction_dust",
    "vehicle_combustion",
    "waste_burning",
    "humid_haze",
    "clean",
]

RNG = np.random.default_rng(42)


def _generate_synthetic_data(n_per_class: int = 400) -> tuple[np.ndarray, np.ndarray]:
    """
    Generate synthetic training samples for each pollution source class.

    Feature order: [pm10_pm25_ratio, pm2_5, pm10, MQ2, MQ4, MQ6, MQ7, MQ8, MQ131, MQ135, humidity]
    """
    X, y = [], []

    def add(samples, label):
        X.extend(samples)
        y.extend([label] * len(samples))

    n = n_per_class

    # ── construction_dust ─────────────────────────────────────────────────────
    pm2_5 = RNG.uniform(5, 30, n)
    pm10 = RNG.uniform(50, 250, n)
    ratio = pm10 / np.maximum(pm2_5, 1)
    add(np.column_stack([
        ratio, pm2_5, pm10,
        RNG.uniform(150, 300, n),   # MQ2
        RNG.uniform(120, 250, n),   # MQ4
        RNG.uniform(100, 200, n),   # MQ6
        RNG.uniform(80,  150, n),   # MQ7 — low CO
        RNG.uniform(100, 200, n),   # MQ8
        RNG.uniform(60,  120, n),   # MQ131
        RNG.uniform(120, 220, n),   # MQ135
        RNG.uniform(40,  75, n),    # humidity
    ]), "construction_dust")

    # ── vehicle_combustion ────────────────────────────────────────────────────
    pm2_5 = RNG.uniform(20, 80, n)
    pm10 = pm2_5 * RNG.uniform(2, 4, n)
    ratio = pm10 / pm2_5
    add(np.column_stack([
        ratio, pm2_5, pm10,
        RNG.uniform(300, 600, n),   # MQ2 — high smoke
        RNG.uniform(100, 200, n),   # MQ4
        RNG.uniform(80,  160, n),   # MQ6
        RNG.uniform(400, 800, n),   # MQ7 — very high CO
        RNG.uniform(150, 300, n),   # MQ8
        RNG.uniform(80,  150, n),   # MQ131 — NOx elevated
        RNG.uniform(200, 400, n),   # MQ135
        RNG.uniform(30,  70, n),    # humidity
    ]), "vehicle_combustion")

    # ── waste_burning ─────────────────────────────────────────────────────────
    pm2_5 = RNG.uniform(30, 120, n)
    pm10 = pm2_5 * RNG.uniform(1.5, 3, n)
    ratio = pm10 / pm2_5
    add(np.column_stack([
        ratio, pm2_5, pm10,
        RNG.uniform(400, 700, n),   # MQ2 — very high
        RNG.uniform(200, 400, n),   # MQ4
        RNG.uniform(150, 300, n),   # MQ6
        RNG.uniform(200, 500, n),   # MQ7
        RNG.uniform(200, 400, n),   # MQ8
        RNG.uniform(100, 200, n),   # MQ131
        RNG.uniform(350, 600, n),   # MQ135 — high VOC
        RNG.uniform(30,  65, n),    # humidity
    ]), "waste_burning")

    # ── humid_haze ────────────────────────────────────────────────────────────
    pm2_5 = RNG.uniform(10, 40, n)
    pm10 = pm2_5 * RNG.uniform(1.0, 1.8, n)
    ratio = pm10 / pm2_5
    add(np.column_stack([
        ratio, pm2_5, pm10,
        RNG.uniform(80,  150, n),   # MQ2 — low
        RNG.uniform(70,  130, n),   # MQ4
        RNG.uniform(60,  110, n),   # MQ6
        RNG.uniform(60,  120, n),   # MQ7
        RNG.uniform(70,  130, n),   # MQ8
        RNG.uniform(50,  100, n),   # MQ131
        RNG.uniform(80,  160, n),   # MQ135
        RNG.uniform(80,  100, n),   # humidity — high
    ]), "humid_haze")

    # ── clean ─────────────────────────────────────────────────────────────────
    pm2_5 = RNG.uniform(0, 10, n)
    pm10 = pm2_5 * RNG.uniform(1.0, 2.0, n)
    ratio = np.where(pm2_5 > 0, pm10 / pm2_5, -1)
    add(np.column_stack([
        ratio, pm2_5, pm10,
        RNG.uniform(50,  120, n),   # MQ2
        RNG.uniform(50,  110, n),   # MQ4
        RNG.uniform(40,  100, n),   # MQ6
        RNG.uniform(40,  100, n),   # MQ7
        RNG.uniform(50,  110, n),   # MQ8
        RNG.uniform(40,   90, n),   # MQ131
        RNG.uniform(50,  110, n),   # MQ135
        RNG.uniform(30,   80, n),   # humidity
    ]), "clean")

    return np.array(X, dtype=np.float32), np.array(y)


def train_and_save(model_path: Path) -> RandomForestClassifier:
    """Train classifier on synthetic data and persist to disk."""
    X, y = _generate_synthetic_data(n_per_class=600)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced",
    )
    clf.fit(X_train, y_train)
    acc = accuracy_score(y_test, clf.predict(X_test))
    logger.info("Classifier trained. Test accuracy: %.3f", acc)

    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(clf, model_path)
    logger.info("Model saved to %s", model_path)
    return clf


def train_with_real_data(labelled_data: list[dict], model_path: Path) -> dict:
    """
    Retrain model using a mix of synthetic + real labelled data.

    Each dict in labelled_data must have the sensor fields + "label" key.
    """
    X_synth, y_synth = _generate_synthetic_data(n_per_class=300)

    X_real, y_real = [], []
    for row in labelled_data:
        pm2_5 = row.get("pm2_5", 0) or 0
        pm10 = row.get("pm10", 0) or 0
        ratio = (pm10 / pm2_5) if pm2_5 > 0 else -1.0
        X_real.append([
            ratio, pm2_5, pm10,
            row.get("mq2", 0), row.get("mq4", 0), row.get("mq6", 0),
            row.get("mq7", 0), row.get("mq8", 0), row.get("mq131", 0),
            row.get("mq135", 0), row.get("humidity_percent", 60),
        ])
        y_real.append(row["label"])

    X_combined = np.vstack([X_synth, np.array(X_real, dtype=np.float32)])
    y_combined = np.concatenate([y_synth, np.array(y_real)])

    X_train, X_test, y_train, y_test = train_test_split(
        X_combined, y_combined, test_size=0.2, random_state=42, stratify=y_combined
    )
    clf = RandomForestClassifier(n_estimators=200, max_depth=15, random_state=42, n_jobs=-1)
    clf.fit(X_train, y_train)
    acc = accuracy_score(y_test, clf.predict(X_test))
    joblib.dump(clf, model_path)

    return {"accuracy": round(acc, 4), "n_real_samples": len(X_real), "model_path": str(model_path)}
