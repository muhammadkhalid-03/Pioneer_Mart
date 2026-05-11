from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent


def env(key: str, default: str | None = None) -> str | None:
    return os.getenv(key, default)


def env_bool(key: str, default: bool = False) -> bool:
    raw_value = os.getenv(key)
    if raw_value is None:
        return default
    return raw_value.lower() in {"1", "true", "yes", "on"}


def sqlite_database_config(name: str = "db.sqlite3") -> dict:
    return {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / name,
    }


def postgres_database_config() -> dict:
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME"),
        "USER": env("DB_USER"),
        "PASSWORD": env("DB_PASSWORD", env("PASSWORD")),
        "HOST": env("DB_HOST", env("HOST")),
        "PORT": env("DB_PORT", env("PORT")),
    }


def use_local_sqlite() -> bool:
    return env_bool("USE_SQLITE") or env("ENV") == "development" or not env("DB_NAME")
