-- Threat-intel feed snapshot cache (WS4).
-- Enrichment records pulled from CISA KEV, FIRST EPSS and NVD.
-- Kept in Postgres so the platform degrades gracefully offline.
CREATE TABLE IF NOT EXISTS public.threat_intel (
    id          SERIAL PRIMARY KEY,
    feed        VARCHAR(32) NOT NULL,
    cve_id      VARCHAR(32) NOT NULL,
    source_key  VARCHAR(64),
    payload     JSONB,
    fetched_at  TIMESTAMP   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threat_intel_feed_cve ON public.threat_intel (feed, cve_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_threat_intel_feed_cve ON public.threat_intel (feed, cve_id);