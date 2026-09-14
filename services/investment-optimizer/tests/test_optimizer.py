"""Unit tests for the OR-Tools investment optimizer's pure math helpers.

The DB-backed collection methods are intentionally not exercised here (they
need a live Postgres); these tests pin down the financial math that everything
else is built on.
"""

from types import SimpleNamespace

from app.core.optimizer import InvestmentOptimizer, cvss_to_probability

OPTIMIZER = InvestmentOptimizer(db=None)  # db is only used by DB-backed methods


def test_cvss_to_probability_matches_risk_engine():
    assert cvss_to_probability(10.0) == 0.95
    assert abs(cvss_to_probability(7.5) - 0.60) < 1e-9


def test_control_reduction_independence():
    controls = [
        {"control_type": "MFA", "status": "ACTIVE", "coverage_score": 1.0, "effectiveness_score": 1.0},
        {"control_type": "EDR", "status": "ACTIVE", "coverage_score": 1.0, "effectiveness_score": 1.0},
    ]
    assert abs(OPTIMIZER._control_reduction(controls) - (1 - 0.75 * 0.80)) < 1e-9


def test_control_reduction_ignores_inactive():
    controls = [{"control_type": "MFA", "status": "PLANNED", "coverage_score": 1.0, "effectiveness_score": 1.0}]
    assert OPTIMIZER._control_reduction(controls) == 0.0


def test_eal_defaults_to_zero_without_vulns():
    asset = SimpleNamespace(
        internet_exposed=False,
        criticality_score=80,
        data_sensitivity="CONFIDENTIAL",
        business_value_inr=10_000_000,
    )
    assert OPTIMIZER._eal(controls=[], vulns=[], asset=asset) == 0.0


def test_eal_single_vuln():
    asset = SimpleNamespace(
        internet_exposed=False,
        criticality_score=80,
        data_sensitivity="CONFIDENTIAL",
        business_value_inr=10_000_000,
    )
    vulns = [{"cvss_score": 9.0, "internet_exposed": False}]
    # prob 0.85 * (1 - 0) * (10M * 0.75 * 1.2) = 0.85 * 9M
    assert abs(OPTIMIZER._eal(controls=[], vulns=vulns, asset=asset) - 7_650_000) < 1.0


def test_delta_for_type_is_nonnegative_and_reduces_eal():
    contexts = [{
        "base_eal": 7_650_000,
        "internet_exposed": False,
        "criticality_score": 80,
        "data_sensitivity": "CONFIDENTIAL",
        "business_value_inr": 10_000_000,
        "controls": [],
        "vulns": [{"cvss_score": 9.0, "internet_exposed": False}],
    }]
    delta = OPTIMIZER._delta_for_type("MFA", contexts)
    assert delta > 0
    # MFA at coverage .9 × effectiveness .8 → weight 0.25 → reduction 18%
    assert abs(delta - 7_650_000 * 0.18) < 10.0


def test_rosi_math():
    control = {"implementation_cost": 500_000, "annual_maintenance": 0, "eal_reduction": 2_000_000}
    assert abs(OPTIMIZER._rosi(control, 1) - 300.0) < 1e-9


def test_portfolio_rosi_zero_cost():
    assert OPTIMIZER._portfolio_rosi(0, 0, 3) == 0.0


def test_safe_div():
    assert OPTIMIZER._safe_div(10, 4) == 2.5
    assert OPTIMIZER._safe_div(10, 0) == 0.0