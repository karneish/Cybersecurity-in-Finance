"""WS8 alert-engine tests (pure matching logic, DB-free)."""

import uuid

from cybercommon.models import AlertRule
from app.core.alerts import filter_rules, matches, SUPPORTED_METRICS


def _rule(metric, threshold, operator=">=", enabled=True, severity="HIGH", name="R", asset_id=None):
    return AlertRule(
        id=uuid.uuid4(),
        name=name,
        metric=metric,
        operator=operator,
        threshold=threshold,
        severity=severity,
        enabled=enabled,
        asset_id=asset_id,
    )


def test_matches_operators():
    assert matches(80, 75, ">=") is True
    assert matches(74, 75, ">=") is False
    assert matches(76, 75, ">") is True
    assert matches(75, 75, ">") is False
    assert matches(74, 75, "<=") is True
    assert matches(74, 75, "<") is True
    assert matches(75, 75, "<") is False


def test_fires_when_threshold_breached():
    rules = [_rule("risk_score", 75)]
    fired = filter_rules(rules, {"risk_score": 88.0})
    assert len(fired) == 1
    assert fired[0]["metric"] == "risk_score"
    assert fired[0]["severity"] == "HIGH"
    assert "88" in fired[0]["message"]


def test_no_fire_below_threshold():
    assert filter_rules([_rule("risk_score", 75)], {"risk_score": 40.0}) == []


def test_disabled_rule_never_fires():
    rules = [_rule("risk_score", 0, enabled=False)]
    assert filter_rules(rules, {"risk_score": 99.0}) == []


def test_unrelated_rule_ignored():
    rules = [_rule("open_vulns", 25)]
    assert filter_rules(rules, {"risk_score": 99.0}) == []


def test_missing_metric_is_skipped():
    assert filter_rules([_rule("kev_count", 3)], {}) == []


def test_asset_scoped_rule_is_skipped_for_other_asset():
    rules = [_rule("total_eal", 10000, asset_id=uuid.uuid4())]
    assert filter_rules(rules, {"total_eal": 99999.0, "asset_id": str(uuid.uuid4())}) == []


def test_multiple_rules_all_fire():
    rules = [
        _rule("risk_score", 75, severity="HIGH"),
        _rule("total_eal", 10000000, severity="CRITICAL"),
    ]
    fired = filter_rules(rules, {"risk_score": 80.0, "total_eal": 12000000.0})
    assert len(fired) == 2


def test_supported_metrics_contract():
    assert set(SUPPORTED_METRICS) == {"risk_score", "total_eal", "open_vulns", "kev_count"}