from sqlalchemy import Column, String, Integer, DateTime, Text, func

from app.database import Base


class DataSource(Base):
    """Registered telemetry / ingestion connector.

    Mirrors `public.data_sources` created by migration 009. Status lifecycle:
    CONFIGURED → ACTIVE → CONNECTED → STANDBY (or FAILED on repeated errors).
    """

    __tablename__ = "data_sources"

    source_key = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    connector_type = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False, default="CONFIGURED")
    description = Column(Text)
    last_ingested_at = Column(DateTime)
    records_ingested = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())