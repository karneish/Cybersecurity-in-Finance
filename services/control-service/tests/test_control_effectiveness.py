"""WS5 control-effectiveness signal math (pure, DB-free)."""

from cybercommon.models import AssetControl, SecurityControl
from app.services.control_service import _config_strength, asset_control_to_dict, INCIDENT_EVENT_TYPES


def _control(maturity_levels: int | None = 3) -> SecurityControl:
    return SecurityControl(
        name=f"Test-{maturity_levels}",
        control_type="TECHNICAL",
        maturity_levels=maturity_levels,
    )


def _ac(coverage: float, maturity: int = 1) -> AssetControl:
    return AssetControl(
        status="IMPLEMENTED",
        coverage_score=coverage,
        effectiveness_score=0.8,
        maturity_level=maturity,
    )


def test_full_coverage_full_maturity_is_capped_at_one():
    assert _config_strength(_ac(1.0, maturity=3), _control(maturity_levels=3)) == 1.0


def test_minus_one_coverage_capped():
    assert _config_strength(_ac(1.5, maturity=3), _control(maturity_levels=3)) == 1.0


def test_half_coverage_half_maturity_is_quarter():
    assert _config_strength(_ac(0.5, maturity=2), _control(maturity_levels=4)) == 0.25


def test_zero_maturity_is_treated_as_unset_level_one():
    assert _config_strength(_ac(0.8, maturity=0), _control(maturity_levels=3)) == round(0.8 / 3, 4)


def test_no_control_falls_back_to_coverage():
    assert _config_strength(_ac(0.6, maturity=1), None) == 0.6


def test_unknown_maturity_levels_uses_ratio_one():
    assert _config_strength(_ac(0.9, maturity=5), _control(maturity_levels=None)) == 0.9


def test_asset_control_to_dict_exposes_config_strength():
    ac = _ac(1.0, maturity=3)
    data = asset_control_to_dict(ac, _control(maturity_levels=3))
    assert data["configStrength"] == 1.0
    assert data["coverageScore"] == 1.0
    assert data["effectivenessScore"] == 0.8


def test_incident_event_types_cover_breach_kinds():
    assert "INCIDENT" in INCIDENT_EVENT_TYPES
    assert "BREACH" in INCIDENT_EVENT_TYPES
    assert "COMPROMISE" in INCIDENT_EVENT_TYPES
    assert "RANSOMWARE" in INCIDENT_EVENT_TYPES