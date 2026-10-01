.PHONY: help install up down restart logs status migrate seed test lint typecheck smoke clean

# Native (non-Docker) dev stack. Uses Windows PowerShell 5.1 (`powershell`),
# not PowerShell 7 (`pwsh`), which is not installed by default on Windows.
# On WSL/Git Bash use `bash scripts/dev.sh` directly if `make` is unavailable.
OS := $(shell uname -s 2>/dev/null || echo Windows)
ifeq ($(OS),Windows)
DEV := powershell -ExecutionPolicy Bypass -File scripts/dev.ps1
else
DEV := ./scripts/dev.sh
endif

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install backend + frontend dependencies
	python -m pip install -r requirements.txt
	python -m pip install ./services/common
	cd frontend && npm install

up: ## Start the full stack natively (Ctrl+C to stop)
	$(DEV)

down: ## Stop the stack
	$(DEV) --stop

restart: down up ## Stop then start the stack

logs: ## Tail every service log
	@tail -n 40 -f .dev/logs/*.log

status: ## Show which stack ports are listening
ifeq ($(OS),Windows)
	@powershell -Command "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object LocalPort -in 3000,8080,8081,8082,8083,8084,8085,8086,8090,8091,8092 | Select-Object -ExpandProperty LocalPort | Sort-Object -Unique"
else
	@ss -ltn 2>/dev/null | grep -E ':(3000|8080|8081|8082|8083|8084|8085|8086|8090|8091|8092)' || echo "nothing listening"
endif

migrate: ## Run database migrations + seed data
	python database/migrate_and_seed.py

seed: migrate ## Alias for migrate

test: ## Run backend + frontend tests (each suite separately to avoid conftest path collisions)
	for suite in services/common/tests services/api-gateway/tests services/risk-engine/tests services/investment-optimizer/tests services/ai-service/tests services/vulnerability-service/tests services/control-service/tests services/notification-service/tests; do \
		python -m pytest $$suite -q || exit 1; \
	done
	cd frontend && npm test

lint: ## Lint backend (ruff) + frontend (eslint)
	ruff check .
	cd frontend && npm run lint

typecheck: ## Type-check frontend (tsc)
	cd frontend && npm run typecheck

smoke: ## Run smoke test against the running stack
	powershell -ExecutionPolicy Bypass -File scripts/smoke_sacro.ps1

clean: ## Remove __pycache__, .pytest_cache, node_modules, runtime state
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	rm -rf frontend/node_modules frontend/dist .dev .render