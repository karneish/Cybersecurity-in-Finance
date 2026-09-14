-- Migration 009: Registered ingestion data sources
-- Tracks the 7 production connectors feeding the observatory (scanners,
-- EDR, SIEM, web-edge logs, file-based batches) plus their health state.

CREATE TABLE IF NOT EXISTS public.data_sources (
    source_key        VARCHAR(50) PRIMARY KEY,
    name              VARCHAR(255) NOT NULL,
    connector_type    VARCHAR(50) NOT NULL,
                      -- SCANNER, EDR, SIEM, WEB, FILE
    status            VARCHAR(20) NOT NULL DEFAULT 'CONFIGURED',
                      -- CONFIGURED, ACTIVE, CONNECTED, STANDBY, FAILED
    description       TEXT,
    last_ingested_at  TIMESTAMP,
    records_ingested  INTEGER DEFAULT 0,
    error_count       INTEGER DEFAULT 0,
    created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_sources_status ON public.data_sources(status);