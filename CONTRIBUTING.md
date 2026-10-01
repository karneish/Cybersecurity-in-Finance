# Contributing to CyberRisk Quantifier

Thanks for your interest in making this platform better.

## Development workflow

1. Fork or clone the repo.
2. Ensure Python 3.11+ / Node 20+ are installed, plus a running PostgreSQL and a running Redis (no container runtime needed).
3. Copy `.env.example` to `.env` and point `DATABASE_URL` / `REDIS_URL` at them.
4. Install dependencies: `make install` (`pip install -r requirements.txt`, `pip install ./services/common`, `npm install` in `frontend/`).
5. Run `python database/migrate_and_seed.py` to initialise the database.
6. Start the stack: `powershell -ExecutionPolicy Bypass -File scripts/dev.ps1` (Windows) or `./scripts/dev.sh` (bash) — or `make up`. Stop with `-Stop` / `--stop` (`make down`).

## Code conventions

- **Backend:** Python 3.11+, FastAPI, SQLAlchemy 2, type hints throughout.
  Format with `ruff format .`; lint with `ruff check .`.
- **Frontend:** React 18 + TypeScript strict, Tailwind CSS. Run `npm run lint`
  and `npm run typecheck` before pushing.
- Commit messages follow the pattern: `add <path/to/file>` for new files or
  `update <path/to/file>: <what changed>` for modifications. Keep commits
  atomic (one logical change per commit).

## Testing

- **Backend:** `python -m pytest services/common/tests services/risk-engine/tests services/investment-optimizer/tests services/ai-service/tests -q` (or `make test` for the full set)
- **Frontend:** `cd frontend && npm test`
- **Smoke test (stack running):** `powershell -ExecutionPolicy Bypass -File scripts/smoke_sacro.ps1`

All three must pass before opening a PR.

## Pull request checklist

- [ ] Lint passes (`ruff check .` + `npm run lint`)
- [ ] Type-check passes (`mypy` / `tsc --noEmit`)
- [ ] All existing tests still pass
- [ ] New code has tests where practical
- [ ] README / API docs updated if behaviour changes
- [ ] `make lint` and `make typecheck` pass
- [ ] The stack still boots cleanly (`make up`, then the smoke test)
