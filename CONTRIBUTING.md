# Contributing to CyberRisk Quantifier

Thanks for your interest in making this platform better.

## Development workflow

1. Fork or clone the repo.
2. Ensure Docker + Docker Compose (v2) and Python 3.12+ / Node 20+ are installed locally.
3. Run `docker compose up --build` to start the 12-container stack.
4. Run `python database/migrate_and_seed.py` to initialise the database.

## Code conventions

- **Backend:** Python 3.12+, FastAPI, SQLAlchemy 2, type hints throughout.
  Format with `ruff format .`; lint with `ruff check .`.
- **Frontend:** React 18 + TypeScript strict, Tailwind CSS. Run `npm run lint`
  and `npm run typecheck` before pushing.
- Commit messages follow the pattern: `add <path/to/file>` for new files or
  `update <path/to/file>: <what changed>` for modifications. Keep commits
  atomic (one logical change per commit).

## Testing

- **Backend:** `python -m pytest services/common/tests services/risk-engine/tests services/investment-optimizer/tests services/ai-service/tests -q`
- **Frontend:** `cd frontend && npm test`
- **Smoke test (Docker running):** `powershell -ExecutionPolicy Bypass -File scripts/smoke_sacro.ps1`

All three must pass before opening a PR.

## Pull request checklist

- [ ] Lint passes (`ruff check .` + `npm run lint`)
- [ ] Type-check passes (`mypy` / `tsc --noEmit`)
- [ ] All existing tests still pass
- [ ] New code has tests where practical
- [ ] README / API docs updated if behaviour changes
- [ ] Docker build still succeeds (`docker compose build`)
