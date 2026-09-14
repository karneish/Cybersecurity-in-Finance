.PHONY: help build up down restart logs migrate seed test lint typecheck smoke clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

build: ## Build all Docker containers
	docker compose build

up: ## Start the full stack (detached)
	docker compose up -d

down: ## Stop all containers
	docker compose down

restart: ## Restart all containers
	docker compose restart

logs: ## Tail all container logs
	docker compose logs -f

migrate: ## Run database migrations + seed data
	python database/migrate_and_seed.py

seed: migrate ## Alias for migrate

test: ## Run backend + frontend tests
	python -m pytest services/common/tests services/risk-engine/tests services/investment-optimizer/tests services/ai-service/tests -q
	cd frontend && npm test

lint: ## Lint backend (ruff) + frontend (eslint)
	ruff check .
	cd frontend && npm run lint

typecheck: ## Type-check backend (mypy) + frontend (tsc)
	cd frontend && npm run typecheck

smoke: ## Run smoke test (Docker stack must be running)
	powershell -ExecutionPolicy Bypass -File scripts/smoke_sacro.ps1

clean: ## Remove __pycache__, .pytest_cache, node_modules
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	rm -rf frontend/node_modules frontend/dist