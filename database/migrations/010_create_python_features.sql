-- Migration 010: Refresh-token rotation, normalized event ledger, and the
-- RAG compliance corpus (pgvector embeddings stored as JSONB for portability).

-- ─── Refresh-token rotation ledger ───────────────────────────
CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(128) NOT NULL UNIQUE,
    family_id   UUID NOT NULL DEFAULT gen_random_uuid(),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMP NOT NULL,
    revoked_at  TIMESTAMP,
    replaced_by UUID
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON auth.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON auth.refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON auth.refresh_tokens(revoked_at)
    WHERE revoked_at IS NULL;

-- ─── Normalized ingestion event ledger ───────────────────────
CREATE TABLE IF NOT EXISTS public.security_events (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type   VARCHAR(50) NOT NULL,
    source_asset UUID,
    source       VARCHAR(50) NOT NULL,
    details      TEXT,
    timestamp    TIMESTAMP NOT NULL DEFAULT NOW(),
    processed    BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_asset ON public.security_events(source_asset);
CREATE INDEX IF NOT EXISTS idx_security_events_ts ON public.security_events(timestamp DESC);

-- ─── RAG compliance corpus ───────────────────────────────────
-- embeddings are stored as JSONB for portability; try to enable pgvector
-- where available but never let its absence abort the migration.
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension unavailable; embeddings retained as JSONB';
END $$;

CREATE TABLE IF NOT EXISTS gov.compliance_docs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    framework   VARCHAR(50) NOT NULL,
    category    VARCHAR(100),
    title       VARCHAR(255) NOT NULL,
    content     TEXT NOT NULL,
    reference   VARCHAR(255),
    embedding   JSONB,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_docs_framework ON gov.compliance_docs(framework);