"""Hash-chain risk decision audit.

Every material risk decision (a persisted calculation, a scenario, an
optimizer commitment) is appended to a tamper-evident chain. Each entry stores
the hash of its payload and the hash of the previous entry; recomputing the
chain proves nothing was altered after the fact.
"""
import hashlib
import json
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.asset import AuditEntry


def hash_payload(payload: dict) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class AuditChain:
    def __init__(self, db: Session):
        self.db = db

    def commit(
        self,
        action: str,
        payload: dict,
        actor: str | None = None,
        asset_id=None,
    ) -> dict:
        last = (
            self.db.query(AuditEntry)
            .order_by(AuditEntry.chain_position.desc())
            .first()
        )
        position = (last.chain_position + 1) if last else 1
        prev_hash = last.data_hash if last else "0" * 64

        entry_payload = {"position": position, "prev": prev_hash, **payload}
        data_hash = hash_payload(entry_payload)

        entry = AuditEntry(
            chain_position=position,
            prev_hash=prev_hash,
            data_hash=data_hash,
            action=action,
            actor=actor,
            asset_id=asset_id,
            details=payload,
        )
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)

        return {
            "id": str(entry.id),
            "chain_position": position,
            "prev_hash": prev_hash,
            "data_hash": data_hash,
            "action": action,
            "actor": actor,
            "created_at": entry.created_at.isoformat(),
        }

    def verify(self) -> dict:
        entries = self.db.query(AuditEntry).order_by(AuditEntry.chain_position.asc()).all()
        if not entries:
            return {"status": "EMPTY", "tampered": False, "checked": 0, "details": []}

        prev = "0" * 64
        tampered = False
        details = []

        for entry in entries:
            recomputed = hash_payload({
                "position": entry.chain_position,
                "prev": prev,
                **(entry.details or {}),
            })
            ok = (
                entry.prev_hash == prev
                and entry.data_hash == recomputed
            )
            if not ok:
                tampered = True
            details.append({
                "position": entry.chain_position,
                "valid": ok,
                "action": entry.action,
                "data_hash": entry.data_hash,
            })
            prev = entry.data_hash

        return {
            "status": "TAMPERED" if tampered else "INTACT",
            "tampered": tampered,
            "checked": len(entries),
            "details": details,
        }

    def chain(self) -> list[dict]:
        entries = self.db.query(AuditEntry).order_by(AuditEntry.chain_position.asc()).all()
        return [
            {
                "id": str(e.id),
                "chain_position": e.chain_position,
                "prev_hash": e.prev_hash,
                "data_hash": e.data_hash,
                "action": e.action,
                "actor": e.actor,
                "asset_id": str(e.asset_id) if e.asset_id else None,
                "details": e.details,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ]