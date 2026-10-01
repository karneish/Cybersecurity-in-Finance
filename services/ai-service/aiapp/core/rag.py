"""RAG compliance retrieval.

Embeds the regulatory compliance corpus (ISO 27001, NIST CSF, CIS, RBI, SEBI,
IT/DPDP, TRAI, IRDAI, NCIIPC) into `gov.compliance_docs` alongside the pgvector
extension created by migration 010 (vectors stored as JSONB for portability).
Retrieval is cosine-similarity over embed vectors — a deterministic hashing
embedder keeps the pipeline self-contained and offline-friendly.
"""

import hashlib
import math
import re
import uuid
from typing import Sequence

from sqlalchemy.orm import Session

from cybercommon.models import ComplianceDocument

EMBED_DIM = 384

CORPUS = [
    # ISO/IEC 27001
    ("ISO27001", "Access Control", "ISO 27001 A.9.2.1",
     "User registration and de-registration: all users shall have a unique identifier only for their personal use, and controls shall ensure access rights are granted only to authorised parties."),
    ("ISO27001", "Asset Management", "ISO 27001 A.8.1.1",
     "Inventory of assets: all information assets and associated hardware, software and services shall be identified and an inventory of those assets maintained."),
    ("ISO27001", "Incident Response", "ISO 27001 A.16.1.2",
     "Reporting information security events: information security events shall be reported through appropriate management channels as quickly as possible."),
    ("ISO27001", "Operations Security", "ISO 27001 A.12.6.1",
     "Management of technical vulnerabilities: information about technical vulnerabilities shall be obtained in a timely fashion and exposure evaluated, enabling effective action."),
    # NIST CSF
    ("NISTCSF", "Govern", "NIST CSF GV.OC",
     "The organizational context is understood: roles, responsibilities and dependencies for supply chain and business processes are identified to manage cybersecurity risk."),
    ("NISTCSF", "Identify", "NIST CSF ID.AM",
     "Asset management: inventories of hardware, software, data, external information systems and network resources are maintained in alignment with business requirements."),
    ("NISTCSF", "Protect", "NIST CSF PR.AT",
     "Awareness and training: personnel are provided with awareness and training to perform security-related duties consistent with policies and procedures."),
    ("NISTCSF", "Detect", "NIST CSF DE.CM",
     "Continuous monitoring: the information system and assets are monitored at discrete intervals to identify cybersecurity events."),
    ("NISTCSF", "Respond", "NIST CSF RS.RP",
     "Response planning: response plans and procedures are executed and maintained to ensure response to detected cybersecurity incidents."),
    # CIS Controls
    ("CIS", "CIS Control 6", "CIS 6.4",
     "Money flows with multi-factor authentication: enterprise and administrative access to cloud accounts shall require multi-factor authentication."),
    ("CIS", "CIS Control 7", "CIS 7.4",
     "Perimeter defenses and email security: sensitive data shall be protected from transmission by unauthorised parties and phishing precursors blocked at the edge."),
    ("CIS", "CIS Control 5", "CIS 5.1",
     "Account management: establish and maintain an inventory of all accounts within the enterprise, including user and administrator accounts."),
    # RBI (Master Direction — Information Technology Governance)
    ("RBI", "IT Governance", "RBI ITGR Part B",
     "Banks shall have a board-approved IT strategy and cyber-risk management framework aligned with business objectives, with a CSIRT to handle incidents."),
    ("RBI", "Cyber Resilience", "RBI DSA / Cyber Resilience",
     "Banks shall maintain cyber resilience through business continuity and disaster recovery plans, and must report cyber incidents to RBI within prescribed timelines."),
    ("RBI", "Internal Audit", "RBI ITGR Part C",
     "The effectiveness of information security governance shall be validated through independent internal audit and periodic vulnerability assessments."),
    # SEBI
    ("SEBI", "Cybersecurity Framework", "SEBI Circular 2019",
     "Market Infrastructure Institutions shall implement a board-approved Cybersecurity and Cyber Resilience Framework and report incidents to SEBI within a defined SLA."),
    # IT / DPDP
    ("DPDP", "Data Protection", "DPDP Act 2023 Sec 9",
     "Data fiduciary shall observe data minimisation, purpose limitation and storage limitation when processing digital personal data, and conduct impact assessments."),
    ("ITACT", "Critical Information Infrastructure", "IT (Amendment) Act 2008 Sec 70",
     "The National Critical Information Infrastructure Protection Centre shall facilitate protection of critical information infrastructure through compliance audits."),
    # TRAI
    ("TRAI", "Data Protection", "TRAI Recommendation 2017",
     "Telecom service providers shall give prior informed consent for use of customer personal data and shall encrypt data in transit and at rest."),
    # IRDAI
    ("IRDAI", "Information & Cyber Security", "IRDAI Guidelines",
     "Insurers shall put in place a board-approved information and cyber security policy covering all systems, with regular security audits."),
    # NCIIPC
    ("NCIIPC", "Designated Systems", "NCIIPC Guidelines",
     "Owners of designated critical information infrastructure shall implement layered security, conduct regular security audits, and ensure availability redundancy."),
]


def embed_text(text: str) -> list[float]:
    """Deterministic hashing embedder (384-d, L2 normalised) — offline & consistent."""
    vector = [0.0] * EMBED_DIM
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    counts: dict[int, int] = {}
    for token in tokens:
        idx = int(hashlib.md5(token.encode("utf-8")).hexdigest()[:8], 16) % EMBED_DIM
        counts[idx] = counts.get(idx, 0) + 1
    for idx, count in counts.items():
        vector[idx] = 1.0 + math.log(count)
    norm = math.sqrt(sum(v * v for v in vector))
    if norm:
        vector = [v / norm for v in vector]
    return vector


def _cosine(a: Sequence[float], b: Sequence[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if not na or not nb:
        return 0.0
    return dot / (na * nb)


def sync_corpus(db: Session) -> int:
    """Idempotently seed the compliance corpus and (re)compute missing embeddings."""
    existing = {d.title: d for d in db.query(ComplianceDocument).all()}
    added = 0
    for framework, category, reference, content in CORPUS:
        existing_doc = existing.get(content[:100] or content)
        if existing_doc is None:
            doc = ComplianceDocument(
                framework=framework,
                category=category,
                title=reference or content[:80],
                content=content,
                reference=reference,
                embedding=embed_text(content),
            )
            db.add(doc)
            added += 1
    db.commit()
    # Ensure embeddings exist for previously seeded rows.
    for doc in db.query(ComplianceDocument).all():
        if doc.embedding is None:
            doc.embedding = embed_text(doc.content)
    db.commit()
    return added


def retrieve(
    db: Session,
    question: str,
    framework: str | None = None,
    k: int = 5,
) -> list[dict]:
    q_embed = embed_text(question)
    query = db.query(ComplianceDocument)
    if framework:
        query = query.filter(ComplianceDocument.framework == framework.upper())
    docs = query.all()
    scored = sorted(
        (
            (doc, _cosine(q_embed, [float(v) for v in (doc.embedding or [])]))
            for doc in docs
        ),
        key=lambda t: t[1],
        reverse=True,
    )
    results = []
    for doc, score in scored[:k]:
        if score <= 0:
            continue
        results.append({
            "framework": doc.framework,
            "category": doc.category,
            "title": doc.title,
            "reference": doc.reference,
            "content": doc.content,
            "score": round(score, 4),
        })
    return results