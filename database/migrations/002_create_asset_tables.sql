-- Migration 002: Asset tables

CREATE TABLE IF NOT EXISTS asset.assets (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(255) NOT NULL,
    asset_type              VARCHAR(50) NOT NULL,
    environment             VARCHAR(20) DEFAULT 'PRODUCTION',
    owner                   VARCHAR(255),
    department              VARCHAR(100),
    ip_address              INET,
    mac_address             VARCHAR(17),
    operating_system        VARCHAR(100),
    business_value_inr      DECIMAL(15,2) NOT NULL DEFAULT 0,
    replacement_cost_inr    DECIMAL(15,2) DEFAULT 0,
    internet_exposed        BOOLEAN DEFAULT false,
    criticality_score       INTEGER DEFAULT 50,
    data_sensitivity        VARCHAR(20) DEFAULT 'INTERNAL',
    annual_revenue_impact   DECIMAL(15,2) DEFAULT 0,
    metadata                JSONB,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset.asset_dependencies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id        UUID REFERENCES asset.assets(id) ON DELETE CASCADE,
    depends_on_id   UUID REFERENCES asset.assets(id) ON DELETE CASCADE,
    dependency_type VARCHAR(30) NOT NULL,
    criticality     INTEGER DEFAULT 50,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(asset_id, depends_on_id)
);

CREATE INDEX IF NOT EXISTS idx_assets_criticality ON asset.assets(criticality_score DESC);
CREATE INDEX IF NOT EXISTS idx_assets_type ON asset.assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_environment ON asset.assets(environment);
CREATE INDEX IF NOT EXISTS idx_assets_department ON asset.assets(department);
CREATE INDEX IF NOT EXISTS idx_assets_exposed ON asset.assets(internet_exposed) WHERE internet_exposed = true;
CREATE INDEX IF NOT EXISTS idx_asset_deps_asset ON asset.asset_dependencies(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_deps_depends ON asset.asset_dependencies(depends_on_id);
