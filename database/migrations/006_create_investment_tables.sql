-- Migration 006: Investment tables

CREATE TABLE IF NOT EXISTS investment.investment_plans (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                        VARCHAR(255) NOT NULL,
    total_budget_inr            DECIMAL(15,2) NOT NULL,
    expected_risk_reduction     DECIMAL(5,4) DEFAULT 0,
    expected_eal_reduction_inr  DECIMAL(15,2) DEFAULT 0,
    rosi                        DECIMAL(8,4) DEFAULT 0,
    status                      VARCHAR(20) DEFAULT 'DRAFT',
    created_by                  UUID,
    created_at                  TIMESTAMP DEFAULT NOW(),
    updated_at                  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investment.investment_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id             UUID REFERENCES investment.investment_plans(id) ON DELETE CASCADE,
    control_id          UUID,
    allocation_inr      DECIMAL(12,2) NOT NULL,
    risk_reduction      DECIMAL(5,4) DEFAULT 0,
    expected_rosi       DECIMAL(8,4) DEFAULT 0,
    priority            INTEGER DEFAULT 0,
    implementation_start DATE,
    implementation_end   DATE,
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investment_plan_status ON investment.investment_plans(status);
CREATE INDEX IF NOT EXISTS idx_investment_plan_created ON investment.investment_plans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investment_items_plan ON investment.investment_items(plan_id);
