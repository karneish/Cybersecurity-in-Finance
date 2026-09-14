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
-- inserts the three demo users. Safe to re-run (idempotent).
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

-- Demo users — password for ALL three accounts is: admin123
INSERT INTO auth.users (username, email, password_hash, full_name, role)
VALUES
('admin',   'admin@cyberrisk.local',   '$2a$10$8SSZvkJUyWc.SmHgtbxD3ueJiTYl3dtgeumA/55D6R1oIwfqBUgjy', 'System Admin',          'ADMIN'),
('ciso',    'ciso@cyberrisk.local',    '$2a$10$8SSZvkJUyWc.SmHgtbxD3ueJiTYl3dtgeumA/55D6R1oIwfqBUgjy', 'Chief InfoSec Officer', 'CISO'),
('analyst', 'analyst@cyberrisk.local', '$2a$10$8SSZvkJUyWc.SmHgtbxD3ueJiTYl3dtgeumA/55D6R1oIwfqBUgjy', 'Security Analyst',      'ANALYST')
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  full_name     = EXCLUDED.full_name,
  role          = EXCLUDED.role,
  is_active     = true;

-- Sanity check — expect 3 rows
SELECT username, role, is_active FROM auth.users ORDER BY username;