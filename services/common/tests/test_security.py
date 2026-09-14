"""Unit tests for cybercommon.security — bcrypt password hashing & verification."""

from cybercommon.security import hash_password, verify_password


def test_hash_verify_roundtrip():
    digest = hash_password("S3cret@2026!")
    assert digest != "S3cret@2026!"
    assert verify_password("S3cret@2026!", digest) is True


def test_wrong_password_fails():
    digest = hash_password("right-password")
    assert verify_password("wrong-password", digest) is False


def test_hashes_are_salted():
    a = hash_password("same-password")
    b = hash_password("same-password")
    assert a != b


def test_invalid_hash_returns_false():
    assert verify_password("anything", "not-a-bcrypt-hash") is False