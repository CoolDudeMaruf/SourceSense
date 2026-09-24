"""
SourceSense – Comprehensive AI Services Test Suite

Covers: sensor_trust, forecast, optimizer, classifier,
        history analysis, safety_gate, humidity_correction,
        AQI regressions, and validator edge cases.

Run with:  pytest tests/unit/test_ai_services.py -v
"""
import pytest
from datetime import datetime


# ─── Sensor Trust ─────────────────────────────────────────────────────────────

class TestSensorTrust:
    def setup_method(self):
        """Clear per-node in-memory state before each test."""
        import app.services.ai.sensor_trust as st
        st._trust_context.clear()

    def test_new_node_starts_at_100(self):
        from app.services.ai.sensor_trust import get_sensor_trust
        score = get_sensor_trust(node_id=99, current_pm10=50.0, quality_flags={})
        assert score == 100.0

    def test_clean_reading_recovers_toward_100(self):
        from app.services.ai.sensor_trust import get_sensor_trust
        # Penalise first
        get_sensor_trust(node_id=1, current_pm10=50.0, quality_flags={"pm10": "failed_read"})
        s1 = get_sensor_trust(node_id=1, current_pm10=52.0, quality_flags={})
        s2 = get_sensor_trust(node_id=1, current_pm10=53.0, quality_flags={})
        assert s2 >= s1  # monotonically recovering

    def test_quality_flag_penalizes_score(self):
        from app.services.ai.sensor_trust import get_sensor_trust
        import app.services.ai.sensor_trust as st
        s_clean = get_sensor_trust(node_id=2, current_pm10=50.0, quality_flags={})
        st._trust_context.clear()
        s_flagged = get_sensor_trust(
            node_id=2, current_pm10=50.0,
            quality_flags={"pm10": "failed_read", "humidity": "sensor_glitch"}
        )
        assert s_flagged < s_clean

    def test_large_pm10_jump_penalizes(self):
        from app.services.ai.sensor_trust import get_sensor_trust
        get_sensor_trust(node_id=3, current_pm10=50.0, quality_flags={})
        score = get_sensor_trust(node_id=3, current_pm10=400.0, quality_flags={})
        assert score < 95.0

    def test_score_never_exceeds_100(self):
        from app.services.ai.sensor_trust import get_sensor_trust
        for _ in range(20):
            score = get_sensor_trust(node_id=4, current_pm10=50.0, quality_flags={})
        assert score <= 100.0

    def test_score_never_goes_below_0(self):
        from app.services.ai.sensor_trust import get_sensor_trust
        for i in range(30):
            score = get_sensor_trust(
                node_id=5, current_pm10=float(i * 50),
                quality_flags={"pm10": "failed_read", "humidity": "sensor_glitch", "mq2": "failed_read"}
            )
        assert score >= 0.0

    def test_none_pm10_doesnt_crash(self):
        from app.services.ai.sensor_trust import get_sensor_trust
        score = get_sensor_trust(node_id=6, current_pm10=None, quality_flags={})
        assert 0.0 <= score <= 100.0

    def test_multiple_nodes_isolated(self):
        from app.services.ai.sensor_trust import get_sensor_trust
        s1 = get_sensor_trust(node_id=10, current_pm10=50.0, quality_flags={"pm10": "failed_read"})
        s2 = get_sensor_trust(node_id=11, current_pm10=50.0, quality_flags={})
        assert s2 > s1  # Node 11 untouched


# ─── Forecast ────────────────────────────────────────────────────────────────

class TestForecast:
    def test_forecast_returns_three_values(self):
        from app.services.ai.forecast import generate_forecast
        result = generate_forecast(current_pm10=80.0, pm10_trend=5.0, time_aware_factor=1.0)
        assert "forecast_10m" in result
        assert "forecast_20m" in result
        assert "forecast_30m" in result

    def test_rising_trend_increases_forecast(self):
        from app.services.ai.forecast import generate_forecast
        r_up   = generate_forecast(current_pm10=80.0, pm10_trend=10.0, time_aware_factor=1.0)
        r_flat = generate_forecast(current_pm10=80.0, pm10_trend=0.0,  time_aware_factor=1.0)
        assert r_up["forecast_30m"] >= r_flat["forecast_30m"]

    def test_falling_trend_reduces_forecast(self):
        from app.services.ai.forecast import generate_forecast
        r_down = generate_forecast(current_pm10=80.0, pm10_trend=-10.0, time_aware_factor=1.0)
        r_flat = generate_forecast(current_pm10=80.0, pm10_trend=0.0,   time_aware_factor=1.0)
        assert r_down["forecast_30m"] <= r_flat["forecast_30m"]

    def test_time_factor_amplifies_forecast(self):
        from app.services.ai.forecast import generate_forecast
        r1 = generate_forecast(current_pm10=80.0, pm10_trend=5.0, time_aware_factor=1.0)
        r2 = generate_forecast(current_pm10=80.0, pm10_trend=5.0, time_aware_factor=1.5)
        assert r2["forecast_30m"] >= r1["forecast_30m"]

    def test_forecast_values_are_non_negative(self):
        from app.services.ai.forecast import generate_forecast
        result = generate_forecast(current_pm10=5.0, pm10_trend=-100.0, time_aware_factor=1.0)
        assert result["forecast_10m"] >= 0
        assert result["forecast_20m"] >= 0
        assert result["forecast_30m"] >= 0

    def test_zero_current_pm10(self):
        from app.services.ai.forecast import generate_forecast
        result = generate_forecast(current_pm10=0.0, pm10_trend=0.0, time_aware_factor=1.0)
        assert result["forecast_10m"] >= 0


# ─── Optimizer ────────────────────────────────────────────────────────────────

class TestOptimizer:
    def test_high_pm10_construction_dust_triggers_spray(self):
        from app.services.ai.optimizer import optimize_intervention
        plan = optimize_intervention(
            zone="test_zone", pm10=200.0, forecast_30m=250.0,
            sensor_trust=95.0, classifier_label="construction_dust",
            classifier_confidence=0.95,
        )
        assert plan["action"] == "SPRAY"

    def test_low_pm10_returns_none_action(self):
        from app.services.ai.optimizer import optimize_intervention
        plan = optimize_intervention(
            zone="test_zone", pm10=20.0, forecast_30m=22.0,
            sensor_trust=98.0, classifier_label="construction_dust",
            classifier_confidence=0.99,
        )
        assert plan["action"] == "NONE"

    def test_non_construction_dust_returns_none(self):
        """Optimizer only acts on construction_dust; other labels return NONE."""
        from app.services.ai.optimizer import optimize_intervention
        plan = optimize_intervention(
            zone="test_zone", pm10=180.0, forecast_30m=200.0,
            sensor_trust=90.0, classifier_label="vehicle_combustion",
            classifier_confidence=0.8,
        )
        assert plan["action"] == "NONE"

    def test_spray_plan_includes_resource_estimates(self):
        from app.services.ai.optimizer import optimize_intervention
        plan = optimize_intervention(
            zone="test_zone", pm10=300.0, forecast_30m=350.0,
            sensor_trust=95.0, classifier_label="construction_dust",
            classifier_confidence=0.9,
        )
        if plan["action"] == "SPRAY":
            assert "intensity" in plan
            assert "duration_min" in plan
            assert "estimated_water_l" in plan


# ─── Safety Gate ──────────────────────────────────────────────────────────────

class TestSafetyGate:
    def test_manual_mode_blocks_autonomous(self):
        from app.services.ai.safety import safety_gate
        # A SPRAY decision with high confidence
        opt = {"action": "SPRAY", "intensity": 80, "duration_min": 5, "confidence": 90.0, "reason": "test"}
        result = safety_gate(node_id=1, control_mode="MANUAL", optimizer_decision=opt)
        assert result["relay_action"] == "OFF"

    def test_autonomous_high_confidence_passes_through(self):
        from app.services.ai.safety import safety_gate
        opt = {"action": "SPRAY", "intensity": 80, "duration_min": 5, "confidence": 95.0, "reason": "test"}
        result = safety_gate(node_id=1, control_mode="AUTONOMOUS", optimizer_decision=opt)
        assert result["relay_action"] == "ON"

    def test_simulation_mode_runs_without_crash(self):
        from app.services.ai.safety import safety_gate
        opt = {"action": "SPRAY", "intensity": 80, "duration_min": 5, "confidence": 90.0, "reason": "test"}
        result = safety_gate(node_id=1, control_mode="SIMULATION", optimizer_decision=opt)
        assert "relay_action" in result

    def test_none_action_always_returns_off(self):
        from app.services.ai.safety import safety_gate
        opt = {"action": "NONE", "confidence": 99.0, "reason": "clean air"}
        for mode in ["MANUAL", "SIMULATION", "AUTONOMOUS"]:
            result = safety_gate(node_id=1, control_mode=mode, optimizer_decision=opt)
            assert result["relay_action"] == "OFF", f"Expected OFF for mode {mode}"

    def test_low_confidence_blocked(self):
        from app.services.ai.safety import safety_gate
        opt = {"action": "SPRAY", "intensity": 50, "duration_min": 2, "confidence": 20.0, "reason": "marginal"}
        result = safety_gate(node_id=1, control_mode="AUTONOMOUS", optimizer_decision=opt)
        assert result["relay_action"] == "OFF"


# ─── Classifier ────────────────────────────────────────────────────────────────

class TestClassifier:
    def test_clean_air_returns_valid_label_and_confidence(self):
        from app.services.classifier import classify
        result = classify(
            pm2_5=5.0, pm10=10.0,
            mq2=100, mq4=80, mq6=80, mq7=50, mq8=60, mq131=50, mq135=80,
            humidity=50.0, quality_flags={}
        )
        assert result["label"] in [
            "construction_dust", "vehicle_combustion",
            "waste_burning", "humid_haze", "clean"
        ]
        assert 0.0 <= result["confidence"] <= 1.0

    def test_high_pm_returns_valid_label(self):
        from app.services.classifier import classify
        result = classify(
            pm2_5=150.0, pm10=350.0,
            mq2=120, mq4=100, mq6=100, mq7=80, mq8=90, mq131=70, mq135=110,
            humidity=30.0, quality_flags={}
        )
        assert result is not None and "label" in result

    def test_failed_pm10_doesnt_crash(self):
        from app.services.classifier import classify
        result = classify(
            pm2_5=50.0, pm10=None,
            mq2=120, mq4=100, mq6=100, mq7=80, mq8=90, mq131=70, mq135=110,
            humidity=40.0, quality_flags={"pm10": "failed_read"}
        )
        assert result is not None


# ─── History Analysis ──────────────────────────────────────────────────────────

class TestHistoryAnalysis:
    def test_returns_dict_with_is_recurring(self):
        from app.services.ai.history import analyze_history
        result = analyze_history(zone="zone_a", pm10=100.0, timestamp=datetime.now())
        assert isinstance(result, dict)
        assert "is_recurring" in result

    def test_repeated_readings_dont_crash(self):
        from app.services.ai.history import analyze_history
        ts = datetime.now()
        for _ in range(5):
            result = analyze_history(zone="zone_b", pm10=200.0, timestamp=ts)
        assert isinstance(result["is_recurring"], bool)


# ─── Humidity Correction ───────────────────────────────────────────────────────

class TestHumidityCorrection:
    def test_correction_runs_at_both_rh_extremes(self):
        from app.services.humidity_correction import correct_reading
        low_rh = correct_reading(
            pm2_5_raw=50.0, pm10_raw=100.0, effective_rh=20.0,
            a=1.0, b=0.0, pm10_flagged=False, humidity_flagged=False
        )
        high_rh = correct_reading(
            pm2_5_raw=50.0, pm10_raw=100.0, effective_rh=80.0,
            a=1.0, b=0.0, pm10_flagged=False, humidity_flagged=False
        )
        assert low_rh["pm10_corrected"] is not None
        assert high_rh["pm10_corrected"] is not None

    def test_failed_pm10_does_not_raise(self):
        from app.services.humidity_correction import correct_reading
        result = correct_reading(
            pm2_5_raw=50.0, pm10_raw=None, effective_rh=50.0,
            a=1.0, b=0.0, pm10_flagged=True, humidity_flagged=False
        )
        assert result is not None

    def test_zero_pm_produces_non_negative_corrected(self):
        from app.services.humidity_correction import correct_reading
        result = correct_reading(
            pm2_5_raw=0.0, pm10_raw=0.0, effective_rh=50.0,
            a=1.0, b=0.0, pm10_flagged=False, humidity_flagged=False
        )
        assert result["pm10_corrected"] >= 0.0
        assert result["pm2_5_corrected"] >= 0.0


# ─── AQI Calculator (regressions) ────────────────────────────────────────────

class TestAQIRegressions:
    """Boundary value and driving-pollutant regression tests."""

    def test_pm25_boundary_30_gives_subindex_50(self):
        from app.services.aqi_calculator import calculate_aqi
        result = calculate_aqi(pm2_5=30.0, pm10=None)
        assert result["pm25_subindex"] == 50

    def test_pm10_boundary_50_gives_subindex_50(self):
        from app.services.aqi_calculator import calculate_aqi
        result = calculate_aqi(pm2_5=None, pm10=50.0)
        assert result["pm10_subindex"] == 50

    def test_pm25_drives_aqi_when_subindex_higher(self):
        from app.services.aqi_calculator import calculate_aqi
        result = calculate_aqi(pm2_5=100.0, pm10=50.0)
        assert result["aqi"] == result["pm25_subindex"]

    def test_pm10_drives_aqi_when_subindex_higher(self):
        from app.services.aqi_calculator import calculate_aqi
        result = calculate_aqi(pm2_5=10.0, pm10=400.0)
        assert result["aqi"] == result["pm10_subindex"]

    def test_negative_pm_returns_unavailable(self):
        from app.services.aqi_calculator import calculate_aqi
        result = calculate_aqi(pm2_5=-1.0, pm10=-5.0)
        assert result["aqi"] is None
        assert result["aqi_category"] == "Unavailable"

    def test_response_always_contains_subindex_keys(self):
        from app.services.aqi_calculator import calculate_aqi
        result = calculate_aqi(pm2_5=50.0, pm10=80.0)
        assert "pm25_subindex" in result
        assert "pm10_subindex" in result


# ─── Validator (additional) ────────────────────────────────────────────────────

class TestValidatorAdditional:
    def test_pm10_zero_mid_session_flagged_as_failed_read(self):
        """PM10=0.0 with a non-zero previous PM10 → failed_read (mirrors existing validator tests)."""
        from app.services.validator import validate_reading
        prev_row = {
            "Timestamp": datetime.now(),
            "PM1.0": 15.0, "PM2.5": 25.0, "PM10": 40.0,
            "Humidity_Percent": 55.0,
            "MQ2": 150.0, "MQ4": 120.0, "MQ6": 130.0,
            "MQ7": 90.0, "MQ8": 110.0, "MQ131": 80.0, "MQ135": 140.0,
        }
        row = {
            "Timestamp": datetime.now(),
            "PM1.0": 20.0, "PM2.5": 30.0, "PM10": 0.0,  # zero mid-session
            "Humidity_Percent": 60.0,
            "MQ2": 100.0, "MQ4": 100.0, "MQ6": 100.0,
            "MQ7": 100.0, "MQ8": 100.0, "MQ131": 100.0, "MQ135": 100.0,
        }
        flags = validate_reading(row=row, prev_row=prev_row, node_first_seen=datetime.now())
        assert flags.get("pm10") == "failed_read"

    def test_clean_reading_produces_no_flags(self):
        from app.services.validator import validate_reading
        row = {
            "Timestamp": datetime.now(),
            "PM1.0": 15.0, "PM2.5": 25.0, "PM10": 40.0,
            "Humidity_Percent": 55.0,
            "MQ2": 150.0, "MQ4": 120.0, "MQ6": 130.0,
            "MQ7": 90.0,  "MQ8": 110.0, "MQ131": 80.0, "MQ135": 140.0,
        }
        flags = validate_reading(row=row, prev_row=None, node_first_seen=datetime.now())
        assert len(flags) == 0
