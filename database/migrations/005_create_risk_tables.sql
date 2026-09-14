-- Migration 005: Risk tables

CREATE TABLE IF NOT EXISTS risk.risk_calculations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id                UUID,
    risk_score              DECIMAL(5,2) NOT NULL,
    probability             DECIMAL(5,4) NOT NULL,
    financial_impact_inr    DECIMAL(15,2) NOT NULL,
    expected_annual_loss    DECIMAL(15,2) NOT NULL,
    risk_category           VARCHAR(20) NOT NULL,
    risk_factors            JSONB,
    control_reduction       DECIMAL(5,4) DEFAULT 0,
    residual_risk           DECIMAL(15,2) DEFAULT 0,
    calculated_at           TIMESTAMP DEFAULT NOW(),
    version                 INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS risk.risk_snapshots (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id                UUID,
    risk_score              DECIMAL(5,2),
    expected_annual_loss    DECIMAL(15,2),
    total_controls_active   INTEGER,
    total_vulns_open        INTEGER,
    snapshot_date           DATE NOT NULL,
    created_at              TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk.risk_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type      VARCHAR(50) NOT NULL,
    source_asset    UUID,
    details         JSONB,
    risk_before     DECIMAL(5,2),
    risk_after      DECIMAL(5,2),
    eal_before      DECIMAL(15,2),
    eal_after       DECIMAL(15,2),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_calc_asset ON risk.risk_calculations(asset_id);
CREATE INDEX IF NOT EXISTS idx_risk_calc_score ON risk.risk_calculations(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_risk_calc_category ON risk.risk_calculations(risk_category);
CREATE INDEX IF NOT EXISTS idx_risk_calc_date ON risk.risk_calculations(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_snapshots_date ON risk.risk_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_risk_snapshots_asset ON risk.risk_snapshots(asset_id);
CREATE INDEX IF NOT EXISTS idx_risk_events_date ON risk.risk_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_events_type ON risk.risk_events(event_type);
