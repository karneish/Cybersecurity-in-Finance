# RAG Compliance Retrieval Guide

The AI service provides a retrieval-augmented generation (RAG) system that answers
compliance questions by referencing the actual regulatory/legal clauses stored in
the database.

## Architecture

```
User query → ai-service/route → intent classifier → /api/ai/rag/query
                                                     ↓
                                          cosine-similarity retrieval
                                          over gov.compliance_docs (pgvector-ready)
                                                     ↓
                                          top-k clauses + plain-English answer
```

## Indexed frameworks

| Framework | Scope |
|---|---|
| ISO 27001:2022 | Information security management |
| NIST CSF 1.1 & 2.0 | Cybersecurity framework |
| CIS Controls v8 | Prioritised security actions |
| RBI IT Master Directions | Indian banking IT risk |
| SEBI (CIS/cyber) | Indian securities regulator |
| DPDP Act 2023 | Indian data protection |
| IT Act 2000/2008 (Sec 70/NCIIPC) | Critical infrastructure protection |
| TRAI | Telecom regulator |
| IRDAI | Insurance regulator |

## Corpus

22 clauses stored in `gov.compliance_docs`. Each clause has:
- `framework` (e.g. "ISO_27001")
- `clause_id` (e.g. "A.5.1.1")
- `clause_text` (the actual regulatory text)
- `embedding` (384-dim deterministic hash vector, stored as JSONB)

## Embedding approach

Deterministic hash-based 384-dim feature vector from character n-grams:
- No API calls, no cost, PII-safe
- Same text always produces the same vector (idempotent)
- Works even without the pgvector extension (falls back to Python cosine similarity)

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/ai/rag/status` | Corpus counts per framework, freshness |
| POST | `/api/ai/rag/refresh` | Rebuild all embeddings (idempotent, safe to re-run) |
| POST | `/api/ai/rag/query` | `{ "query": "...", "top_k": 3, "framework": "ISO_27001" }` → clauses + answer |

## Usage

```bash
# Check corpus status
curl http://localhost:8080/api/ai/rag/status

# Query
curl -X POST http://localhost:8080/api/ai/rag/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the requirements for access control in ISO 27001?", "top_k": 3}'

# Refresh (rebuilds embeddings, idempotent)
curl -X POST http://localhost:8080/api/ai/rag/refresh \
  -H "Authorization: Bearer <token>"
```