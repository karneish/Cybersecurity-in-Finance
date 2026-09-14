from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session

from cybercommon.database import get_db
from cybercommon.deps import UserIdentity, get_current_user

from app.core import rag

router = APIRouter(prefix="/api/ai/rag", tags=["rag"])

FRAMEWORKS = ["ISO27001", "NISTCSF", "CIS", "RBI", "SEBI", "DPDP", "ITACT", "TRAI", "IRDAI", "NCIIPC"]


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


class RAGQueryRequest(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    question: str = Field(..., min_length=3, max_length=1000)
    framework: str | None = None
    k: int = 5


@router.get("/status")
def rag_status(
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    corpus = db.query(rag.ComplianceDocument).all()
    frameworks = sorted({d.framework for d in corpus})
    return {
        "enabled": True,
        "technique": "cosine-similarity retrieval (pgvector-compatible embeddings)",
        "embeddingDimension": rag.EMBED_DIM,
        "frameworksIndexed": frameworks,
        "documentCount": len(corpus),
        "corpusReady": len(corpus) > 0,
    }


@router.post("/refresh")
def rag_refresh(
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    added = rag.sync_corpus(db)
    return {"message": "Compliance corpus synchronised", "added": added}


@router.post("/query")
def rag_query(
    payload: RAGQueryRequest,
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    rag.sync_corpus(db)
    results = rag.retrieve(db, payload.question, payload.framework, k=min(max(payload.k, 1), 10))
    if not results:
        return {
            "question": payload.question,
            "framework": payload.framework,
            "method": "rag",
            "answer": "No compliance clause retrieved for the query. Try rephrasing or indexing the framework.",
            "sources": [],
            "confidence": 0.0,
        }
    top = results[0]
    answer = (
        f"For the {top['framework']} framework, the most relevant clause is "
        f"'{top['reference'] or top['title']}' ({top['category']}): {top['content']}"
    )
    return {
        "question": payload.question,
        "framework": payload.framework,
        "method": "rag",
        "answer": answer,
        "sources": results,
        "confidence": float(top["score"]) if results else 0.0,
        "answerable": True if results else False,
    }