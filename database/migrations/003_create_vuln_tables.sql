-- Migration 003: Vulnerability tables

CREATE TABLE IF NOT EXISTS vuln.vulnerabilities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cve_id          VARCHAR(20),
    cwe_id          VARCHAR(20),
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    cvss_score      DECIMAL(3,1) NOT NULL,
    severity        VARCHAR(10) NOT NULL,
    exploitability  DECIMAL(3,1) DEFAULT 0,
    affected_asset  UUID,
    internet_exposed BOOLEAN DEFAULT false,
    status          VARCHAR(20) DEFAULT 'OPEN',
    remediation     TEXT,
    discovered_at   TIMESTAMP DEFAULT NOW(),
    remediated_at   TIMESTAMP,
    source          VARCHAR(50),
    metadata        JSONB,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vuln_severity ON vuln.vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_vuln_status ON vuln.vulnerabilities(status);
CREATE INDEX IF NOT EXISTS idx_vuln_asset ON vuln.vulnerabilities(affected_asset);
CREATE INDEX IF NOT EXISTS idx_vuln_cvss ON vuln.vulnerabilities(cvss_score DESC);
CREATE INDEX IF NOT EXISTS idx_vuln_cve ON vuln.vulnerabilities(cve_id);
CREATE INDEX IF NOT EXISTS idx_vuln_source ON vuln.vulnerabilities(source);
CREATE INDEX IF NOT EXISTS idx_vuln_discovered ON vuln.vulnerabilities(discovered_at DESC);
