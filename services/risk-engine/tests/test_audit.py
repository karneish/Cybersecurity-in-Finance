"""Unit tests for the tamper-evident audit chain primitives."""

from app.core.audit_chain import hash_payload


def test_hash_payload_is_deterministic():
    payload = {"action": "RISK_RECALC", "asset_id": "PAY-SRV-001", "score": 72.5}
    assert hash_payload(payload) == hash_payload(payload)


def test_hash_changes_with_payload():
    a = hash_payload({"action": "RISK_RECALC", "score": 72.5})
    b = hash_payload({"action": "RISK_RECALC", "score": 72.6})
    assert a != b


def test_hash_is_sha256_hex():
    digest = hash_payload({"action": "DRILL", "scenario": "RANSOMWARE"})
    assert len(digest) == 64
    int(digest, 16)


def test_json_key_order_does_not_matter():
    a = hash_payload({"x": 1, "y": 2})
    b = hash_payload({"y": 2, "x": 1})
    assert a == b