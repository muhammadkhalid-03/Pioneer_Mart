"""Compatibility re-export for user profile API endpoints."""

from userprofile.api.views import UserViewSet, signup

__all__ = ["UserViewSet", "signup"]
