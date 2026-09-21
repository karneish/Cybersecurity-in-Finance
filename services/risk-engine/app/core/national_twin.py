"""Sovereign Cyber-Risk Observatory twin engine.

Rolls quantified cyber risk up through asset → agency → sector → region → nation.
All aggregation reuses the existing RiskCalculator math — no new risk math here.
"""
from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.asset import Asset, SecurityControl, AssetControl
from app.models.gov import Agency, SectorProfile, EarlyWarning
from app.core.risk_calculator import RiskCalculator
from app.core.confidence import DataQualityEngine
from app.core.compliance import ComplianceMapper
from app.core.audit_chain import AuditChain

ACTIVE_CONTROL_STATUSES = ("ACTIVE", "VERIFIED", "IMPLEMENTED")


class SovereignTwin:
    """National digital-twin aggregations for the Ministry / CERT-In persona."""

    def __init__(self, db: Session):
        self.db = db
        self.risk_calc = RiskCalculator(db)
        self.quality = DataQualityEngine(db)
        self._risk_cache: dict[str, dict] = {}
        self._coverage_cache: dict[str, float] = {}
        self._confidence_cache: dict[str, float] = {}

    # ── low-level helpers (memoized per request) ───────────────────────
    def _risk(self, asset_id: str) -> dict:
        if asset_id not in self._risk_cache:
            risk = self.risk_calc.calculate_asset_risk(asset_id)
            self._risk_cache[asset_id] = risk or {}
        return self._risk_cache[asset_id]

    def _control_types(self) -> list[str]:
        rows = self.db.query(SecurityControl.control_type).distinct().all()
        return [r[0] for r in rows]

    def _active_control_count(self, asset_id: str) -> int:
        return (
            self.db.query(AssetControl)
            .filter(
                AssetControl.asset_id == asset_id,
                AssetControl.status.in_(ACTIVE_CONTROL_STATUSES),
            )
            .count()
        )

    def _control_coverage(self, asset_id: str, total_types: int) -> float:
        if asset_id not in self._coverage_cache:
            if total_types == 0:
                self._coverage_cache[asset_id] = 0.0
            else:
                self._coverage_cache[asset_id] = self._active_control_count(asset_id) / total_types
        return self._coverage_cache[asset_id]

    def _data_confidence(self, asset_id: str) -> float:
        if asset_id not in self._confidence_cache:
            quality = self.quality.asset_quality(asset_id)
            value = 0.0 if "error" in quality else float(quality.get("confidence_percent", 0) or 0)
            self._confidence_cache[asset_id] = value
        return self._confidence_cache[asset_id]

    def _sector_assets(self, sector: str) -> list[Asset]:
        return (
            self.db.query(Asset)
            .filter(Asset.sector == sector)
            .order_by(Asset.name)
            .all()
        )

    # ── roll-ups ───────────────────────────────────────────────────────
    def sectors(self) -> list[dict]:
        """Per-sector rollups: EAL, score, vuln counts, coverage, SRI."""
        total_types = len(self._control_types())
        assets = self.db.query(Asset).all()
        national_eal = sum(
            self._risk(str(a.id)).get("expected_annual_loss", 0) for a in assets
        ) or 1.0

        buckets = defaultdict(list)
        for asset in assets:
            buckets[asset.sector or "UNASSIGNED"].append(asset)

        rollups = []
        for sector, sector_assets in sorted(buckets.items()):
            rollups.append(self._sector_rollup(sector, sector_assets, national_eal, total_types))
        rollups.sort(key=lambda r: r["expected_annual_loss"], reverse=True)
        return rollups

    def _sector_rollup(self, sector: str, assets: list[Asset], national_eal: float,
                       total_types: int) -> dict:
        total_eal = 0.0
        scores = []
        ci_assets = []
        vuln_count = 0
        coverage_sum = 0.0
        confidence_sum = 0.0

        for asset in assets:
            risk = self._risk(str(asset.id))
            eal = float(risk.get("expected_annual_loss", 0))
            total_eal += eal
            if risk.get("risk_score") is not None:
                scores.append(float(risk["risk_score"]))
            vuln_count += int(risk.get("risk_factors", {}).get("open_vulns", 0))
            coverage_sum += self._control_coverage(str(asset.id), total_types)
            confidence_sum += self._data_confidence(str(asset.id))
            if asset.is_critical_infra:
                vulns_open = int(risk.get("risk_factors", {}).get("open_vulns", 0))
                ci_assets.append({
                    "asset_id": str(asset.id),
                    "asset_name": asset.name,
                    "expected_annual_loss": round(eal, 2),
                    "open_vulns": vulns_open,
                })

        asset_count = len(assets) or 1
        avg_score = sum(scores) / len(scores) if scores else 0.0
        avg_coverage = coverage_sum / asset_count
        avg_confidence = confidence_sum / asset_count

        profile = self.db.query(SectorProfile).filter(SectorProfile.sector == sector).first()
        weight = float(profile.weight) if profile and profile.weight is not None else 1.0
        threshold_mln = float(profile.threshold_critical_mln) if profile and profile.threshold_critical_mln else 0
        regulator = profile.regulator if profile else None

        sri = self._sri(avg_score, total_eal, national_eal, avg_coverage, avg_confidence)

        return {
            "sector": sector,
            "sector_name": profile.sector_name if profile else sector,
            "regulator": regulator,
            "sector_weight": weight,
            "asset_count": len(assets),
            "critical_infra_count": len(ci_assets),
            "expected_annual_loss": round(total_eal, 2),
            "eal_share_percent": round(total_eal / national_eal * 100, 2) if national_eal else 0,
            "average_risk_score": round(avg_score, 2),
            "control_coverage_percent": round(avg_coverage * 100, 1),
            "data_confidence_percent": round(avg_confidence, 1),
            "open_vuln_count": vuln_count,
            "sovereign_risk_index": round(sri, 1),
            "threshold_critical_mln": threshold_mln,
            "threshold_exceeded": bool(threshold_mln and total_eal / 1_000_000 > threshold_mln),
            "critical_infra_assets": sorted(
                ci_assets, key=lambda x: -x["expected_annual_loss"]
            ),
        }

    def regions(self, sector: str | None = None) -> dict:
        """Per-region rollups as an ECharts heatmap payload (D1, no geojson)."""
        assets = self.db.query(Asset).all()
        if sector:
            assets = [a for a in assets if a.sector == sector]

        buckets = defaultdict(list)
        for asset in assets:
            buckets[asset.region or "UNKNOWN"].append(asset)

        region_rows = []
        matrix = []
        row_index = {}
        sector_index = {}
        col_names = []
        region_totals = {}

        for region, region_assets in sorted(buckets.items()):
            row_index[region] = len(region_rows)
            sector_bucket = defaultdict(float)
            region_eal = 0.0
            for asset in region_assets:
                eal = float(self._risk(str(asset.id)).get("expected_annual_loss", 0))
                sector_key = asset.sector or "UNASSIGNED"
                sector_bucket[sector_key] += eal
                region_eal += eal
                if sector_key not in sector_index:
                    sector_index[sector_key] = len(col_names)
                    col_names.append(sector_key)
            region_totals[region] = round(region_eal, 2)
            region_rows.append({
                "region": region,
                "sectors": [bucket for bucket in sector_bucket],
                "expected_annual_loss": round(region_eal, 2),
            })

        for region, region_assets in sorted(buckets.items()):
            for asset in region_assets:
                sector_key = asset.sector or "UNASSIGNED"
                if sector_key not in sector_index:  # pragma: no cover
                    sector_index[sector_key] = len(col_names)
                    col_names.append(sector_key)
        for region, region_assets in sorted(buckets.items()):
            col_sums = defaultdict(float)
            for asset in region_assets:
                col_sums[asset.sector or "UNASSIGNED"] += float(
                    self._risk(str(asset.id)).get("expected_annual_loss", 0)
                )
            for col, eal in col_sums.items():
                matrix.append([row_index[region], sector_index[col], round(eal, 2)])

        return {
            "regions": [r["region"] for r in region_rows],
            "sectors": col_names,
            "region_totals": {
                r["region"]: r["expected_annual_loss"] for r in region_rows
            },
            "matrix": matrix,
            "national_total_eal": round(sum(region_totals.values()), 2),
        }

    def agencies(self) -> list[dict]:
        """Per-agency rollups plus their asset populations (hierarchy)."""
        agencies = self.db.query(Agency).order_by(Agency.name).all()
        rows = []
        for agency in agencies:
            agency_assets = (
                self.db.query(Asset)
                .filter(Asset.agency_id == agency.id)
                .order_by(Asset.name)
                .all()
            )
            total_eal = 0.0
            assets_payload = []
            for asset in agency_assets:
                risk = self._risk(str(asset.id))
                eal = float(risk.get("expected_annual_loss", 0))
                total_eal += eal
                assets_payload.append({
                    "asset_id": str(asset.id),
                    "asset_name": asset.name,
                    "sector": asset.sector,
                    "critical_infra": bool(asset.is_critical_infra),
                    "expected_annual_loss": round(eal, 2),
                    "risk_score": float(risk.get("risk_score", 0)),
                })
            rows.append({
                "agency_id": str(agency.id),
                "name": agency.name,
                "agency_type": agency.agency_type,
                "sector": agency.sector,
                "region": agency.region,
                "classification": agency.classification,
                "parent_agency_id": str(agency.parent_agency_id) if agency.parent_agency_id else None,
                "asset_count": len(assets_payload),
                "critical_infra_count": sum(1 for a in assets_payload if a["critical_infra"]),
                "expected_annual_loss": round(total_eal, 2),
                "assets": sorted(assets_payload, key=lambda x: -x["expected_annual_loss"]),
            })
        rows.sort(key=lambda r: -r["expected_annual_loss"])
        return rows

    def summary(self) -> dict:
        """National totals + top sectors + top critical-infrastructure assets."""
        assets = self.db.query(Asset).all()
        total_eal = 0.0
        scores = []
        ci_assets = []
        vuln_total = 0

        for asset in assets:
            risk = self._risk(str(asset.id))
            eal = float(risk.get("expected_annual_loss", 0))
            total_eal += eal
            if risk.get("risk_score") is not None:
                scores.append(float(risk["risk_score"]))
            vuln_total += int(risk.get("risk_factors", {}).get("open_vulns", 0))
            if asset.is_critical_infra:
                ci_assets.append({
                    "asset_id": str(asset.id),
                    "asset_name": asset.name,
                    "sector": asset.sector,
                    "expected_annual_loss": round(eal, 2),
                })

        sector_rollups = self.sectors()
        total_types = len(self._control_types())
        coverage_sum = sum(
            self._control_coverage(str(a.id), total_types) for a in assets
        )
        confidence_sum = sum(self._data_confidence(str(a.id)) for a in assets)
        n = len(assets) or 1

        avg_score = sum(scores) / len(scores) if scores else 0.0
        sri = self._sri(
            avg_score, total_eal, total_eal or 1.0,
            coverage_sum / n, confidence_sum / n,
        )

        sector_set = {
            a.sector for a in assets if a.sector
        }
        cr = total_eal / 10_000_000
        framing = (
            f"India's quantified sovereign cyber risk registers an SRI of {sri:.1f}/100 "
            f"with an aggregate expected annual loss of ₹{cr:,.1f} Cr across "
            f"{len(assets)} monitored assets in {len(sector_set)} sectors — a "
            "data-driven resilience baseline for CERT-In and sectoral regulators."
        )

        return {
            "as_on": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "total_eal_inr": round(total_eal, 2),
            "average_risk_score": round(avg_score, 2),
            "sovereign_risk_index": round(sri, 1),
            "total_assets": len(assets),
            "critical_infra_count": len(ci_assets),
            "total_open_vulns": vuln_total,
            "framing": framing,
            "top_sectors": [
                {
                    "sector": r["sector"],
                    "expected_annual_loss": r["expected_annual_loss"],
                    "sovereign_risk_index": r["sovereign_risk_index"],
                }
                for r in sector_rollups[:5]
            ],
            "top_critical_infra_assets": sorted(
                ci_assets, key=lambda x: -x["expected_annual_loss"]
            )[:10],
            "regions_present": list({
                a.region for a in assets if a.region
            } or ["UNKNOWN"]),
        }

    def sri(self) -> dict:
        """Sovereign Risk Index + per-sector breakdown."""
        sector_rollups = self.sectors()
        national = self.summary()
        return {
            "sovereign_risk_index": national["sovereign_risk_index"],
            "total_eal_inr": national["total_eal_inr"],
            "breakdown": [
                {
                    "sector": r["sector"],
                    "sovereign_risk_index": r["sovereign_risk_index"],
                    "expected_annual_loss": r["expected_annual_loss"],
                    "input_factors": {
                        "risk_score_norm": round(
                            (r["average_risk_score"] / 100) if r["average_risk_score"] else 0, 4
                        ),
                        "eal_share": round(r["eal_share_percent"] / 100, 4),
                        "control_coverage": round(r["control_coverage_percent"] / 100, 4),
                        "data_confidence": round(r["data_confidence_percent"] / 100, 4),
                    },
                }
                for r in sector_rollups
            ],
        }

    def _sri(self, avg_score: float, sector_eal: float, national_eal: float,
             coverage: float, confidence: float, ) -> float:
        """0.35·norm(score) + 0.30·norm(EALshare) + 0.20·coverage + 0.15·confidence."""
        norm_score = min(avg_score / 100.0, 1.0)
        norm_eal_share = min((sector_eal / national_eal) if national_eal else 0, 1.0)
        return 0.35 * norm_score + 0.30 * norm_eal_share + 0.20 * coverage + 0.15 * (confidence / 100.0)

    def regulator_report(self) -> dict:
        """Regulator-ready report: rollups + compliance + data-quality + audit verify."""
        rows = (
            self.db.query(AssetControl, SecurityControl)
            .join(SecurityControl, AssetControl.control_id == SecurityControl.id)
            .all()
        )
        asset_mapping = [
            {
                "control_type": sc.control_type,
                "status": ac.status,
                "coverage_score": float(ac.coverage_score or 0),
                "effectiveness_score": float(ac.effectiveness_score or 0),
            }
            for ac, sc in rows
        ]

        sectors = self.sectors()
        sector_compliance = {}
        for r in sectors:
            sector = r["sector"]
            sector_compliance[sector] = ComplianceMapper.sector_compliance(sector, asset_mapping)

        warnings = self.db.query(EarlyWarning).order_by(EarlyWarning.created_at.desc()).all()

        return {
            "national": self.summary(),
            "sectors": sectors,
            "regions": self.regions(),
            "agencies": self.agencies(),
            "compliance": ComplianceMapper.apply_asset_state(asset_mapping),
            "compliance_by_sector": sector_compliance,
            "data_quality": self.quality.enterprise_quality(),
            "audit_chain": AuditChain(self.db).verify(),
            "early_warnings": [
                {
                    "id": str(w.id),
                    "warning_type": w.warning_type,
                    "target_type": w.target_type,
                    "target_id": w.target_id,
                    "severity": w.severity,
                    "title": w.title,
                    "status": w.status,
                    "created_at": w.created_at.isoformat() if w.created_at else None,
                }
                for w in warnings
            ],
        }

    def sector_compliance(self, sector: str) -> dict:
        rows = (
            self.db.query(AssetControl, SecurityControl)
            .join(SecurityControl, AssetControl.control_id == SecurityControl.id)
            .all()
        )
        asset_mapping = [
            {
                "control_type": sc.control_type,
                "status": ac.status,
                "coverage_score": float(ac.coverage_score or 0),
                "effectiveness_score": float(ac.effectiveness_score or 0),
            }
            for ac, sc in rows
        ]
        return ComplianceMapper.sector_compliance(sector, asset_mapping)