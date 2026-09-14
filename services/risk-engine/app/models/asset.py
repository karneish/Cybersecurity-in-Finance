from sqlalchemy import Column, String, Integer, Numeric, Boolean, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from app.database import Base


class AssetDependency(Base):
    __tablename__ = "asset_dependencies"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id"), nullable=False)
    depends_on_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id"), nullable=False)
    dependency_type = Column(String(30), nullable=False)
    criticality = Column(Integer, default=50)


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


class RiskCalculation(Base):
    __tablename__ = "risk_calculations"
    __table_args__ = {"schema": "risk"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id"))
    risk_score = Column(Numeric(5, 2), nullable=False)
    probability = Column(Numeric(5, 4), nullable=False)
    financial_impact_inr = Column(Numeric(15, 2), nullable=False)
    expected_annual_loss = Column(Numeric(15, 2), nullable=False)
    risk_category = Column(String(20), nullable=False)
    risk_factors = Column(JSONB)
    control_reduction = Column(Numeric(5, 4), default=0)
    residual_risk = Column(Numeric(15, 2), default=0)
    calculated_at = Column(DateTime, server_default=func.now())
    version = Column(Integer, default=1)


class RiskSnapshot(Base):
    __tablename__ = "risk_snapshots"
    __table_args__ = {"schema": "risk"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id"))
    risk_score = Column(Numeric(5, 2))
    expected_annual_loss = Column(Numeric(15, 2))
    total_controls_active = Column(Integer)
    total_vulns_open = Column(Integer)
    snapshot_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class RiskEvent(Base):
    __tablename__ = "risk_events"
    __table_args__ = {"schema": "risk"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type = Column(String(50), nullable=False)
    source_asset = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id"))
    details = Column(JSONB)
    risk_before = Column(Numeric(5, 2))
    risk_after = Column(Numeric(5, 2))
    eal_before = Column(Numeric(15, 2))
    eal_after = Column(Numeric(15, 2))
    created_at = Column(DateTime, server_default=func.now())


class AuditEntry(Base):
    __tablename__ = "audit_entries"
    __table_args__ = {"schema": "risk"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chain_position = Column(Integer, nullable=False)
    prev_hash = Column(String(64), nullable=False)
    data_hash = Column(String(64), nullable=False)
    action = Column(String(100), nullable=False)
    actor = Column(String(255))
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id"))
    details = Column(JSONB)
    created_at = Column(DateTime, server_default=func.now())
