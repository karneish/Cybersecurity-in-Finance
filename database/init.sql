-- CyberRisk Quantifier — Schema Initialization
-- Run against NeonDB: creates all schemas

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS asset;
CREATE SCHEMA IF NOT EXISTS vuln;
CREATE SCHEMA IF NOT EXISTS control;
CREATE SCHEMA IF NOT EXISTS risk;
CREATE SCHEMA IF NOT EXISTS investment;

-- Allow Python services to access all schemas
-- (NeonDB connection uses public schema search_path + explicit schema prefixes)
