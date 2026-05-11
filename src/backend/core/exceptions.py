from rest_framework import status


class DomainError(Exception):
    """Base exception for predictable service-layer failures."""

    default_detail = "A domain error occurred."
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, detail: str | None = None):
        super().__init__(detail or self.default_detail)
        self.detail = detail or self.default_detail


class DomainValidationError(DomainError):
    default_detail = "The request data is invalid."


class DomainNotFoundError(DomainError):
    default_detail = "The requested resource was not found."
    status_code = status.HTTP_404_NOT_FOUND


class DomainPermissionError(DomainError):
    default_detail = "You do not have permission to perform this action."
    status_code = status.HTTP_403_FORBIDDEN
