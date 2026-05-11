.PHONY: help ci ci-backend ci-frontend backend-ci frontend-ci sync lint format-check typecheck test frontend-sync frontend-typecheck frontend-lint dev backend-migrate backend-run

help:
	@echo "Available targets:"
	@echo "  make ci            - Run all CI-equivalent checks locally"
	@echo "  make ci-backend    - Run backend CI checks locally"
	@echo "  make ci-frontend   - Run frontend CI checks locally"
	@echo "  make backend-ci    - Alias for backend CI checks"
	@echo "  make frontend-ci   - Alias for frontend CI checks"
	@echo "  make sync          - Sync dependencies with uv lockfile"
	@echo "  make lint          - Run ruff lint checks"
	@echo "  make format-check  - Run ruff format check (excludes generated files)"
	@echo "  make typecheck     - Run pyright"
	@echo "  make test          - Run pytest"
	@echo "  make dev           - Sync backend deps, migrate, and run Django locally"
	@echo "  make backend-migrate - Run Django migrations"
	@echo "  make backend-run   - Run Django development server"
	@echo "  make frontend-sync - Install frontend npm dependencies"
	@echo "  make frontend-typecheck - Run frontend TypeScript check"
	@echo "  make frontend-lint - Run frontend lint"

ci: ci-backend ci-frontend

ci-backend: sync lint format-check typecheck test

ci-frontend: frontend-sync frontend-typecheck frontend-lint

backend-ci: ci-backend

frontend-ci: ci-frontend

sync:
	uv --directory src/backend sync --frozen --group dev

lint:
	uv --directory src/backend run ruff check .

format-check:
	uv --directory src/backend run ruff format --check .

typecheck:
	uv --directory src/backend run pyright

test:
	uv --directory src/backend run pytest

dev: sync backend-migrate backend-run

backend-migrate:
	uv --directory src/backend run python manage.py migrate

backend-run:
	uv --directory src/backend run python manage.py runserver

frontend-sync:
	npm --prefix src/frontend ci

frontend-typecheck:
	npx --prefix src/frontend tsc --noEmit -p src/frontend/tsconfig.json

frontend-lint:
	npm --prefix src/frontend run lint
