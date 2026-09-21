"""Shared SQLAlchemy models mapped to the committed CyberRisk database schema."""

import uuid

from sqlalchemy import (
    Column,
    Integer,
    String,
    Numeric,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB

from cybercommon.database import Base


# ─── auth schema ───────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "auth"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), nullable=False, unique=True)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(String(20), nullable=False, default="ANALYST")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = {"schema": "auth"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"))
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50))
    resource_id = Column(String(50))
    details = Column(Text)
    ip_address = Column(String(45))
    created_at = Column(DateTime, server_default=func.now())


class RefreshToken(Base):
    """Refresh-token rotation ledger (migration 010)."""

    __tablename__ = "refresh_tokens"
    __table_args__ = {"schema": "auth"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=False)
    token_hash = Column(String(128), nullable=False, unique=True)
    family_id = Column(UUID(as_uuid=True), default=uuid.uuid4, index=True)
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime)
    replaced_by = Column(UUID(as_uuid=True))


# ─── asset schema ──────────────────────────────────────────────
class Asset(Base):
    __tablename__ = "assets"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    asset_type = Column(String(50), nullable=False)
    environment = Column(String(20), default="PRODUCTION")
    owner = Column(String(255))
    department = Column(String(100))
    ip_address = Column(String(45))
    operating_system = Column(String(100))
    business_value_inr = Column(Numeric(15, 2), nullable=False, default=0)
    replacement_cost_inr = Column(Numeric(15, 2), default=0)
    internet_exposed = Column(Boolean, default=False)
    criticality_score = Column(Integer, default=50)
    data_sensitivity = Column(String(20), default="INTERNAL")
    annual_revenue_impact = Column(Numeric(15, 2), default=0)
    metadata_ = Column("metadata", JSONB)
    sector = Column(String(50))
    region = Column(String(50))
    agency_id = Column(UUID(as_uuid=True), ForeignKey("gov.agencies.id"))
    is_critical_infra = Column(Boolean, default=False)
    classification = Column(String(20), default="CONFIDENTIAL")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class AssetDependency(Base):
    __tablename__ = "asset_dependencies"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id"), nullable=False)
    depends_on_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id"), nullable=False)
    dependency_type = Column(String(30), nullable=False)
    criticality = Column(Integer, default=50)
    created_at = Column(DateTime, server_default=func.now())


# ─── vuln schema ───────────────────────────────────────────────
class Vulnerability(Base):
    __tablename__ = "vulnerabilities"
    __table_args__ = {"schema": "vuln"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cve_id = Column(String(20))
    cwe_id = Column(String(20))
    title = Column(String(500), nullable=False)
    description = Column(Text)
    cvss_score = Column(Numeric(3, 1), nullable=False)
    severity = Column(String(10), nullable=False)
    exploitability = Column(Numeric(3, 1), default=0)
    affected_asset = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id"))
    internet_exposed = Column(Boolean, default=False)
    status = Column(String(20), default="OPEN")
    remediation = Column(Text)
    discovered_at = Column(DateTime, server_default=func.now())
    remediated_at = Column(DateTime)
    source = Column(String(50))
    metadata_ = Column("metadata", JSONB)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# ─── control schema ────────────────────────────────────────────
class SecurityControl(Base):
    __tablename__ = "security_controls"
    __table_args__ = {"schema": "control"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    control_type = Column(String(30), nullable=False)
    description = Column(Text)
    implementation_cost_inr = Column(Numeric(12, 2), nullable=False, default=0)
    annual_maintenance_inr = Column(Numeric(12, 2), default=0)
    max_risk_reduction = Column(Numeric(5, 4), default=0)
    implementation_time_days = Column(Integer, default=30)
    maturity_levels = Column(Integer, default=3)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class AssetControl(Base):
    __tablename__ = "asset_controls"
    __table_args__ = {"schema": "control"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id"))
    control_id = Column(UUID(as_uuid=True), ForeignKey("control.security_controls.id"))
    status = Column(String(20), default="PLANNED")
    coverage_score = Column(Numeric(5, 4), default=0)
    effectiveness_score = Column(Numeric(5, 4), default=0)
    maturity_level = Column(Integer, default=1)
    implemented_at = Column(DateTime)
    last_verified_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# ─── public schema ─────────────────────────────────────────────
class SecurityEvent(Base):
    """Normalized ingestion event ledger (migration 010, table public.security_events)."""

    __tablename__ = "security_events"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type = Column(String(50), nullable=False)
    source_asset = Column(UUID(as_uuid=True))
    source = Column(String(50), nullable=False)
    details = Column(Text)
    timestamp = Column(DateTime, nullable=False, server_default=func.now())
    processed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, server_default=func.now())


class DataSource(Base):
    __tablename__ = "data_sources"
    __table_args__ = {"schema": "public"}

    source_key = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    connector_type = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False, default="CONFIGURED")
    description = Column(Text)
    last_ingested_at = Column(DateTime)
    records_ingested = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())


# ─── gov schema (subset used by services) ──────────────────────
class Agency(Base):
    __tablename__ = "agencies"
    __table_args__ = {"schema": "gov"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True)
    agency_type = Column(String(30), nullable=False, default="PUBLIC")
    sector = Column(String(50))
    region = Column(String(50))
    parent_agency_id = Column(UUID(as_uuid=True), ForeignKey("gov.agencies.id"))
    classification = Column(String(20), default="CONFIDENTIAL")
    created_at = Column(DateTime, server_default=func.now())


class ComplianceDocument(Base):
    """RAG compliance corpus (migration 010, schema gov, pgvector-friendly)."""

    __tablename__ = "compliance_docs"
    __table_args__ = {"schema": "gov"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    framework = Column(String(50), nullable=False, index=True)
    category = Column(String(100))
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    reference = Column(String(255))
    embedding = Column(JSONB)
    created_at = Column(DateTime, server_default=func.now())


class ThreatIntel(Base):
    """Cached threat-intel feed snapshots (migration 011, schema public).

    Stores per-CVE enrichments pulled from CISA KEV, FIRST EPSS and NVD so the
    platform keeps last-known-good data when the upstream feeds are unreachable
    (offline fallback). ``payload`` mirrors the upstream record.
    """

    __tablename__ = "threat_intel"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    feed = Column(String(32), nullable=False)
    cve_id = Column(String(32), nullable=False)
    source_key = Column(String(64))
    payload = Column(JSONB)
    fetched_at = Column(DateTime, nullable=False, server_default=func.now())


class AlertRule(Base):
    """Threshold alert rule (migration 012, schema public)."""

    __tablename__ = "alert_rules"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(120), nullable=False)
    metric = Column(String(32), nullable=False)
    operator = Column(String(4), nullable=False, default=">=")
    threshold = Column(Numeric(14, 2), nullable=False)
    asset_id = Column(UUID(as_uuid=True))
    severity = Column(String(16), nullable=False, default="HIGH")
    enabled = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())


class AlertEvent(Base):
    """Fired alert (migration 012, schema public)."""

    __tablename__ = "alert_events"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id = Column(UUID(as_uuid=True), ForeignKey("public.alert_rules.id"))
    metric = Column(String(32), nullable=False)
    observed = Column(Numeric(14, 2), nullable=False)
    threshold = Column(Numeric(14, 2), nullable=False)
    severity = Column(String(16), nullable=False)
    asset_id = Column(UUID(as_uuid=True))
    payload = Column(JSONB)
    fired_at = Column(DateTime, nullable=False, server_default=func.now())