-- Alert rule engine + alert event ledger (WS8).
-- Threshold rules evaluated against risk metrics; fired alerts are persisted
-- and broadcast on the /topic/risk/alert STOMP topic for the live feed.
CREATE TABLE IF NOT EXISTS public.alert_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(120) NOT NULL,
    metric          VARCHAR(32)  NOT NULL,   -- risk_score | total_eal | open_vulns | kev_count
    operator        VARCHAR(4)   DEFAULT '>=',
    threshold       NUMERIC(14, 2) NOT NULL,
    asset_id        UUID,
    severity        VARCHAR(16)  DEFAULT 'HIGH',  -- INFO | LOW | MEDIUM | HIGH | CRITICAL
    enabled         BOOLEAN      DEFAULT TRUE,
    created_at      TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.alert_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id     UUID REFERENCES public.alert_rules(id) ON DELETE SET NULL,
    metric      VARCHAR(32) NOT NULL,
    observed    NUMERIC(14, 2) NOT NULL,
    threshold   NUMERIC(14, 2) NOT NULL,
    severity    VARCHAR(16) NOT NULL,
    asset_id    UUID,
    payload     JSONB,
    fired_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_events_fired ON public.alert_events (fired_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON public.alert_rules (enabled);

-- Sensible zero-configuration defaults for a fresh deployment (idempotent).
INSERT INTO public.alert_rules (name, metric, threshold, severity)
SELECT 'Enterprise risk score breach', 'risk_score', 75, 'HIGH'
WHERE NOT EXISTS (SELECT 1 FROM public.alert_rules WHERE metric = 'risk_score');

INSERT INTO public.alert_rules (name, metric, threshold, severity)
SELECT 'Annualised loss breach', 'total_eal', 10000000.00, 'CRITICAL'
WHERE NOT EXISTS (SELECT 1 FROM public.alert_rules WHERE metric = 'total_eal');

INSERT INTO public.alert_rules (name, metric, threshold, severity)
SELECT 'Open critical/high flood', 'open_vulns', 25, 'MEDIUM'
WHERE NOT EXISTS (SELECT 1 FROM public.alert_rules WHERE metric = 'open_vulns');

INSERT INTO public.alert_rules (name, metric, threshold, severity)
SELECT 'Known-exploited-vuln spike', 'kev_count', 5, 'CRITICAL'
WHERE NOT EXISTS (SELECT 1 FROM public.alert_rules WHERE metric = 'kev_count');