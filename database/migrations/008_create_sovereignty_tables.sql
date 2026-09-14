-- Migration 008: Sovereign Cyber-Risk Observatory governance schema
-- Creates the gov schema, adds governance dimensions to asset.assets,
-- and establishes the third-party risk (TPRM) tables.

-- ─── gov schema ───────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS gov;

-- Agencies / public organs / enterprises under observation
CREATE TABLE IF NOT EXISTS gov.agencies (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(255) NOT NULL UNIQUE,
    agency_type      VARCHAR(30) NOT NULL DEFAULT 'PUBLIC',
                     -- PUBLIC, REGULATOR, GOVT, PSU, PRIVATE
    sector           VARCHAR(50),
    region           VARCHAR(50),
    parent_agency_id UUID REFERENCES gov.agencies(id),
    classification   VARCHAR(20) DEFAULT 'CONFIDENTIAL',
    created_at       TIMESTAMP DEFAULT NOW()
);

-- Sector profiles: regulator ownership + SRI weight + thresholds
CREATE TABLE IF NOT EXISTS gov.sector_profiles (
    sector                 VARCHAR(50) PRIMARY KEY,
    sector_name            VARCHAR(255) NOT NULL,
    regulator              VARCHAR(255),
    threshold_critical_mln DECIMAL(12,2) DEFAULT 0,
    weight                 NUMERIC(5,4) DEFAULT 1.0,
    created_at             TIMESTAMP DEFAULT NOW()
);

-- National cyber exercises / drills (history)
CREATE TABLE IF NOT EXISTS gov.exercises (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  VARCHAR(255) NOT NULL,
    scenario_key          VARCHAR(100) NOT NULL,
                          -- WORM, RANSOMWARE, SUPPLY_CHAIN, DDOS
    impact_scope          VARCHAR(30) NOT NULL DEFAULT 'NATIONAL',
                          -- SECTOR, REGION, AGENCY, NATIONAL
    sector                VARCHAR(50),
    region                VARCHAR(50),
    baseline_eal          DECIMAL(15,2),
    simulated_eal         DECIMAL(15,2),
    eal_reduction         DECIMAL(15,2),
    eal_reduction_percent DECIMAL(6,2),
    status                VARCHAR(20) DEFAULT 'COMPLETED',
                          -- COMPLETED, RUNNING, SCHEDULED
    executed_by           UUID,
    executed_at           TIMESTAMP DEFAULT NOW()
);

-- Early warnings / escalations
CREATE TABLE IF NOT EXISTS gov.early_warnings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warning_type    VARCHAR(50) NOT NULL,
                    -- EAL_SPIKE, SECTOR_CRITICAL, VULN_BREACH, VENDOR_RISK
    target_type     VARCHAR(30) NOT NULL,
                    -- SECTOR, REGION, AGENCY, ASSET, VENDOR
    target_id       VARCHAR(100),
    severity        VARCHAR(10) NOT NULL,
                    -- CRITICAL, HIGH, MEDIUM, LOW
    title           VARCHAR(500),
    description     TEXT,
    threshold_value DECIMAL(15,2),
    current_value   DECIMAL(15,2),
    status          VARCHAR(20) DEFAULT 'OPEN',
                    -- OPEN, ESCALATED, RESOLVED
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Third-party vendors / service providers
CREATE TABLE IF NOT EXISTS gov.vendors (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(255) NOT NULL UNIQUE,
    vendor_type       VARCHAR(50),
                      -- MSP, SAAS, HARDWARE, INTEGRATOR, CLOUD
    criticality_score INTEGER DEFAULT 50,
    business_value_inr DECIMAL(15,2) DEFAULT 0,
    sector            VARCHAR(50),
    region            VARCHAR(50),
    assessment_score  DECIMAL(5,4) DEFAULT 0,
                      -- 0.0000 to 1.0000 (third-party assessment)
    last_assessed_at  TIMESTAMP,
    created_at        TIMESTAMP DEFAULT NOW()
);

-- Vendor → asset service map (TPRM cascade edges)
CREATE TABLE IF NOT EXISTS gov.asset_vendors (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id     UUID NOT NULL REFERENCES asset.assets(id) ON DELETE CASCADE,
    vendor_id    UUID NOT NULL REFERENCES gov.vendors(id) ON DELETE CASCADE,
    service_type VARCHAR(50),
    risk_share   DECIMAL(5,4) DEFAULT 1.0,
                 -- portion of asset risk attributable to this vendor
    created_at   TIMESTAMP DEFAULT NOW(),
    UNIQUE(asset_id, vendor_id)
);

-- ─── Governance dimensions on assets ─────────────────────────
ALTER TABLE asset.assets ADD COLUMN IF NOT EXISTS sector VARCHAR(50);
ALTER TABLE asset.assets ADD COLUMN IF NOT EXISTS region VARCHAR(50);
ALTER TABLE asset.assets ADD COLUMN IF NOT EXISTS agency_id UUID;
ALTER TABLE asset.assets ADD COLUMN IF NOT EXISTS is_critical_infra BOOLEAN DEFAULT false;
ALTER TABLE asset.assets ADD COLUMN IF NOT EXISTS classification VARCHAR(20) DEFAULT 'CONFIDENTIAL';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_sector_region ON asset.assets(sector, region);
CREATE INDEX IF NOT EXISTS idx_assets_agency ON asset.assets(agency_id);
CREATE INDEX IF NOT EXISTS idx_assets_critical_infra ON asset.assets(is_critical_infra)
    WHERE is_critical_infra = true;

CREATE INDEX IF NOT EXISTS idx_vendors_sector ON gov.vendors(sector);
CREATE INDEX IF NOT EXISTS idx_asset_vendors_vendor ON gov.asset_vendors(vendor_id);
CREATE INDEX IF NOT EXISTS idx_exercises_sector ON gov.exercises(sector);
CREATE INDEX IF NOT EXISTS idx_warnings_type ON gov.early_warnings(warning_type);