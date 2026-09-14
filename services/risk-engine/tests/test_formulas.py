"""Unit tests for the single source of truth of the risk math — app/core/formulas.py."""

from app.core.formulas import (
    calculate_control_reduction,
    calculate_financial_impact,
    calculate_impact_components,
    calculate_probability,
    calculate_risk_score,
    cvss_to_probability,
    get_criticality_category,
    get_criticality_multiplier,
    get_risk_category,
    get_sensitivity_multiplier,
)


def test_cvss_to_probability_band_anchors():
    assert cvss_to_probability(10.0) == 0.95
    assert cvss_to_probability(7.0) == 0.50
    assert cvss_to_probability(5.0) == 0.15
    assert cvss_to_probability(1.0) == 0.005


def test_cvss_to_probability_interpolates():
    assert abs(cvss_to_probability(7.5) - 0.60) < 1e-9
    assert abs(cvss_to_probability(8.5) - 0.775) < 1e-9


def test_cvss_to_probability_out_of_range_falls_back():
    assert cvss_to_probability(11.0) == 0.5


def test_criticality_category_boundaries():
    assert get_criticality_category(95) == "CRITICAL"
    assert get_criticality_category(70) == "HIGH"
    assert get_criticality_category(40) == "MEDIUM"
    assert get_criticality_category(10) == "LOW"


def test_multipliers():
    assert get_criticality_multiplier(95) == 1.0
    assert get_criticality_multiplier(75) == 0.75
    assert get_criticality_multiplier(50) == 0.5
    assert get_criticality_multiplier(20) == 0.25
    assert get_sensitivity_multiplier("restricted") == 1.5
    assert get_sensitivity_multiplier("CONFIDENTIAL") == 1.2
    assert get_sensitivity_multiplier("PUBLIC") == 0.5
    assert get_sensitivity_multiplier("UNKNOWN") == 1.0


def test_control_reduction_empty_and_inactive():
    assert calculate_control_reduction([]) == 0.0
    controls = [{"status": "PLANNED", "control_type": "MFA", "coverage_score": 1.0, "effectiveness_score": 1.0}]
    assert calculate_control_reduction(controls) == 0.0


def test_control_reduction_independence_model():
    mfa = {"status": "ACTIVE", "control_type": "MFA", "coverage_score": 1.0, "effectiveness_score": 1.0}
    assert abs(calculate_control_reduction([mfa]) - 0.25) < 1e-9

    edr = {"status": "ACTIVE", "control_type": "EDR", "coverage_score": 1.0, "effectiveness_score": 1.0}
    combined = calculate_control_reduction([mfa, edr])
    assert abs(combined - (1 - 0.75 * 0.80)) < 1e-9


def test_control_reduction_partial_coverage_scales():
    ctrl = {"status": "ACTIVE", "control_type": "MFA", "coverage_score": 0.5, "effectiveness_score": 1.0}
    assert abs(calculate_control_reduction([ctrl]) - 0.125) < 1e-9


def test_calculate_probability():
    vuln = {"cvss_score": 9.0, "internet_exposed": False}
    asset = {"internet_exposed": False}
    assert calculate_probability(vuln, asset, 0.0) == 0.85


def test_calculate_probability_exposure_capped():
    vuln = {"cvss_score": 9.0, "internet_exposed": True}
    asset = {"internet_exposed": True}
    assert calculate_probability(vuln, asset, 0.0) == 0.99


def test_calculate_probability_control_reduction():
    vuln = {"cvss_score": 9.0, "internet_exposed": True}
    asset = {"internet_exposed": True}
    assert abs(calculate_probability(vuln, asset, 0.25) - 0.7425) < 1e-9


def test_calculate_financial_impact():
    asset = {
        "business_value_inr": 10_000_000,
        "criticality_score": 95,
        "data_sensitivity": "RESTRICTED",
    }
    assert calculate_financial_impact(asset) == 15_000_000


def test_impact_components_sum_to_total():
    asset = {
        "business_value_inr": 10_000_000,
        "criticality_score": 95,
        "data_sensitivity": "RESTRICTED",
        "asset_type": "SERVER",
        "annual_revenue_impact": 0,
    }
    parts = calculate_impact_components(asset)
    total = parts["total_inr"]
    component_sum = sum(parts[k] for k in ("downtime_inr", "breach_inr", "regulatory_inr", "reputational_inr"))
    assert total == 15_000_000
    assert abs(component_sum - total) < 0.1


def test_impact_components_nonzero_asset():
    asset = {"business_value_inr": 0, "criticality_score": 10}
    parts = calculate_impact_components(asset)
    assert parts["total_inr"] == 0.0
    assert all(parts[k] == 0.0 for k in ("downtime_inr", "breach_inr", "regulatory_inr", "reputational_inr"))


def test_risk_score_composition():
    asset = {
        "internet_exposed": True,
        "data_sensitivity": "CONFIDENTIAL",
        "criticality_score": 85,
    }
    score = calculate_risk_score(0.5, 50_000_000, asset, 100_000_000)
    # exposure = 50 (internet) + 30 (confidential) + 20 (criticality>=80) = 100
    # risk = 0.5*40 + 50*0.35 + 100*0.25 = 20 + 17.5 + 25 = 62.5
    assert abs(score - 62.5) < 1e-9


def test_risk_category_bands():
    assert get_risk_category(80) == "CRITICAL"
    assert get_risk_category(57.5) == "HIGH"
    assert get_risk_category(30) == "MEDIUM"
    assert get_risk_category(10) == "LOW"