"""
CyberRisk Quantifier — NeonDB single-file setup generator.

Reads init.sql + all migrations + mock-data JSONs, reproduces the exact
deterministic seed from migrate_and_seed.py (including random.seed(42) risk
math), and emits ONE self-contained SQL file ready to paste into the NeonDB
SQL editor: database/neon_setup.sql

Run:  python database/generate_neon_setup.py
"""

import json
import random
import uuid
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MOCK_DIR = PROJECT_ROOT / "mock-data"
MIGRATIONS_DIR = PROJECT_ROOT / "database" / "migrations"
INIT_SQL = PROJECT_ROOT / "database" / "init.sql"
OUT_SQL = PROJECT_ROOT / "database" / "neon_setup.sql"

CONNECTION_STRING = (
    "postgresql://neondb_owner:npg_v90bkyJEYxjn@ep-solitary-base-b3t4dq9g-pooler.c-4."
    "ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
)


def asset_uuids():
    return {
        "PAY-SRV-001": uuid.UUID("00000001-0001-0001-0001-000000000001"),
        "CUST-DB-001": uuid.UUID("00000001-0001-0001-0001-000000000002"),
        "AUTH-IDP-001": uuid.UUID("00000001-0001-0001-0001-000000000003"),
        "WEB-APP-001": uuid.UUID("00000001-0001-0001-0001-000000000004"),
        "API-GW-001": uuid.UUID("00000001-0001-0001-0001-000000000005"),
        "EMAIL-SRV-001": uuid.UUID("00000001-0001-0001-0001-000000000006"),
        "BACKUP-SYS-001": uuid.UUID("00000001-0001-0001-0001-000000000007"),
        "CLOUD-MGMT-001": uuid.UUID("00000001-0001-0001-0001-000000000008"),
        "SIEM-SYS-001": uuid.UUID("00000001-0001-0001-0001-000000000009"),
        "DEV-ENV-001": uuid.UUID("00000001-0001-0001-0001-000000000010"),
        "DB-ANALYTICS-001": uuid.UUID("00000001-0001-0001-0001-000000000011"),
        "VPN-SRV-001": uuid.UUID("00000001-0001-0001-0001-000000000012"),
    }


def control_uuids(count):
    return [
        uuid.UUID(f"00000002-0001-0001-0001-{i + 1:012d}")
        for i in range(count)
    ]


def sql_literal(value):
    """Python value -> Postgres SQL literal."""
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return repr(value)
    if isinstance(value, uuid.UUID):
        return f"'{value}'"
    return "'" + str(value).replace("'", "''") + "'"


def load(name):
    with open(MOCK_DIR / name, "r", encoding="utf-8") as f:
        return json.load(f)


def seed_section():
    """Replicates migrate_and_seed.py seed logic → returns list of SQL strings."""
    amap = asset_uuids()
    assets = load("assets.json")
    controls = load("controls.json")
    vulns = load("vulnerabilities.json")
    out = []

    # ── Assets (mirrors seed_assets; governance cols filled in later UPDATE) ──
    rows = []
    for a in assets:
        uid = amap[a["id"]]
        rows.append(
            "({},{},{},{},{},{},{},{},{},{},{},{},{},{})".format(
                sql_literal(uid),
                sql_literal(a["name"]),
                sql_literal(a["asset_type"]),
                sql_literal(a["environment"]),
                sql_literal(a.get("owner")),
                sql_literal(a.get("department")),
                sql_literal(a.get("ip_address")),
                sql_literal(a.get("operating_system")),
                sql_literal(a["business_value_inr"]),
                sql_literal(a.get("replacement_cost_inr", 0)),
                sql_literal(a.get("internet_exposed", False)),
                sql_literal(a.get("criticality_score", 50)),
                sql_literal(a.get("data_sensitivity", "INTERNAL")),
                sql_literal(a.get("annual_revenue_impact", 0)),
            )
        )
    out.append(
        "INSERT INTO asset.assets (\n"
        "    id, name, asset_type, environment, owner, department, ip_address,\n"
        "    operating_system, business_value_inr, replacement_cost_inr,\n"
        "    internet_exposed, criticality_score, data_sensitivity, annual_revenue_impact\n"
        ") VALUES\n    " + ",\n    ".join(rows) + ";\n"
    )

    # ── Controls (mirrors seed_controls) ──
    ctrls = control_uuids(len(controls))
    rows = []
    for i, c in enumerate(controls):
        rows.append(
            "({},{},{},{},{},{},{},{})".format(
                sql_literal(ctrls[i]),
                sql_literal(c["name"]),
                sql_literal(c["control_type"]),
                sql_literal(c.get("description", "")),
                sql_literal(c["implementation_cost_inr"]),
                sql_literal(c.get("annual_maintenance_inr", 0)),
                sql_literal(c.get("max_risk_reduction", 0)),
                sql_literal(c.get("implementation_time_days", 30)),
            )
        )
    out.append(
        "INSERT INTO control.security_controls (\n"
        "    id, name, control_type, description, implementation_cost_inr,\n"
        "    annual_maintenance_inr, max_risk_reduction, implementation_time_days\n"
        ") VALUES\n    " + ",\n    ".join(rows) + ";\n"
    )

    # ── Vulnerabilities (mirrors seed_vulnerabilities) ──
    rows = []
    for v in vulns:
        auid = amap.get(v.get("affected_asset"))
        rows.append(
            "({},{},{},{},{},{},{},{},{},{},{},{})".format(
                sql_literal(v.get("cve_id")),
                sql_literal(v.get("cwe_id")),
                sql_literal(v["title"]),
                sql_literal(v.get("description", "")),
                sql_literal(v["cvss_score"]),
                sql_literal(v["severity"]),
                sql_literal(v.get("exploitability", 0)),
                sql_literal(auid if auid else None),
                sql_literal(v.get("internet_exposed", False)),
                sql_literal(v.get("status", "OPEN")),
                sql_literal(v.get("remediation", "")),
                sql_literal(v.get("source", "SCANNER")),
            )
        )
    out.append(
        "INSERT INTO vuln.vulnerabilities (\n"
        "    cve_id, cwe_id, title, description, cvss_score, severity,\n"
        "    exploitability, affected_asset, internet_exposed, status, remediation, source\n"
        ") VALUES\n    " + ",\n    ".join(rows) + ";\n"
    )

    # ── Asset-control pairs (mirrors seed_asset_controls) ──
    pairs = [
        ("AUTH-IDP-001", 0, "ACTIVE", 0.85, 0.90, 3),
        ("PAY-SRV-001", 4, "ACTIVE", 0.70, 0.80, 2),
        ("WEB-APP-001", 7, "ACTIVE", 0.75, 0.85, 3),
        ("WEB-APP-001", 2, "PLANNED", 0.0, 0.0, 0),
        ("CLOUD-MGMT-001", 3, "ACTIVE", 0.60, 0.70, 2),
        ("CUST-DB-001", 6, "ACTIVE", 0.80, 0.85, 3),
        ("API-GW-001", 7, "ACTIVE", 0.90, 0.95, 3),
        ("EMAIL-SRV-001", 0, "PLANNED", 0.0, 0.0, 0),
        ("EMAIL-SRV-001", 9, "PLANNED", 0.0, 0.0, 0),
        ("SIEM-SYS-001", 8, "ACTIVE", 0.70, 0.75, 2),
        ("BACKUP-SYS-001", 6, "ACTIVE", 0.85, 0.90, 3),
        ("VPN-SRV-001", 5, "ACTIVE", 0.65, 0.70, 2),
        ("DEV-ENV-001", 4, "PLANNED", 0.0, 0.0, 0),
        ("DB-ANALYTICS-001", 9, "PLANNED", 0.0, 0.0, 0),
    ]
    rows = []
    for sid, ci, status, cov, eff, mat in pairs:
        rows.append(
            "({},{},{},{},{},{})".format(
                sql_literal(amap[sid]),
                sql_literal(ctrls[ci]),
                sql_literal(status),
                sql_literal(cov),
                sql_literal(eff),
                sql_literal(mat),
            )
        )
    out.append(
        "INSERT INTO control.asset_controls (\n"
        "    asset_id, control_id, status, coverage_score, effectiveness_score, maturity_level\n"
        ") VALUES\n    " + ",\n    ".join(rows) + ";\n"
    )

    # ── Dependencies (mirrors seed_dependencies) ──
    deps = [
        ("API-GW-001", "AUTH-IDP-001", "AUTH", 90),
        ("API-GW-001", "CUST-DB-001", "DATA", 80),
        ("WEB-APP-001", "API-GW-001", "NETWORK", 85),
        ("WEB-APP-001", "AUTH-IDP-001", "AUTH", 90),
        ("PAY-SRV-001", "CUST-DB-001", "DATA", 95),
        ("PAY-SRV-001", "AUTH-IDP-001", "AUTH", 88),
        ("PAY-SRV-001", "API-GW-001", "NETWORK", 80),
        ("CUST-DB-001", "BACKUP-SYS-001", "INFRASTRUCTURE", 75),
        ("EMAIL-SRV-001", "AUTH-IDP-001", "AUTH", 70),
        ("CLOUD-MGMT-001", "AUTH-IDP-001", "AUTH", 85),
        ("CLOUD-MGMT-001", "SIEM-SYS-001", "MONITORING", 60),
        ("DB-ANALYTICS-001", "CUST-DB-001", "DATA", 85),
        ("DB-ANALYTICS-001", "BACKUP-SYS-001", "INFRASTRUCTURE", 60),
        ("SIEM-SYS-001", "API-GW-001", "LOG_SOURCE", 55),
        ("SIEM-SYS-001", "PAY-SRV-001", "LOG_SOURCE", 55),
        ("SIEM-SYS-001", "WEB-APP-001", "LOG_SOURCE", 55),
        ("BACKUP-SYS-001", "CLOUD-MGMT-001", "INFRASTRUCTURE", 65),
        ("VPN-SRV-001", "AUTH-IDP-001", "AUTH", 80),
    ]
    rows = []
    for s, t, d, c in deps:
        rows.append(
            "({},{},{},{})".format(
                sql_literal(amap[s]), sql_literal(amap[t]), sql_literal(d), sql_literal(c)
            )
        )
    out.append(
        "INSERT INTO asset.asset_dependencies (\n"
        "    asset_id, depends_on_id, dependency_type, criticality\n"
        ") VALUES\n    " + ",\n    ".join(rows) + ";\n"
    )

    # ── Risk calculations (mirrors seed_risk_calculations, random.seed(42)) ──
    random.seed(42)
    asset_vuln_count = {}
    for v in vulns:
        a = v["affected_asset"]
        asset_vuln_count[a] = asset_vuln_count.get(a, 0) + 1

    risk_details = {}
    rows = []
    for a in assets:
        aid = a["id"]
        uid = amap[aid]
        vuln_count = asset_vuln_count.get(aid, 0)
        criticality = a.get("criticality_score", 50)
        biz_value = a["business_value_inr"]
        rand_p = random.uniform(0.05, 0.15)
        rand_i = random.uniform(0.3, 0.7)
        rand_c = random.uniform(0.1, 0.3)
        base_prob = min(0.95, vuln_count * 0.12 + rand_p)
        impact = biz_value * (criticality / 100.0) * rand_i
        eal = base_prob * impact
        risk_score = min(
            100,
            base_prob * 40
            + (impact / biz_value * 100 if biz_value > 0 else 0) * 0.35
            + criticality * 0.25,
        )
        if risk_score >= 75:
            category = "CRITICAL"
        elif risk_score >= 50:
            category = "HIGH"
        elif risk_score >= 25:
            category = "MEDIUM"
        else:
            category = "LOW"
        risk_details[aid] = {
            "risk_score": round(risk_score, 2),
            "base_prob": round(base_prob, 4),
            "impact": round(impact, 2),
            "eal": round(eal, 2),
            "category": category,
            "control_reduction": round(rand_c, 4),
            "residual": round(eal * 0.7, 2),
        }
        rows.append(
            "({},{},{},{},{},{},{},{},{})".format(
                sql_literal(uid),
                sql_literal(risk_details[aid]["risk_score"]),
                sql_literal(risk_details[aid]["base_prob"]),
                sql_literal(risk_details[aid]["impact"]),
                sql_literal(risk_details[aid]["eal"]),
                sql_literal(risk_details[aid]["category"]),
                sql_literal(json.dumps({"vulnCount": vuln_count, "criticality": criticality})),
                sql_literal(risk_details[aid]["control_reduction"]),
                sql_literal(risk_details[aid]["residual"]),
            )
        )
    out.append(
        "INSERT INTO risk.risk_calculations (\n"
        "    asset_id, risk_score, probability, financial_impact_inr,\n"
        "    expected_annual_loss, risk_category, risk_factors,\n"
        "    control_reduction, residual_risk\n"
        ") VALUES\n    " + ",\n    ".join(rows) + ";\n"
    )

    # ── Historical snapshots (mirrors seed_risk_snapshots) ──
    base_eal = sum(d["eal"] for d in risk_details.values())
    base_vulns = sum(1 for v in vulns if v.get("status", "OPEN") in ("OPEN", "IN_PROGRESS"))
    base_score = sum(d["risk_score"] for d in risk_details.values()) / len(risk_details)

    snap_rows = []
    for back in range(24, -1, -1):
        growth = 1.0 + 0.0035 * back
        eal = round(base_eal * growth, 2)
        vn = int(base_vulns * (1.0 + 0.005 * back))
        score = round(min(100, base_score + 0.1 * back), 2)
        ctl = 5 + (back // 2)
        snap_rows.append(
            "({},{},{},{},CURRENT_DATE - {})".format(
                repr(score), repr(eal), ctl, vn, 7 * back
            )
        )
    out.append(
        "INSERT INTO risk.risk_snapshots (\n"
        "    risk_score, expected_annual_loss, total_controls_active,\n"
        "    total_vulns_open, snapshot_date\n"
        ") VALUES\n    " + ",\n    ".join(snap_rows) + ";\n"
    )

    # ── Governance: agencies (mirrors seed_governance) ──
    agencies = [
        ("National Payments Corp", "PSU", "BANKING", "WEST", "RESTRICTED"),
        ("Telecom Infrastructure Ministry", "GOVT", "TELECOM", "NORTH", "CONFIDENTIAL"),
        ("Digital Health Authority", "GOVT", "HEALTH", "SOUTH", "CONFIDENTIAL"),
    ]
    agency_ids = {}
    for i, (name, atype, sector, region, classification) in enumerate(agencies):
        aid = uuid.UUID(f"00000004-0001-0001-0001-{i + 1:012d}")
        agency_ids[name] = aid
        out.append(
            "INSERT INTO gov.agencies (id, name, agency_type, sector, region, classification)\n"
            f"VALUES ({sql_literal(aid)}, {sql_literal(name)}, {sql_literal(atype)}, "
            f"{sql_literal(sector)}, {sql_literal(region)}, {sql_literal(classification)})\n"
            "ON CONFLICT (id) DO NOTHING;\n"
        )
        out.append(
            "UPDATE gov.agencies\n"
            f"SET agency_type = {sql_literal(atype)}, sector = {sql_literal(sector)},\n"
            f"    region = {sql_literal(region)}, classification = {sql_literal(classification)}\n"
            f"WHERE id = {sql_literal(aid)};\n"
        )

    # ── Sector profiles ──
    profiles = [
        ("BANKING", "Banking & Payments", "RBI", 50.0, 1.20),
        ("TELECOM", "Telecommunications & Networks", "TRAI", 30.0, 1.00),
        ("HEALTH", "Healthcare & Public Health", "IRDAI + DPDP Act", 40.0, 1.10),
    ]
    for sector, name, regulator, threshold, weight in profiles:
        out.append(
            "INSERT INTO gov.sector_profiles (sector, sector_name, regulator, threshold_critical_mln, weight)\n"
            f"VALUES ({sql_literal(sector)}, {sql_literal(name)}, {sql_literal(regulator)}, "
            f"{sql_literal(threshold)}, {sql_literal(weight)})\n"
            "ON CONFLICT (sector) DO UPDATE SET\n"
            "    sector_name = EXCLUDED.sector_name, regulator = EXCLUDED.regulator,\n"
            f"    threshold_critical_mln = EXCLUDED.threshold_critical_mln, weight = EXCLUDED.weight;\n"
        )

    # ── Asset governance tags (UPDATE) ──
    tags = {
        "PAY-SRV-001": ("BANKING", "WEST", "National Payments Corp", True, "RESTRICTED"),
        "CUST-DB-001": ("BANKING", "WEST", "National Payments Corp", True, "RESTRICTED"),
        "AUTH-IDP-001": ("BANKING", "WEST", "National Payments Corp", True, "CONFIDENTIAL"),
        "WEB-APP-001": ("BANKING", "WEST", "National Payments Corp", True, "CONFIDENTIAL"),
        "API-GW-001": ("BANKING", "WEST", "National Payments Corp", True, "CONFIDENTIAL"),
        "CLOUD-MGMT-001": ("BANKING", "CENTRAL", "National Payments Corp", True, "RESTRICTED"),
        "EMAIL-SRV-001": ("TELECOM", "NORTH", "Telecom Infrastructure Ministry", False, "CONFIDENTIAL"),
        "VPN-SRV-001": ("TELECOM", "NORTH", "Telecom Infrastructure Ministry", False, "CONFIDENTIAL"),
        "SIEM-SYS-001": ("HEALTH", "SOUTH", "Digital Health Authority", True, "RESTRICTED"),
        "BACKUP-SYS-001": ("HEALTH", "SOUTH", "Digital Health Authority", True, "CONFIDENTIAL"),
        "DEV-ENV-001": ("HEALTH", "SOUTH", "Digital Health Authority", False, "INTERNAL"),
        "DB-ANALYTICS-001": ("HEALTH", "EAST", "Digital Health Authority", True, "RESTRICTED"),
    }
    for sid, (sector, region, agency, is_ci, classification) in tags.items():
        out.append(
            "UPDATE asset.assets\n"
            f"SET sector = {sql_literal(sector)}, region = {sql_literal(region)},\n"
            f"    agency_id = {sql_literal(agency_ids[agency])},\n"
            f"    is_critical_infra = {sql_literal(is_ci)}, classification = {sql_literal(classification)}\n"
            f"WHERE id = {sql_literal(amap[sid])};\n"
        )

    # ── Vendors ──
    vendors = [
        ("CorePay Cloud Services", "CLOUD", 90, 50000000, "BANKING", "WEST", 0.65),
        ("NetSec Managed Security", "MSP", 72, 20000000, "TELECOM", "NORTH", 0.55),
        ("MedLens Data Processor", "SAAS", 60, 15000000, "HEALTH", "SOUTH", 0.72),
    ]
    vendor_ids = {}
    for i, (name, vtype, crit, value, sector, region, assessment) in enumerate(vendors):
        vid = uuid.UUID(f"00000003-0001-0001-0001-{i + 1:012d}")
        vendor_ids[name] = vid
        out.append(
            "INSERT INTO gov.vendors (\n"
            "    id, name, vendor_type, criticality_score, business_value_inr,\n"
            "    sector, region, assessment_score, last_assessed_at\n"
            f") VALUES ({sql_literal(vid)}, {sql_literal(name)}, {sql_literal(vtype)}, "
            f"{sql_literal(crit)}, {sql_literal(value)}, {sql_literal(sector)}, "
            f"{sql_literal(region)}, {sql_literal(assessment)}, CURRENT_TIMESTAMP - INTERVAL '30 days')\n"
            "ON CONFLICT (id) DO NOTHING;\n"
        )
        out.append(
            "UPDATE gov.vendors\n"
            f"SET vendor_type = {sql_literal(vtype)}, criticality_score = {sql_literal(crit)},\n"
            f"    business_value_inr = {sql_literal(value)}, sector = {sql_literal(sector)},\n"
            f"    region = {sql_literal(region)}, assessment_score = {sql_literal(assessment)},\n"
            f"    last_assessed_at = CURRENT_TIMESTAMP - INTERVAL '30 days'\n"
            f"WHERE id = {sql_literal(vid)};\n"
        )

    # ── Vendor → asset map ──
    links = [
        ("CorePay Cloud Services", "PAY-SRV-001", "Payments platform", 0.60),
        ("CorePay Cloud Services", "CUST-DB-001", "Data services", 0.40),
        ("NetSec Managed Security", "AUTH-IDP-001", "Identity monitoring", 0.50),
        ("NetSec Managed Security", "API-GW-001", "Perimeter defense", 0.30),
        ("NetSec Managed Security", "EMAIL-SRV-001", "Email security", 0.40),
        ("NetSec Managed Security", "SIEM-SYS-001", "SIEM operations", 0.30),
        ("MedLens Data Processor", "DB-ANALYTICS-001", "Analytics aggregation", 0.50),
        ("MedLens Data Processor", "DEV-ENV-001", "Dev tooling", 0.30),
    ]
    rows = []
    for vname, sid, service, share in links:
        rows.append(
            "({},{},{},{})".format(
                sql_literal(amap[sid]),
                sql_literal(vendor_ids[vname]),
                sql_literal(service),
                sql_literal(share),
            )
        )
    out.append(
        "INSERT INTO gov.asset_vendors (asset_id, vendor_id, service_type, risk_share)\n"
        "VALUES\n    " + ",\n    ".join(rows) + ";\n"
    )

    # ── Historical exercise: baseline = BANKING-sector EAL ──
    banking_assets = [
        "PAY-SRV-001", "CUST-DB-001", "AUTH-IDP-001", "WEB-APP-001", "API-GW-001"
    ]
    baseline = sum(risk_details[a]["eal"] for a in banking_assets)
    surge_mult = 1.38
    simulated = baseline * surge_mult
    out.append(
        "INSERT INTO gov.exercises (\n"
        "    id, name, scenario_key, impact_scope, sector, region,\n"
        "    baseline_eal, simulated_eal, eal_reduction, eal_reduction_percent, status\n"
        f") VALUES ('00000005-0001-0001-0001-000000000001',\n"
        "    'Drill — Ransomware Surge (Banking Sector)',\n"
        f"    'RANSOMWARE', 'SECTOR', 'BANKING', 'WEST',\n"
        f"    {repr(round(baseline, 2))}, {repr(round(simulated, 2))},\n"
        f"    {repr(round(simulated - baseline, 2))}, {repr(round((surge_mult - 1) * 100, 2))},\n"
        "    'COMPLETED');\n"
    )

    # ── Early warnings ──
    out.append(
        "INSERT INTO gov.early_warnings (\n"
        "    warning_type, target_type, target_id, severity, title, description,\n"
        "    threshold_value, current_value, status\n"
        ") VALUES (\n"
        "    'EAL_SPIKE', 'SECTOR', 'BANKING', 'HIGH',\n"
        "    'Banking sector EAL trending past RBI critical threshold',\n"
        "    'Aggregate banking-sector expected annual loss exceeds Rs. 5 Cr threshold. "
        "Recommended: prioritise payments-critical assets in the next budget cycle.',\n"
        f"    50000000.0, {repr(baseline)}, 'OPEN');\n"
        "INSERT INTO gov.early_warnings (\n"
        "    warning_type, target_type, target_id, severity, title, description,\n"
        "    threshold_value, current_value, status\n"
        ") VALUES (\n"
        "    'VENDOR_RISK', 'VENDOR', 'NetSec Managed Security', 'MEDIUM',\n"
        "    'Third-party assessment below acceptance threshold',\n"
        "    'NetSec assessment score (0.55) is below the 0.60 acceptance bar. "
        "Schedule reassessment and review privileged access the MSP holds.',\n"
        "    0.60, 0.55, 'OPEN');\n"
    )

    # ── Data sources ──
    sources = [
        ("NESSUS", "Tenable Nessus Scanner", "SCANNER", "CONNECTED",
         "Vulnerability scans across 1,200+ hosts; 1,582 findings ingested this week.",
         "'2 hours'", 1421, 0),
        ("CROWDSTRIKE", "CrowdStrike Falcon EDR", "EDR", "CONNECTED",
         "Endpoint detection and response telemetry for all production endpoints.",
         "'5 minutes'", 3248, 1),
        ("DEFENDER_ENDPOINT", "Microsoft Defender for Endpoint", "EDR", "ACTIVE",
         "Endpoint signals fused into asset risk attribution for Windows estate.",
         "'12 minutes'", 1890, 0),
        ("SPLUNK", "Splunk SIEM", "SIEM", "CONNECTED",
         "Correlated security events; 4-minute ingestion SLA for alert pivots.",
         "'4 minutes'", 15204, 2),
        ("WAF_LOGS", "WAF / CDN Edge Logs", "WEB", "CONNECTED",
         "Web application firewall and CDN edge request logs (1h batches).",
         "'1 hour'", 88742, 0),
        ("JSON_BATCH", "Generic JSON Batch", "FILE", "CONFIGURED",
         "Landing zone for vendor/regulator JSON payloads via ingestion API.",
         "NULL", 0, 0),
        ("CSV_BATCH", "Generic CSV Batch", "FILE", "CONFIGURED",
         "Landing zone for flat-file asset/inventory exports.",
         "NULL", 0, 0),
    ]
    rows = []
    for key, name, ctype, status, desc, ago, records, errors in sources:
        last_at = f"CURRENT_TIMESTAMP - INTERVAL {ago}" if ago != "NULL" else "NULL"
        rows.append(
            "({},{},{},{},{},{},{},{})".format(
                sql_literal(key), sql_literal(name), sql_literal(ctype),
                sql_literal(status), sql_literal(desc), last_at,
                sql_literal(records), sql_literal(errors),
            )
        )
    out.append(
        "INSERT INTO public.data_sources (\n"
        "    source_key, name, connector_type, status, description,\n"
        "    last_ingested_at, records_ingested, error_count\n"
        ") VALUES\n    " + ",\n    ".join(rows) + ";\n"
    )

    return out


def main():
    sql = []
    sql.append(
        "-- CyberRisk Quantifier — NeonDB FULL SETUP (schema + all seed data)\n"
        "-- Generated by database/generate_neon_setup.py\n"
        "-- Paste the ENTIRE file into the NeonDB SQL editor and run once.\n"
        "--\n"
        "-- Target database:\n"
        f"--   {CONNECTION_STRING}\n"
        "--\n"
        "-- What this does:\n"
        "--   1. Creates schemas: auth, asset, vuln, control, risk, investment, gov\n"
        "--   2. Applies migrations 001–012 (all tables, indexes, functions, alert rules)\n"
        "--   3. Seeds: 3 demo users, 12 assets, 10 controls, 15 vulnerabilities,\n"
        "--      14 asset-control links, 18 dependencies, risk calculations for every\n"
        "--      asset, 25 weekly historical snapshots, 3 agencies, 3 sector profiles,\n"
        "--      3 vendors, 8 vendor links, 1 cyber-drill exercise, 2 early warnings,\n"
        "--      and 7 ingestion data sources.\n"
        "--\n"
        "-- Intended for a ONE-TIME run on a fresh (empty) database. Schemas use\n"
        "-- IF NOT EXISTS but core seed inserts (assets, vulnerabilities, risk\n"
        "-- calculations, snapshots) are plain INSERTs, so do not re-run on an\n"
        "-- already-seeded database.\n"
        "--\n"
        "-- Demo logins (password for all three: Scro@2026!):\n"
        "--   scro_regulator / regulator@scro.gov.in  -> CISO\n"
        "--   scro_banker    / banker@scro.gov.in     -> ANALYST\n"
        "--   scro_auditor   / auditor@scro.gov.in    -> ANALYST\n"
    )

    sql.append("\n-- ======================================================================")
    sql.append("-- PART 1 · SCHEMA INITIALIZATION (init.sql)")
    sql.append("-- ======================================================================\n")
    with open(INIT_SQL, "r", encoding="utf-8") as f:
        sql.append(f.read().rstrip())
    sql.append("")

    migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    for m in migration_files:
        sql.append("\n-- ======================================================================")
        sql.append(f"-- MIGRATION · {m.name}")
        sql.append("-- ======================================================================\n")
        with open(m, "r", encoding="utf-8") as f:
            sql.append(f.read().rstrip())
        sql.append("")

    sql.append("\n-- ======================================================================")
    sql.append("-- PART 2 · SEED DATA (mirrors database/migrate_and_seed.py)")
    sql.append("-- ======================================================================\n")
    sql.extend(seed_section())

    sql.append("\n-- ======================================================================")
    sql.append("-- PART 3 · VERIFICATION (run these after the setup to confirm)")
    sql.append("-- ======================================================================\n")
    sql.append(
        "SELECT 'auth.users' AS table_name, COUNT(*) AS rows FROM auth.users\n"
        "UNION ALL SELECT 'asset.assets', COUNT(*) FROM asset.assets\n"
        "UNION ALL SELECT 'control.security_controls', COUNT(*) FROM control.security_controls\n"
        "UNION ALL SELECT 'vuln.vulnerabilities', COUNT(*) FROM vuln.vulnerabilities\n"
        "UNION ALL SELECT 'control.asset_controls', COUNT(*) FROM control.asset_controls\n"
        "UNION ALL SELECT 'asset.asset_dependencies', COUNT(*) FROM asset.asset_dependencies\n"
        "UNION ALL SELECT 'risk.risk_calculations', COUNT(*) FROM risk.risk_calculations\n"
        "UNION ALL SELECT 'risk.risk_snapshots', COUNT(*) FROM risk.risk_snapshots\n"
        "UNION ALL SELECT 'gov.agencies', COUNT(*) FROM gov.agencies\n"
        "UNION ALL SELECT 'gov.sector_profiles', COUNT(*) FROM gov.sector_profiles\n"
        "UNION ALL SELECT 'gov.vendors', COUNT(*) FROM gov.vendors\n"
        "UNION ALL SELECT 'gov.asset_vendors', COUNT(*) FROM gov.asset_vendors\n"
        "UNION ALL SELECT 'gov.exercises', COUNT(*) FROM gov.exercises\n"
        "UNION ALL SELECT 'gov.early_warnings', COUNT(*) FROM gov.early_warnings\n"
        "UNION ALL SELECT 'public.data_sources', COUNT(*) FROM public.data_sources\n"
        "UNION ALL SELECT 'public.alert_rules', COUNT(*) FROM public.alert_rules\n"
        "ORDER BY table_name;"
    )

    output = "\n".join(sql) + "\n"
    OUT_SQL.write_text(output, encoding="utf-8")
    print(f"Wrote {OUT_SQL} ({len(output):,} chars, {output.count(chr(10))} lines)")


if __name__ == "__main__":
    main()