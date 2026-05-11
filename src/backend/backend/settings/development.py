from .base import *  # noqa: F403
from core.settings import (
    sqlite_database_config,
    postgres_database_config,
    use_local_sqlite,
)

DEBUG = True
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

DATABASES = {
    "default": sqlite_database_config()
    if use_local_sqlite()
    else postgres_database_config()
}
