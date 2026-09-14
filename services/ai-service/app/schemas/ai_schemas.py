from pydantic import BaseModel, Field, ConfigDict


def _to_camel(s: str) -> str:
    parts = s.split('_')
    return parts[0] + ''.join(p.capitalize() for p in parts[1:])


class RecommendRequest(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    context: str = Field(default="general", description="Context: general, executive, technical")
    focus_area: str | None = Field(default=None, description="Focus: risk, investment, compliance, threat")


class RecommendResponse(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    recommendations: list[dict]
    summary: str
    data_sources: list[str]


class QueryRequest(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    question: str = Field(..., min_length=5, max_length=2000)
    context: str = Field(default="general")


class QueryResponse(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    answer: str
    data_used: dict
    confidence: float
    source: str
    intent: str = "GENERAL"
    data_source: str = "platform data"


class ExplainRequest(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    asset_id: str
    detail_level: str = Field(default="standard", description="brief, standard, detailed")


class ExplainResponse(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    asset_id: str
    asset_name: str
    explanation: str
    risk_factors: list[str]
    key_metrics: dict
    recommendations: list[str]


class SummarizeRequest(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    audience: str = Field(default="executive", description="executive, technical, board")
    time_period: str = Field(default="current", description="current, week, month")
