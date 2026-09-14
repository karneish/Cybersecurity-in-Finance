from sqlalchemy import Column, String, Integer, Numeric, Boolean, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.database import Base


class Agency(Base):
    __tablename__ = "agencies"
    __table_args__ = {"schema": "gov"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True)
    agency_type = Column(String(30), default="PUBLIC")
    sector = Column(String(50))
    region = Column(String(50))
    parent_agency_id = Column(UUID(as_uuid=True), ForeignKey("gov.agencies.id"))
    classification = Column(String(20), default="CONFIDENTIAL")
    created_at = Column(DateTime, server_default=func.now())


class SectorProfile(Base):
    __tablename__ = "sector_profiles"
    __table_args__ = {"schema": "gov"}

    sector = Column(String(50), primary_key=True)
    sector_name = Column(String(255), nullable=False)
    regulator = Column(String(255))
    threshold_critical_mln = Column(Numeric(12, 2), default=0)
    weight = Column(Numeric(5, 4), default=1.0)
    created_at = Column(DateTime, server_default=func.now())


class Exercise(Base):
    __tablename__ = "exercises"
    __table_args__ = {"schema": "gov"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    scenario_key = Column(String(100), nullable=False)
    impact_scope = Column(String(30), default="NATIONAL")
    sector = Column(String(50))
    region = Column(String(50))
    baseline_eal = Column(Numeric(15, 2))
    simulated_eal = Column(Numeric(15, 2))
    eal_reduction = Column(Numeric(15, 2))
    eal_reduction_percent = Column(Numeric(6, 2))
    status = Column(String(20), default="COMPLETED")
    executed_by = Column(UUID(as_uuid=True))
    executed_at = Column(DateTime, server_default=func.now())


class EarlyWarning(Base):
    __tablename__ = "early_warnings"
    __table_args__ = {"schema": "gov"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    warning_type = Column(String(50), nullable=False)
    target_type = Column(String(30), nullable=False)
    target_id = Column(String(100))
    severity = Column(String(10), nullable=False)
    title = Column(String(500))
    description = Column(Text)
    threshold_value = Column(Numeric(15, 2))
    current_value = Column(Numeric(15, 2))
    status = Column(String(20), default="OPEN")
    created_at = Column(DateTime, server_default=func.now())


class Vendor(Base):
    __tablename__ = "vendors"
    __table_args__ = {"schema": "gov"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True)
    vendor_type = Column(String(50))
    criticality_score = Column(Integer, default=50)
    business_value_inr = Column(Numeric(15, 2), default=0)
    sector = Column(String(50))
    region = Column(String(50))
    assessment_score = Column(Numeric(5, 4), default=0)
    last_assessed_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())


class AssetVendor(Base):
    __tablename__ = "asset_vendors"
    __table_args__ = {"schema": "gov"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id", ondelete="CASCADE"), nullable=False)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("gov.vendors.id", ondelete="CASCADE"), nullable=False)
    service_type = Column(String(50))
    risk_share = Column(Numeric(5, 4), default=1.0)
    created_at = Column(DateTime, server_default=func.now())