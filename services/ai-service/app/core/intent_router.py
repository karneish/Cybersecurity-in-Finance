"""NL-query intent routing (function-calling style).

Classifies a free-text question into a named intent, then the API layer treats
that intent as a *function call* — it invokes the matching platform endpoint and
feeds the formatted result to the LLM (or mock). This mirrors tool-calling on a
small, explainable service without requiring a chat-loop.
"""

INTENT_LABELS = {
    "GENERAL": "Enterprise risk posture (score + EAL + top drivers)",
    "NATIONAL": "Sovereign cyber-risk index and sector rollups",
    "COMPLIANCE": "Regulatory control mapping and coverage",
    "TREND": "Historical risk trend over the trailing window",
    "FORECAST": "12-month do-nothing (no-control) projection",
    "VAR": "Value-at-Risk Monte-Carlo loss distribution",
    "INVEST": "Security investment controls, ROSI, and spend ranking",
}

INTENT_KEYWORDS = [
    ("NATIONAL", (
        "national", "sovereign", "ministry", "cert-in", "observatory",
        "sector", "agency", "country", "india",
    )),
    ("COMPLIANCE", (
        "compliance", "regulation", "mandate", "rbi", "trai", "irdai",
        "nciipc", "dpdp", "it act", "regulatory",
    )),
    ("INVEST", (
        "invest", "budget", "roi", "rosi", "return on", "spend",
        "allocate", "portfolio", "optimizer",
    )),
    ("VAR", (
        "value at risk", "var", "monte carlo", "percentile", "tail risk",
        "distribution", "simulation", "p99", "p95",
    )),
    ("FORECAST", (
        "forecast", "future", "project", "will be", "do-nothing", "next year",
        "six month", "12 month", "12-month",
    )),
    ("TREND", (
        "trend", "trending", "compare", "improving", "worsening",
        "last 30", "last month", "changing", "since",
    )),
]


def classify_intent(question: str) -> str:
    """Rule-based intent classifier — deterministic and explainable."""
    q = (question or "").lower()
    for intent, keywords in INTENT_KEYWORDS:
        if any(k.lower() in q for k in keywords):
            return intent
    return "GENERAL"