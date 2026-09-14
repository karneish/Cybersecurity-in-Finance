-- Migration 004: Security control tables

CREATE TABLE IF NOT EXISTS control.security_controls (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(255) NOT NULL,
    control_type            VARCHAR(30) NOT NULL,
    description             TEXT,
    implementation_cost_inr DECIMAL(12,2) NOT NULL DEFAULT 0,
    annual_maintenance_inr  DECIMAL(12,2) DEFAULT 0,
    max_risk_reduction      DECIMAL(5,4) DEFAULT 0,
    implementation_time_days INTEGER DEFAULT 30,
    maturity_levels         INTEGER DEFAULT 3,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS control.asset_controls (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id            UUID,
    control_id          UUID REFERENCES control.security_controls(id) ON DELETE CASCADE,
    status              VARCHAR(20) DEFAULT 'PLANNED',
    coverage_score      DECIMAL(5,4) DEFAULT 0,
    effectiveness_score DECIMAL(5,4) DEFAULT 0,
    maturity_level      INTEGER DEFAULT 1,
    implemented_at      TIMESTAMP,
    last_verified_at    TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE(asset_id, control_id)
);

CREATE INDEX IF NOT EXISTS idx_controls_type ON control.security_controls(control_type);
CREATE INDEX IF NOT EXISTS idx_asset_controls_asset ON control.asset_controls(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_controls_status ON control.asset_controls(status);
