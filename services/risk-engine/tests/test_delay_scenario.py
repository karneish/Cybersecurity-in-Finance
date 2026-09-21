"""WS6 delay-remediation scenario tests (pure state builder, DB-free)."""

from app.core.scenario_engine import ScenarioSimulator


def _sim():
    return ScenarioSimulator.__new__(ScenarioSimulator)


def test_delay_one_year_is_clamped_at_plus_forty_percent():
    state = _sim()._build_simulated_state([{"type": "delay_remediation", "days": 365}])
    assert len(state["delays"]) == 1
    assert state["delays"][0]["escalation"] == 1.4


def test_delay_beyond_one_year_stays_clamped():
    state = _sim()._build_simulated_state([{"type": "delay_remediation", "days": 2000}])
    assert state["delays"][0]["escalation"] == 1.4


def test_zero_day_delay_has_no_escalation():
    state = _sim()._build_simulated_state([{"type": "delay_remediation", "days": 0}])
    assert state["delays"][0]["escalation"] == 1.0


def test_partial_year_delay_scales_linearly():
    state = _sim()._build_simulated_state([{"type": "delay_remediation", "days": 90}])
    assert round(state["delays"][0]["escalation"], 4) == round(1 + 90 / 365 * 0.4, 4)


def test_delay_can_be_scoped_to_asset_and_vulns():
    state = _sim()._build_simulated_state([
        {"type": "delay_remediation", "days": 30, "asset_id": "asset-1", "vuln_ids": ["v-1", "v-2"]}
    ])
    assert state["delays"][0]["asset_id"] == "asset-1"
    assert state["delays"][0]["vuln_ids"] == ["v-1", "v-2"]


def test_delay_mixed_with_other_change_types():
    state = _sim()._build_simulated_state([
        {"type": "remediate_vuln", "vuln_id": "v-9"},
        {"type": "delay_remediation", "days": 60},
    ])
    assert "v-9" in state["removed_vulns"]
    assert len(state["delays"]) == 1
    assert state["delays"][0]["days"] == 60