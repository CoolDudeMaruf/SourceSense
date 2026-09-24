"""Unit tests for the relay trigger logic."""
import pytest
from datetime import datetime, timedelta
from app.services.relay_logic import RelayStateManager


def _make_manager():
    return RelayStateManager()


class TestRelayTrigger:
    def test_relay_does_not_fire_on_failed_pm10(self):
        """Relay must NOT fire when PM10 is a failed_read."""
        manager = _make_manager()
        result = manager.evaluate(
            node_id=1,
            classifier_label="construction_dust",
            pm10_corrected=80.0,
            pm10_threshold=50.0,
            relay_delay_min=0,  # instant trigger
            quality_flags={"pm10": "failed_read"},
            reading_timestamp=datetime(2026, 8, 6, 6, 30, 0),
        )
        assert result["relay_state"] is False
        assert result["relay_action"] is None
        assert "failed_read" in result["reason"]

    def test_relay_fires_after_delay(self):
        """Relay turns ON after delay_min minutes of sustained construction_dust."""
        manager = _make_manager()
        base = datetime(2026, 8, 6, 6, 30, 0)

        # First reading above threshold — timer starts
        r1 = manager.evaluate(
            node_id=1,
            classifier_label="construction_dust",
            pm10_corrected=60.0,
            pm10_threshold=50.0,
            relay_delay_min=5,
            quality_flags={},
            reading_timestamp=base,
        )
        assert r1["relay_action"] is None  # timer not yet elapsed
        assert r1["relay_state"] is False

        # After 5 min — should trigger ON
        r2 = manager.evaluate(
            node_id=1,
            classifier_label="construction_dust",
            pm10_corrected=65.0,
            pm10_threshold=50.0,
            relay_delay_min=5,
            quality_flags={},
            reading_timestamp=base + timedelta(minutes=5, seconds=1),
        )
        assert r2["relay_action"] == "ON"
        assert r2["relay_state"] is True

    def test_relay_turns_off_when_pm_drops(self):
        """Relay turns OFF when PM10 drops below threshold."""
        manager = _make_manager()
        base = datetime(2026, 8, 6, 6, 30, 0)

        # Turn relay ON
        manager.evaluate(
            node_id=2, classifier_label="construction_dust",
            pm10_corrected=60.0, pm10_threshold=50.0, relay_delay_min=0,
            quality_flags={}, reading_timestamp=base,
        )
        r_on = manager.evaluate(
            node_id=2, classifier_label="construction_dust",
            pm10_corrected=60.0, pm10_threshold=50.0, relay_delay_min=0,
            quality_flags={}, reading_timestamp=base + timedelta(seconds=1),
        )
        assert r_on["relay_state"] is True

        # PM drops
        r_off = manager.evaluate(
            node_id=2, classifier_label="construction_dust",
            pm10_corrected=30.0, pm10_threshold=50.0, relay_delay_min=0,
            quality_flags={}, reading_timestamp=base + timedelta(minutes=1),
        )
        assert r_off["relay_action"] == "OFF"
        assert r_off["relay_state"] is False

    def test_relay_does_not_fire_on_wrong_label(self):
        """Relay must NOT fire for vehicle_combustion even if PM10 > threshold."""
        manager = _make_manager()
        base = datetime(2026, 8, 6, 6, 30, 0)
        for i in range(3):
            r = manager.evaluate(
                node_id=3,
                classifier_label="vehicle_combustion",
                pm10_corrected=80.0,
                pm10_threshold=50.0,
                relay_delay_min=0,
                quality_flags={},
                reading_timestamp=base + timedelta(minutes=i),
            )
        assert r["relay_state"] is False
        assert r["relay_action"] is None

    def test_relay_timer_resets_if_pm_drops_mid_delay(self):
        """If PM drops during the delay window, timer resets and relay stays OFF."""
        manager = _make_manager()
        base = datetime(2026, 8, 6, 6, 30, 0)

        # Start timer
        manager.evaluate(
            node_id=4, classifier_label="construction_dust",
            pm10_corrected=60.0, pm10_threshold=50.0, relay_delay_min=5,
            quality_flags={}, reading_timestamp=base,
        )
        # PM drops before delay expires
        manager.evaluate(
            node_id=4, classifier_label="construction_dust",
            pm10_corrected=40.0, pm10_threshold=50.0, relay_delay_min=5,
            quality_flags={}, reading_timestamp=base + timedelta(minutes=3),
        )
        # PM rises again — timer should restart from scratch
        r = manager.evaluate(
            node_id=4, classifier_label="construction_dust",
            pm10_corrected=70.0, pm10_threshold=50.0, relay_delay_min=5,
            quality_flags={}, reading_timestamp=base + timedelta(minutes=4),
        )
        assert r["relay_action"] is None  # < 5 min from restart
        assert r["relay_state"] is False

    def test_force_off(self):
        """force_off() immediately resets relay state."""
        manager = _make_manager()
        base = datetime(2026, 8, 6, 6, 30, 0)
        manager.evaluate(
            node_id=5, classifier_label="construction_dust",
            pm10_corrected=60.0, pm10_threshold=50.0, relay_delay_min=0,
            quality_flags={}, reading_timestamp=base,
        )
        manager.evaluate(
            node_id=5, classifier_label="construction_dust",
            pm10_corrected=60.0, pm10_threshold=50.0, relay_delay_min=0,
            quality_flags={}, reading_timestamp=base + timedelta(seconds=1),
        )
        assert manager.get_relay_state(5) is True
        manager.force_off(5)
        assert manager.get_relay_state(5) is False
