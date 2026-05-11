# Repository Guidelines

## Project Structure & Module Organization
This repository is split into two application roots under `src/`.

- `src/backend/`: Django backend. Core settings live in `src/backend/backend/`, feature apps such as `items/`, `categories/`, `chat/`, and `userprofile/` keep their own `models.py`, `views.py`, `serializers.py`, `urls.py`, and `tests.py`.
- `src/frontend/`: Expo Router React Native app. Route screens live in `app/`, shared UI in `components/`, API calls in `services/`, state in `stores/`, and shared types in `types/`. Frontend TypeScript filenames use kebab-case, with Expo Router exceptions such as `index.tsx`, `_layout.tsx`, and dynamic segment folders like `[id]`.
- `reports/` and `sprint_reports/`: project documentation and milestone artifacts.

## Build, Test, and Development Commands
Prefer the root `Makefile` for repeatable local checks:

- `make ci`: run backend and frontend CI-equivalent checks.
- `make ci-backend`: `uv sync`, `ruff`, `pyright`, and `pytest`.
- `make ci-frontend`: install frontend deps, run TypeScript checks, then Expo lint.
- `make dev`: sync backend deps, run migrations, and start Django locally.
- `make backend-migrate`: apply Django migrations after pulling schema changes.
- `make backend-run`: start the Django development server.
- `make test`: run backend tests with `pytest`.
- `make frontend-lint`: run Expo ESLint rules.

For local development:

- Backend: `uv --directory src/backend sync --frozen --group dev`, then `uv --directory src/backend run python manage.py migrate`, then `uv --directory src/backend run python manage.py runserver`
- Frontend: `npm --prefix src/frontend ci` then `npm --prefix src/frontend run start`

## Coding Style & Naming Conventions
Use 4 spaces in Python and standard TypeScript/TSX indentation already present in the frontend. Keep Django apps and Python modules `snake_case`; keep frontend TypeScript filenames kebab-case; keep React component and hook identifiers `PascalCase` and `camelCase` prefixed with `use`. Run `make lint`, `make format-check`, `make typecheck`, and `make frontend-lint` before opening a PR.

## Testing Guidelines
Backend tests live alongside each Django app in `tests.py`, plus `src/backend/test_smoke.py`. Add or update tests with every backend behavior change and run `make test`. Run `make backend-migrate` after pulling migration files or changing models locally. The frontend currently enforces typechecking and linting in CI; Jest packages are installed, but no maintained frontend test suite is checked in, so new UI tests should follow a `__tests__/` layout and be introduced with the feature that needs them.

## Commit & Pull Request Guidelines
Recent history uses short, imperative subjects, often with a conventional prefix such as `fix:` (`fix: linter warnings`) or concise task summaries (`add Makefile; update readme; mv uv; setup ci`). Keep commit messages specific and scoped. PRs should describe the user-visible change, list validation commands run, link the relevant issue, and include screenshots or screen recordings for frontend changes.

## Security & Configuration Tips
Do not commit secrets or environment-specific values. Treat files such as `src/frontend/.env.development` and backend auth/config material as local-only inputs, and prefer environment variables for credentials and service endpoints.
