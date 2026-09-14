-- Migration 007: Risk decision audit hash-chain

CREATE TABLE IF NOT EXISTS risk.audit_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_position  INTEGER NOT NULL UNIQUE,
    prev_hash       VARCHAR(64) NOT NULL,
    data_hash       VARCHAR(64) NOT NULL,
    action          VARCHAR(100) NOT NULL,
    actor           VARCHAR(255),
    asset_id        UUID,
    details         JSONB,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_chain_position ON risk.audit_entries(chain_position DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON risk.audit_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_asset ON risk.audit_entries(asset_id);