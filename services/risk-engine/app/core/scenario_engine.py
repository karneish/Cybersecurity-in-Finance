from sqlalchemy.orm import Session

from app.models.asset import Asset, Vulnerability, AssetControl, SecurityControl
from app.core.risk_calculator import RiskCalculator
from app.core.formulas import (
    calculate_control_reduction,
    calculate_financial_impact,
    calculate_probability,
    calculate_risk_score,
    get_risk_category,
    CONTROL_TYPE_WEIGHTS,
)


class ScenarioSimulator:
    """What-if scenario simulation engine."""

    def __init__(self, db: Session):
        self.db = db
        self.risk_calc = RiskCalculator(db)

    def simulate(self, changes: list[dict]) -> dict:
        current_eal_data = self.risk_calc.get_enterprise_risk()
        current_eal = current_eal_data["total_eal"]
        current_score = current_eal_data["enterprise_risk_score"]

        simulated_state = self._build_simulated_state(changes)
        simulated_eal, simulated_score, asset_changes = self._calculate_simulated(simulated_state)

        eal_reduction = current_eal - simulated_eal
        reduction_pct = (eal_reduction / current_eal * 100) if current_eal > 0 else 0

        summary = self._build_summary(changes, current_eal, simulated_eal, eal_reduction, reduction_pct)

        result = {
            "current_eal": round(current_eal, 2),
            "simulated_eal": round(simulated_eal, 2),
            "eal_reduction": round(eal_reduction, 2),
            "eal_reduction_percent": round(reduction_pct, 2),
            "current_risk_score": round(current_score, 2),
            "simulated_risk_score": round(simulated_score, 2),
            "risk_score_change": round(current_score - simulated_score, 2),
            "asset_changes": asset_changes,
            "summary": summary,
        }

        if simulated_state.get("delays"):
            result["delay_analysis"] = self._delay_analysis(simulated_state, simulated_eal)

        return result

    def _delay_analysis(self, state: dict, escalated_eal: float) -> dict:
        """Cost of delaying remediation: compare against the same state without escalation."""
        no_delay = {
            **state,
            "delays": [
                {
                    "asset_id": d.get("asset_id"),
                    "escalation": 1.0,
                    "days": d.get("days", 0),
                    "vuln_ids": d.get("vuln_ids"),
                }
                for d in state["delays"]
            ],
        }
        eal_without_delay, _, _ = self._calculate_simulated(no_delay)
        return {
            "additional_annualized_loss_inr": round(max(escalated_eal - eal_without_delay, 0), 2),
            "exploitation_window_cost_inr": round(max(escalated_eal - eal_without_delay, 0) * 0.5, 2),
            "delayed_assets": sorted({d.get("asset_id") for d in state["delays"] if d.get("asset_id")}),
            "note": (
                "Probability of exploitation within the open window is scaled up while "
                "remediation is deferred (attacker dwell-time leverage)."
            ),
        }

    def _build_simulated_state(self, changes: list[dict]) -> dict:
        state = {
            "added_controls": {},
            "removed_vulns": set(),
            "modified_assets": {},
        }

        for change in changes:
            ctype = change.get("type")

            if ctype == "add_control":
                ctrl_type = change.get("control_type", "MFA")
                asset_id = change.get("asset_id")
                value = float(change.get("value", 0.7))
                key = f"{asset_id}:{ctrl_type}"
                state["added_controls"][key] = {
                    "control_type": ctrl_type,
                    "asset_id": asset_id,
                    "coverage_score": value,
                    "effectiveness_score": value,
                    "status": "ACTIVE",
                }

            elif ctype == "remediate_vuln":
                vuln_id = change.get("vuln_id")
                if vuln_id:
                    state["removed_vulns"].add(vuln_id)

            elif ctype == "modify_asset":
                asset_id = change.get("asset_id")
                field = change.get("field")
                value = change.get("value")
                if asset_id and field:
                    state["modified_assets"].setdefault(asset_id, {})[field] = value

            elif ctype == "delay_remediation":
                days = float(change.get("days", 90))
                # Widened attacker window → probability escalation, capped at +40%.
                escalation = 1 + min(0.40, max(0.0, days) / 365.0 * 0.40)
                state.setdefault("delays", []).append({
                    "asset_id": change.get("asset_id"),
                    "vuln_ids": change.get("vuln_ids"),
                    "days": days,
                    "escalation": escalation,
                })

        return state

    def _calculate_simulated(self, state: dict) -> tuple[float, float, list[dict]]:
        assets = self.db.query(Asset).all()
        total_eal = 0.0
        risk_scores = []
        asset_changes = []

        for asset in assets:
            asset_id = str(asset.id)

            asset_data = {
                "id": asset_id,
                "name": asset.name,
                "asset_type": asset.asset_type,
                "department": asset.department,
                "business_value_inr": float(asset.business_value_inr),
                "criticality_score": asset.criticality_score,
                "data_sensitivity": asset.data_sensitivity,
                "internet_exposed": asset.internet_exposed,
                "annual_revenue_impact": float(asset.annual_revenue_impact or 0),
            }

            if asset_id in state["modified_assets"]:
                for k, v in state["modified_assets"][asset_id].items():
                    asset_data[k] = v

            vulns = self.db.query(Vulnerability).filter(
                Vulnerability.affected_asset == asset_id,
                Vulnerability.status.in_(["OPEN", "IN_PROGRESS"]),
            ).all()

            active_vulns = [v for v in vulns if str(v.id) not in state["removed_vulns"]]

            controls = (
                self.db.query(AssetControl, SecurityControl)
                .join(SecurityControl, AssetControl.control_id == SecurityControl.id)
                .filter(AssetControl.asset_id == asset_id)
                .all()
            )
            control_list = [
                {
                    "control_type": sc.control_type,
                    "status": ac.status,
                    "coverage_score": float(ac.coverage_score),
                    "effectiveness_score": float(ac.effectiveness_score),
                }
                for ac, sc in controls
            ]

            for key, added in state["added_controls"].items():
                if added["asset_id"] == asset_id or added["asset_id"] is None:
                    control_list.append(added)

            control_reduction = calculate_control_reduction(control_list)
            financial_impact = calculate_financial_impact(asset_data)
            total_max = self.risk_calc.get_max_financial_impact()

            if not active_vulns:
                risk_scores.append(0.0)
                continue

            probabilities = []
            asset_eal = 0.0
            for v in active_vulns:
                v_data = {
                    "cvss_score": float(v.cvss_score),
                    "internet_exposed": v.internet_exposed,
                }
                prob = calculate_probability(v_data, asset_data, control_reduction)
                for delay in state.get("delays", []):
                    asset_matches = delay["asset_id"] is None or delay["asset_id"] == asset_id
                    vuln_scope = not delay.get("vuln_ids") or str(v.id) in delay["vuln_ids"]
                    if asset_matches and vuln_scope:
                        prob = min(0.99, prob * delay["escalation"])
                probabilities.append(prob)
                asset_eal += prob * financial_impact

            total_eal += asset_eal
            mean_prob = sum(probabilities) / len(probabilities)
            rs = calculate_risk_score(mean_prob, financial_impact, asset_data, total_max)
            risk_scores.append(rs)

            original_risk = self.risk_calc.calculate_asset_risk(asset_id)
            if original_risk:
                asset_changes.append({
                    "asset_id": asset_id,
                    "asset_name": asset.name,
                    "original_eal": original_risk["expected_annual_loss"],
                    "simulated_eal": round(asset_eal, 2),
                    "eal_change": round(original_risk["expected_annual_loss"] - asset_eal, 2),
                    "original_risk_score": original_risk["risk_score"],
                    "simulated_risk_score": rs,
                })

        avg_score = sum(risk_scores) / len(risk_scores) if risk_scores else 0
        return total_eal, avg_score, asset_changes

    def _build_summary(self, changes, current_eal, simulated_eal, reduction, pct) -> str:
        control_count = len([c for c in changes if c.get("type") == "add_control"])
        vuln_count = len([c for c in changes if c.get("type") == "remediate_vuln"])
        delay_count = len([c for c in changes if c.get("type") == "delay_remediation"])

        lines = [f"Simulated {len(changes)} changes:"]
        if control_count:
            lines.append(f"  - Added {control_count} security control(s)")
        if vuln_count:
            lines.append(f"  - Remediated {vuln_count} vulnerability(ies)")
        if delay_count:
            lines.append(
                f"  - Delayed remediation (open exploit window widened); "
                f"see delay_analysis for the annualized cost of delay"
            )
        lines.append(f"  - Current EAL: ₹{current_eal:,.0f}")
        lines.append(f"  - Simulated EAL: ₹{simulated_eal:,.0f}")
        lines.append(f"  - Reduction: ₹{reduction:,.0f} ({pct:.1f}%)")
        return "\n".join(lines)
