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

-- Seed the three SCRO demo users.
--   scro_regulator -> CISO  (regulatory oversight / national access)
--   scro_banker     -> ANALYST (sector operations)
--   scro_auditor    -> ANALYST (national audit & assurance)
-- Password for all three accounts is: Scro@2026!
INSERT INTO auth.users (username, email, password_hash, full_name, role)
VALUES ('scro_regulator', 'regulator@scro.gov.in', '$2b$10$iiW3oECAzxyM1Mh674EVle..tTrqD4Rv141BmywmZgmjvFITKi8oW', 'Regulatory Oversight', 'CISO')
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = true;

INSERT INTO auth.users (username, email, password_hash, full_name, role)
VALUES ('scro_banker', 'banker@scro.gov.in', '$2b$10$iiW3oECAzxyM1Mh674EVle..tTrqD4Rv141BmywmZgmjvFITKi8oW', 'Banking Sector Officer', 'ANALYST')
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = true;

INSERT INTO auth.users (username, email, password_hash, full_name, role)
VALUES ('scro_auditor', 'auditor@scro.gov.in', '$2b$10$iiW3oECAzxyM1Mh674EVle..tTrqD4Rv141BmywmZgmjvFITKi8oW', 'National Security Auditor', 'ANALYST')
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = true;

-- Only the three SCRO demo users may log in — any legacy user is disabled.
UPDATE auth.users SET is_active = false
WHERE username IN ('admin', 'ciso', 'analyst');
