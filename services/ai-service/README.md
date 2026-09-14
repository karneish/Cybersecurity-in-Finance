# ai-service

AI-powered recommendations, natural-language queries, risk explanations, and
RAG compliance retrieval.

**Port:** 8092  
**Stack:** FastAPI + SQLAlchemy + pgvector (optional) + OpenAI (optional)

## Key features

- **Recommendations:** control/remediation suggestions based on live risk data
- **Intent classification:** NL queries routed to the correct backend endpoint
- **Risk explanations:** why an asset's risk score is what it is
- **Executive summaries:** CISO-level and role-tuned summaries
- **RAG compliance:** retrieve actual regulatory clauses (ISO 27001, NIST, RBI, etc.)
- **Mock LLM:** fully offline by default (`USE_MOCK_LLM=true`); zero API cost

## Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/ai/recommend` | Control/remediation suggestions |
| POST | `/api/ai/query` | NL query → intent → routed endpoint → answer |
| POST | `/api/ai/explain/risk/{assetId}` | Explain asset risk |
| POST | `/api/ai/summarize` | Executive summary |
| POST | `/api/ai/summarize/for/{role}` | Role-tuned summary |
| GET | `/api/ai/rag/status` | Corpus counts + freshness |
| POST | `/api/ai/rag/refresh` | Rebuild embeddings |
| POST | `/api/ai/rag/query` | Clause retrieval + answer |

## Intent router

`app/core/intent_router.py` classifies user queries into intents:
NATIONAL, COMPLIANCE, TREND, FORECAST, VAR, INVEST, or OTHER — then calls
the appropriate risk-engine/investment endpoint and formats the result as
a plain-English answer.

## RAG corpus

22 clauses from ISO 27001, NIST CSF, CIS v8, RBI, SEBI, DPDP Act, IT Act,
TRAI, IRDAI. Embeddings are deterministic hash-based (384-dim) and stored as
JSONB — works even without the pgvector extension.

See `docs/RAG_GUIDE.md` for full details.

## LLM modes

| Mode | Env var | Behaviour |
|---|---|---|
| Mock (default) | `USE_MOCK_LLM=true` | Deterministic, offline, zero cost |
| Real | `USE_MOCK_LLM=false` + `OPENAI_API_KEY` | OpenAI API for generation |