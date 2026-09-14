-- Migration 001: Auth tables

CREATE TABLE IF NOT EXISTS auth.users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(50) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255),
    role            VARCHAR(20) NOT NULL DEFAULT 'ANALYST',
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth.audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES auth.users(id),
    action          VARCHAR(100) NOT NULL,
    resource_type   VARCHAR(50),
    resource_id     VARCHAR(50),
    details         TEXT,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON auth.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON auth.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON auth.audit_logs(created_at DESC);

-- Seed default admin user (password: admin123 — BCrypt hash)
INSERT INTO auth.users (username, email, password_hash, full_name, role)
VALUES ('admin', 'admin@cyberrisk.local', '$2a$10$8SSZvkJUyWc.SmHgtbxD3ueJiTYl3dtgeumA/55D6R1oIwfqBUgjy', 'System Admin', 'ADMIN')
ON CONFLICT (username) DO NOTHING;

INSERT INTO auth.users (username, email, password_hash, full_name, role)
VALUES ('ciso', 'ciso@cyberrisk.local', '$2a$10$8SSZvkJUyWc.SmHgtbxD3ueJiTYl3dtgeumA/55D6R1oIwfqBUgjy', 'Chief InfoSec Officer', 'CISO')
ON CONFLICT (username) DO NOTHING;

INSERT INTO auth.users (username, email, password_hash, full_name, role)
VALUES ('analyst', 'analyst@cyberrisk.local', '$2a$10$8SSZvkJUyWc.SmHgtbxD3ueJiTYl3dtgeumA/55D6R1oIwfqBUgjy', 'Security Analyst', 'ANALYST')
ON CONFLICT (username) DO NOTHING;
