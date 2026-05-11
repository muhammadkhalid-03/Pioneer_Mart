from __future__ import annotations

from collections.abc import Callable

from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse

from core.versioning import client_version_below_minimum


class MinimumAppVersionMiddleware:
    """
    Enforce a minimum mobile app version via X-App-Version on /api/ routes.
    Disabled when settings.MIN_APP_VERSION is empty.
    Uses HTTP 426 so responses are distinguishable from auth/forbidden 403s.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        min_version = getattr(settings, "MIN_APP_VERSION", "") or ""
        if not min_version.strip():
            return self.get_response(request)

        path = request.path or ""
        if not path.startswith("/api/"):
            return self.get_response(request)

        if path.startswith("/api/schema/"):
            return self.get_response(request)

        client_version = (request.headers.get("X-App-Version") or "").strip()
        if not client_version or client_version_below_minimum(
            client_version, min_version.strip()
        ):
            payload = {
                "error": (
                    "This version of the app is no longer supported. "
                    "Please update Pioneer Mart from the App Store."
                ),
                "code": "upgrade_required",
                "min_version": min_version.strip(),
            }
            return JsonResponse(payload, status=426)

        return self.get_response(request)
