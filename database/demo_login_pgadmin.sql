-- ============================================================================
-- Quick pgAdmin4 fix — make demo login work on http://localhost:3000
-- ----------------------------------------------------------------------------
-- How to use:
--   1. Open pgAdmin4 -> connect to your PostgreSQL server
--   2. Server -> Databases -> pick the 'cyberrisk' database (or the one in
--      .env DATABASE_URL / docker-compose.yml)
--   3. Right-click the database -> Query Tool
--   4. Paste this whole script and press F5 / Execute
--
-- This creates the auth schema + users/audit_logs tables (if missing) and
-- seeds exactly the three SCRO demo users, disabling every other account.
-- Safe to re-run (idempotent).
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS auth;

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

-- Demo users — password for ALL three accounts is: Scro@2026!
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

UPDATE auth.users SET is_active = false
WHERE username IN ('admin', 'ciso', 'analyst');

-- Sanity check — expect exactly 3 active users
SELECT username, role, is_active FROM auth.users ORDER BY username;