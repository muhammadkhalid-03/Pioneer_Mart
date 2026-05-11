from .base import *  # noqa: F403
from core.settings import sqlite_database_config

DEBUG = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

DATABASES = {"default": sqlite_database_config("test.sqlite3")}
