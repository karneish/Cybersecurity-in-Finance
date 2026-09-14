from app.llm.llm_client import llm_client
from app.core.intent_router import INTENT_LABELS


RECOMMEND_SYSTEM_PROMPT = """You are a cybersecurity risk advisor AI. You analyze risk data 
from the CyberRisk Quantifier platform and provide actionable security recommendations.

Rules:
1. Base all recommendations on the actual data provided, not assumptions
2. Prioritize by financial impact (Expected Annual Loss reduction)
3. Consider implementation cost and time constraints
4. Reference specific assets, vulnerabilities, and controls by name/ID
5. Quantify expected risk reduction where possible
6. Never make up data — if data is not available, state that explicitly

Format recommendations as structured, actionable items with priority levels."""

EXPLAIN_SYSTEM_PROMPT = """You are a cybersecurity risk analyst AI. You explain risk 
assessments for specific assets in clear, non-technical language for executives while 
retaining technical accuracy for security teams.

Rules:
1. Reference the actual risk score, EAL, and contributing factors from the data
2. Explain WHY this asset has this risk level
3. Identify the specific vulnerabilities and control gaps
4. Provide concrete next steps
5. Use financial language (rupees, percentages) rather than just technical severity"""

QUERY_SYSTEM_PROMPT = """You are a cybersecurity risk intelligence assistant for the 
CyberRisk Quantifier platform. You answer questions about the organization's cyber risk 
posture using real data from the platform.

Rules:
1. Only answer based on the data provided to you
2. Quantify everything in financial terms where possible
3. If the data does not contain an answer, say so clearly
4. Reference specific data points (asset names, CVE IDs, risk scores)
5. Keep answers concise but complete"""

SUMMARIZE_SYSTEM_PROMPT = """You are a cybersecurity report writer. You generate executive 
summaries of cyber risk posture for board members, CISOs, and security teams.

Rules:
1. Lead with financial impact numbers
2. Highlight the top 3-5 risk concentrations
3. Include recommended actions with expected outcomes
4. Use clear section headers
5. Keep executive summaries to one page equivalent"""


async def get_recommendations(risk_data: dict, context: str, focus_area: str | None) -> dict:
    user_prompt = f"""Based on the following risk data, provide prioritized recommendations:

Risk Data:
- Enterprise Risk Score: {risk_data.get('enterprise_risk_score', 'N/A')}
- Total Expected Annual Loss: ₹{risk_data.get('total_eal', 0):,.0f}
- Total Assets: {risk_data.get('total_assets', 0)}
- Critical Risks: {risk_data.get('critical_risks', 0)}
- High Risks: {risk_data.get('high_risks', 0)}

Top Risk Drivers:
{chr(10).join(f"- {d.get('asset_name', 'Unknown')}: Score {d.get('risk_score', 0)}, EAL ₹{d.get('expected_annual_loss', 0):,.0f}" for d in risk_data.get('top_risk_drivers', [])[:5])}

Context: {context}
Focus: {focus_area or 'general'}

Provide 5-7 specific, actionable recommendations prioritized by expected risk reduction."""

    response = await llm_client.generate(RECOMMEND_SYSTEM_PROMPT, user_prompt)

    return {
        "recommendations": _parse_recommendations(response),
        "summary": response,
        "data_sources": ["risk-engine", "asset-service", "vulnerability-service"],
    }


async def query_risk_data(question: str, risk_data: dict, intent: str = "GENERAL",
                          data_source: str = "") -> dict:
    context = _format_context(intent, risk_data)
    user_prompt = f"""User question: {question}

Intent: {intent} — {INTENT_LABELS.get(intent, '')}
Platform function called: getRiskData() -> {data_source}

Returned platform data (authoritative, do not invent figures):
{context}

Answer the question based ONLY on the provided data. If the data does not contain 
enough information to answer, state that clearly."""

    response = await llm_client.generate(QUERY_SYSTEM_PROMPT, user_prompt)

    return {
        "answer": response,
        "data_used": risk_data,
        "confidence": 0.85,
        "source": "ai-service (mock)" if llm_client.use_mock else "ai-service (LLM)",
        "intent": intent,
        "data_source": data_source or "platform data",
    }


def _format_context(intent: str, data: dict) -> str:
    """Render routed tool output as human-readable lines the LLM (and mock) can reason over."""
    if intent == "NATIONAL":
        sectors = data.get("top_sectors", []) or []
        lines = [
            f"Sovereign Risk Index: {data.get('sovereign_risk_index', 'N/A')}",
            f"Total EAL: ₹{data.get('total_eal_inr', 0):,.0f}",
            f"Average Risk Score: {data.get('average_risk_score', 'N/A')}",
            f"Total Assets Monitored: {data.get('total_assets', 0)}",
            f"Open Vulnerabilities: {data.get('total_open_vulns', 0)}",
        ]
        for s in sectors[:5]:
            lines.append(
                f"- Sector {s.get('sector')}: EAL ₹{s.get('expected_annual_loss', 0):,.0f}, "
                f"SRI {s.get('sovereign_risk_index', 0)}"
            )
        return "\n".join(lines)

    if intent == "COMPLIANCE":
        coverage = data.get("coverage", {})
        rows = data.get("mapped_requirements", []) or []
        lines = [
            f"Compliance coverage: {coverage.get('active_controls', 0)} of "
            f"{coverage.get('total_control_types', 0)} control types · "
            f"{coverage.get('compliance_coverage_percent', 0)}%",
            "Regulations mapped: " + ", ".join(data.get("regulations", []) or []),
        ]
        for r in rows[:10]:
            lines.append(f"- {r.get('control_type')}: {r.get('status', 'UNKNOWN')}")
        return "\n".join(lines)

    if intent == "TREND":
        dates = data.get("dates", []) or []
        return (
            f"Risk trend covers {len(dates)} snapshots from {dates[0] if dates else '—'} "
            f"to {dates[-1] if dates else '—'}\n"
            f"- EAL values (₹): {data.get('eal_values', [])}\n"
            f"- Risk scores: {data.get('risk_scores', [])}\n"
            f"- Open vulnerabilities: {data.get('vuln_counts', [])}"
        )

    if intent == "FORECAST":
        base = data.get("baseline", {})
        return (
            f"Do-nothing forecast over {data.get('horizon_months', 12)} months\n"
            f"- Current EAL: ₹{base.get('current_eal_inr', 0):,.0f}\n"
            f"- EAL at 6 months: ₹{data.get('eal_at_6_months', 0):,.0f}\n"
            f"- EAL at 12 months: ₹{data.get('eal_at_12_months', 0):,.0f}\n"
            f"- Do-nothing cost (12m): ₹{data.get('do_nothing_cost_12m', 0):,.0f}\n"
            f"- Method: {data.get('method', 'Unknown')}"
        )

    if intent == "VAR":
        mc = data.get("value_at_risk_band") or {}
        return (
            f"Monte-Carlo loss distribution ({data.get('simulations', 'N/A')} simulations)\n"
            f"- Expected annual loss: ₹{data.get('expected_annual_loss_inr', 0):,.0f}\n"
            f"- Mean (MC): ₹{data.get('mc_mean_inr', 0):,.0f}\n"
            f"- p50 (median): ₹{data.get('p50_inr', 0):,.0f}\n"
            f"- p95 (VaR95): ₹{data.get('p95_inr', 0):,.0f}\n"
            f"- p99 (tail): ₹{data.get('p99_inr', 0):,.0f}"
        )

    if intent == "INVEST":
        rosi = data.get("rosi", []) or []
        lines = ["Security controls ranked by ROSI:"]
        for c in rosi[:8]:
            lines.append(
                f"- {c.get('control_name')} ({c.get('control_type')}): "
                f"cost ₹{c.get('implementation_cost', 0):,.0f}, "
                f"EAL reduction ₹{c.get('risk_reduction_value', 0):,.0f}, "
                f"ROSI {c.get('rosi_percent', 0)}%"
            )
        if not lines[1:]:
            lines.append("- No control data available.")
        return "\n".join(lines)

    # GENERAL — score + EAL + top drivers
    drivers = data.get("top_risk_drivers", []) or []
    lines = [
        f"Enterprise Risk Score: {data.get('enterprise_risk_score', 'N/A')}",
        f"Total Expected Annual Loss: ₹{data.get('total_eal', 0):,.0f}",
        f"Total Assets Monitored: {data.get('total_assets', 0)}",
        f"Open Vulnerabilities: {data.get('total_vulnerabilities', 0)}",
    ]
    for d in drivers[:5]:
        lines.append(
            f"- {d.get('asset_name', 'Unknown')}: Score {d.get('risk_score', 0)}, "
            f"EAL ₹{d.get('expected_annual_loss', 0):,.0f}"
        )
    return "\n".join(lines)


async def explain_risk(asset_data: dict, risk_data: dict, detail_level: str) -> dict:
    user_prompt = f"""Explain the risk assessment for this asset:

Asset: {asset_data.get('name', 'Unknown')}
Type: {asset_data.get('asset_type', 'Unknown')}
Department: {asset_data.get('department', 'Unknown')}
Criticality: {asset_data.get('criticality_score', 0)}/100
Data Sensitivity: {asset_data.get('data_sensitivity', 'Unknown')}
Internet Exposed: {asset_data.get('internet_exposed', False)}

Risk Assessment:
- Risk Score: {risk_data.get('risk_score', 0)}/100
- Probability: {risk_data.get('probability', 0)*100:.1f}%
- Financial Impact: ₹{risk_data.get('financial_impact_inr', 0):,.0f}
- Expected Annual Loss: ₹{risk_data.get('expected_annual_loss', 0):,.0f}
- Risk Category: {risk_data.get('risk_category', 'Unknown')}

Risk Factors: {risk_data.get('risk_factors', {})}

Detail level: {detail_level}

Provide a clear explanation suitable for the audience."""

    response = await llm_client.generate(EXPLAIN_SYSTEM_PROMPT, user_prompt)

    return {
        "asset_id": asset_data.get("id", ""),
        "asset_name": asset_data.get("name", "Unknown"),
        "explanation": response,
        "risk_factors": _extract_risk_factors(risk_data),
        "key_metrics": {
            "risk_score": risk_data.get("risk_score", 0),
            "probability": risk_data.get("probability", 0),
            "financial_impact": risk_data.get("financial_impact_inr", 0),
            "expected_annual_loss": risk_data.get("expected_annual_loss", 0),
            "control_reduction": risk_data.get("control_reduction", 0),
        },
        "recommendations": _extract_recommendations_from_explanation(response),
    }


async def generate_summary(eal_data: dict, risk_data: dict, audience: str) -> str:
    user_prompt = f"""Generate a {audience}-level summary:

Risk Overview:
- Enterprise Risk Score: {risk_data.get('enterprise_risk_score', 0)}
- Total EAL: ₹{eal_data.get('total_eal', 0):,.0f}
- Total Assets: {risk_data.get('total_assets', 0)}
- Open Vulnerabilities: {risk_data.get('total_vulnerabilities', 0)}

Risk Distribution:
- Critical: {risk_data.get('critical_risks', 0)}
- High: {risk_data.get('high_risks', 0)}
- Medium: {risk_data.get('medium_risks', 0)}
- Low: {risk_data.get('low_risks', 0)}

Top Risk Drivers:
{chr(10).join(f"- {d['asset_name']}: ₹{d['expected_annual_loss']:,.0f}" for d in risk_data.get('top_risk_drivers', [])[:5])}

EAL Breakdown by Department:
{chr(10).join(f"- {k}: ₹{v:,.0f}" for k, v in eal_data.get('breakdown_by_department', {}).items())}

Generate a clear, {audience}-appropriate summary."""

    return await llm_client.generate(SUMMARIZE_SYSTEM_PROMPT, user_prompt)


def _parse_recommendations(text: str) -> list[dict]:
    recs = []
    lines = text.split("\n")
    current = None

    for line in lines:
        stripped = line.strip()
        if stripped.startswith(("1.", "2.", "3.", "4.", "5.", "6.", "7.", "8.", "9.", "•", "-")):
            if current:
                recs.append(current)
            current = {"action": stripped.lstrip("0123456789.•- "), "priority": len(recs) + 1}
        elif current and stripped:
            current["details"] = current.get("details", "") + " " + stripped

    if current:
        recs.append(current)

    return recs[:10]


def _extract_risk_factors(risk_data: dict) -> list[str]:
    factors = []
    rf = risk_data.get("risk_factors", {})
    if rf.get("internet_exposed"):
        factors.append("Internet-exposed asset")
    if rf.get("critical_vulns", 0) > 0:
        factors.append(f"{rf['critical_vulns']} critical vulnerability(ies)")
    if rf.get("high_vulns", 0) > 0:
        factors.append(f"{rf['high_vulns']} high-severity vulnerability(ies)")
    if rf.get("control_reduction", 0) < 0.3:
        factors.append("Low control coverage")
    if rf.get("criticality_score", 50) >= 80:
        factors.append("High business criticality")
    if risk_data.get("probability", 0) > 0.7:
        factors.append("High probability of exploitation")
    return factors


def _extract_recommendations_from_explanation(text: str) -> list[str]:
    lines = text.split("\n")
    recs = []
    for line in lines:
        stripped = line.strip()
        if any(kw in stripped.lower() for kw in ["recommend", "should", "must", "deploy", "implement", "enable"]):
            if len(stripped) > 10:
                recs.append(stripped)
    return recs[:5]
