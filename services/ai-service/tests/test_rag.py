"""Unit tests for the deterministic RAG embedder and retrieval scoring."""

import math

from app.core.rag import EMBED_DIM, _cosine, embed_text


def test_embed_dimensions_and_unit_length():
    vector = embed_text("multi-factor authentication for cloud accounts")
    assert len(vector) == EMBED_DIM
    norm = math.sqrt(sum(v * v for v in vector))
    assert abs(norm - 1.0) < 1e-6 or norm == 0.0


def test_embed_is_deterministic_and_idempotent():
    text = "banks shall report cyber incidents to RBI within timelines"
    assert embed_text(text) == embed_text(text)


def test_embed_distinguishes_different_text():
    a = embed_text("multi-factor authentication control")
    b = embed_text("backup and recovery procedures")
    assert a != b


def test_cosine_similarity_of_identical_vectors():
    v = embed_text("encrypt data in transit and at rest")
    assert _cosine(v, v) > 0.9999


def test_cosine_similarity_related_is_above_unrelated():
    base = embed_text("multi-factor authentication for administrator access")
    close = embed_text("require multi-factor authentication for admin accounts")
    far = embed_text("customer consent for personal data processing")
    assert _cosine(base, close) > _cosine(base, far)


def test_cosine_length_mismatch_returns_zero():
    assert _cosine([0.1, 0.2], [0.1, 0.2, 0.3]) == 0.0


def test_corpus_structure():
    from app.core.rag import CORPUS

    frameworks = {row[0] for row in CORPUS}
    assert {"ISO27001", "NISTCSF", "CIS", "RBI", "SEBI", "DPDP", "TRAI", "IRDAI", "NCIIPC"} <= frameworks
    for framework, _category, reference, content in CORPUS:
        assert reference and content