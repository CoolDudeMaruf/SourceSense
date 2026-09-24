"""
SourceSense – Relay trigger logic.

Rules:
  ON  : label == "construction_dust"
        AND PM10_corrected > node.pm10_threshold
        AND this condition has persisted for >= relay_delay_min minutes
        AND the triggering reading is NOT flagged as failed_read

  OFF : PM10 drops below threshold (on a clean reading)

State is maintained in-memory per node. On restart, defaults to OFF.
"""
from datetime import datetime, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class RelayStateManager:
    """Per-node relay state tracker."""

    def __init__(self):
        # node_id → {above_threshold_since: datetime | None, relay_on: bool}
        self._states: dict[int, dict] = {}

    def _get_state(self, node_id: int) -> dict:
        if node_id not in self._states:
            self._states[node_id] = {
                "above_threshold_since": None,
                "relay_on": False,
            }
        return self._states[node_id]

    def evaluate(
        self,
        node_id: int,
        classifier_label: str,
        pm10_corrected: Optional[float],
        pm10_threshold: float,
        relay_delay_min: int,
        quality_flags: dict,
        reading_timestamp: Optional[datetime] = None,
    ) -> dict:
        """
        Evaluate whether to trigger relay ON or OFF.

        Parameters
        ----------
        quality_flags : dict  – if pm10 == "failed_read", skip entirely.

        Returns
        -------
        dict: relay_state (bool), relay_action ("ON"|"OFF"|None), reason (str)
        """
        state = self._get_state(node_id)
        now = reading_timestamp or datetime.utcnow()

        # ── Never trigger on failed/flagged PM10 readings ──────────────────────
        if quality_flags.get("pm10") == "failed_read":
            logger.debug("Node %d: relay evaluation skipped — pm10 failed_read", node_id)
            return {
                "relay_state": state["relay_on"],
                "relay_action": None,
                "reason": "skipped: pm10 failed_read",
            }

        pm10_above = (
            pm10_corrected is not None
            and pm10_corrected > pm10_threshold
            and classifier_label == "construction_dust"
        )

        if pm10_above:
            if state["above_threshold_since"] is None:
                state["above_threshold_since"] = now
                logger.info("Node %d: PM10 above threshold — timer started", node_id)

            elapsed = (now - state["above_threshold_since"]).total_seconds() / 60.0
            if elapsed >= relay_delay_min and not state["relay_on"]:
                state["relay_on"] = True
                return {
                    "relay_state": True,
                    "relay_action": "ON",
                    "reason": (
                        f"construction_dust detected, PM10={pm10_corrected:.1f} > "
                        f"{pm10_threshold} for {elapsed:.1f} min"
                    ),
                }
        else:
            # Conditions not met → reset timer
            if state["above_threshold_since"] is not None:
                logger.info("Node %d: PM10 dropped below threshold — resetting timer", node_id)
            state["above_threshold_since"] = None

            if state["relay_on"]:
                state["relay_on"] = False
                return {
                    "relay_state": False,
                    "relay_action": "OFF",
                    "reason": f"PM10={pm10_corrected} below threshold or label changed",
                }

        return {
            "relay_state": state["relay_on"],
            "relay_action": None,
            "reason": "no state change",
        }

    def force_off(self, node_id: int):
        """Force relay to OFF (e.g. manual override)."""
        state = self._get_state(node_id)
        state["relay_on"] = False
        state["above_threshold_since"] = None

    def get_relay_state(self, node_id: int) -> bool:
        return self._get_state(node_id)["relay_on"]


# Singleton instance shared across the app lifetime
relay_manager = RelayStateManager()
