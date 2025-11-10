.PHONY: help install dev test lint format type-check migration migrate clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install production dependencies
	pip install -r requirements.txt

dev: ## Install development dependencies
	pip install -r requirements.txt
	pip install -e .

test: ## Run tests with coverage
	pytest --cov=app --cov-report=html --cov-report=term

test-watch: ## Run tests in watch mode
	pytest-watch

lint: ## Run code linting
	ruff check app/ tests/

format: ## Format code with Black
	black app/ tests/
	ruff check --fix app/ tests/

type-check: ## Run type checking with MyPy
	mypy app/

check: lint type-check test ## Run all checks (lint, type-check, test)

migration: ## Create new migration (usage: make migration MSG="description")
	alembic revision --autogenerate -m "$(MSG)"

migrate: ## Run database migrations
	alembic upgrade head

migrate-down: ## Rollback one migration
	alembic downgrade -1

db-reset: ## Reset database (drop and recreate)
	alembic downgrade base
	alembic upgrade head

clean: ## Clean cache and build artifacts
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name '*.pyc' -delete
	find . -type d -name '*.egg-info' -exec rm -rf {} + 2>/dev/null || true
	rm -rf .pytest_cache/ .mypy_cache/ .ruff_cache/ htmlcov/ .coverage

run: ## Run development server
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

docker-build: ## Build Docker image
	docker build -t aitradepro-backtesting:latest .

docker-run: ## Run Docker container
	docker run -p 8000:8000 --env-file .env aitradepro-backtesting:latest
