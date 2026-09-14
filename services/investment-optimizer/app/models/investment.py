from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Integer, func, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from app.database import Base


class Asset(Base):
    __tablename__ = "assets"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    asset_type = Column(String(50), nullable=False)
    environment = Column(String(20), default="PRODUCTION")
    internet_exposed = Column(Boolean, default=False)
    criticality_score = Column(Integer, default=50)
    data_sensitivity = Column(String(20), default="INTERNAL")
    business_value_inr = Column(Numeric(15, 2), nullable=False, default=0)
    sector = Column(String(50))
    region = Column(String(50))
    is_critical_infra = Column(Boolean, default=False)


class Vulnerability(Base):
    __tablename__ = "vulnerabilities"
    __table_args__ = {"schema": "vuln"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cve_id = Column(String(20))
    title = Column(String(500), nullable=False)
    cvss_score = Column(Numeric(3, 1), nullable=False)
    severity = Column(String(10), nullable=False)
    exploitability = Column(Numeric(3, 1), default=0)
    affected_asset = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id"))
    internet_exposed = Column(Boolean, default=False)
    status = Column(String(20), default="OPEN")


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


class InvestmentPlan(Base):
    __tablename__ = "investment_plans"
    __table_args__ = {"schema": "investment"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    total_budget_inr = Column(Numeric(15, 2), nullable=False)
    expected_risk_reduction = Column(Numeric(5, 4), default=0)
    expected_eal_reduction_inr = Column(Numeric(15, 2), default=0)
    rosi = Column(Numeric(8, 4), default=0)
    status = Column(String(20), default="DRAFT")
    created_by = Column(UUID(as_uuid=True))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class InvestmentItem(Base):
    __tablename__ = "investment_items"
    __table_args__ = {"schema": "investment"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("investment.investment_plans.id"))
    control_id = Column(UUID(as_uuid=True))
    allocation_inr = Column(Numeric(12, 2), nullable=False)
    risk_reduction = Column(Numeric(5, 4), default=0)
    expected_rosi = Column(Numeric(8, 4), default=0)
    priority = Column(Integer, default=0)
    implementation_start = Column(DateTime)
    implementation_end = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())


class SecurityControl(Base):
    __tablename__ = "security_controls"
    __table_args__ = {"schema": "control"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    control_type = Column(String(30), nullable=False)
    description = Column(String)
    implementation_cost_inr = Column(Numeric(12, 2), nullable=False, default=0)
    annual_maintenance_inr = Column(Numeric(12, 2), default=0)
    max_risk_reduction = Column(Numeric(5, 4), default=0)
    implementation_time_days = Column(Integer, default=30)
    maturity_levels = Column(Integer, default=3)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
