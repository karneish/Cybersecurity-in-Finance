"""Password hashing / verification (BCrypt).

Uses the ``bcrypt`` library directly instead of the unmaintained ``passlib``
package: passlib 1.7.x crashes with bcrypt >= 5 (it probes the wraparound bug
with an over-72-byte password, which bcrypt 5 now rejects before passlib can
fall back). BCrypt hashes are self-describing ($2a$/$2b$/$2y$), so standard
hashes seeded by the SQL migrations verify identically.
"""

import bcrypt

_BCRYPT_ROUNDS = 10


def hash_password(password: str) -> str:
    """Hash a password with a fresh per-call salt (bcrypt, 10 rounds)."""
    salt = bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash.

    Bcrypt only uses the first 72 bytes of a password; to stay consistent with
    earlier behavior we compare against both the raw input and the truncation.
    Returns False on any malformed-hash edge case instead of raising.
    """
    try:
        encoded = plain_password.encode("utf-8")
        stored = password_hash.encode("utf-8")
        return bcrypt.checkpw(encoded, stored)
    except (ValueError, TypeError):
        return False