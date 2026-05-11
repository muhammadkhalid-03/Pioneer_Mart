from rest_framework import status
from rest_framework.response import Response

from .exceptions import DomainError


def domain_error_response(exc: DomainError) -> Response:
    return Response({"error": exc.detail}, status=exc.status_code)


def success_response(payload: dict, http_status: int = status.HTTP_200_OK) -> Response:
    return Response(payload, status=http_status)
