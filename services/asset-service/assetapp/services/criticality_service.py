"""Criticality scoring — ported from the Java CriticalityService.

Formula (1–10 scale):
  base = business-value score + annual-revenue score
  * HIGH sensitivity  ×1.5, MEDIUM ×1.2
  * internet-exposed  ×2.0
  clamped to [1, 10]
"""

INTERNET_EXPOSURE_MULTIPLIER = 2.0
HIGH_SENSITIVITY_MULTIPLIER = 1.5
MEDIUM_SENSITIVITY_MULTIPLIER = 1.2
HIGH_VALUE_THRESHOLD = 1_000_000
MEDIUM_VALUE_THRESHOLD = 100_000
MIN_SCORE = 1.0
MAX_SCORE = 10.0


def _business_value_score(value: float) -> float:
    if value >= HIGH_VALUE_THRESHOLD:
        return 4.0
    if value >= MEDIUM_VALUE_THRESHOLD:
        return 2.0
    return 1.0


def _revenue_score(value: float) -> float:
    if value >= HIGH_VALUE_THRESHOLD:
        return 3.0
    if value >= MEDIUM_VALUE_THRESHOLD:
        return 1.5
    return 0.5


def calculate_criticality(
    business_value_inr: float,
    annual_revenue_impact: float,
    internet_exposed: bool,
    data_sensitivity: str,
) -> float:
    score = _business_value_score(business_value_inr) + _revenue_score(annual_revenue_impact)

    if data_sensitivity.upper() == "HIGH":
        score *= HIGH_SENSITIVITY_MULTIPLIER
    elif data_sensitivity.upper() == "MEDIUM":
        score *= MEDIUM_SENSITIVITY_MULTIPLIER

    if internet_exposed:
        score *= INTERNET_EXPOSURE_MULTIPLIER

    return round(max(MIN_SCORE, min(MAX_SCORE, score)), 1)