"""Compatibility re-export for OTP auth API endpoints."""

from otpauth.api.views import (
    ContactFormView,
    RefreshTokenView,
    RequestOTPView,
    VerifyOTPView,
)

__all__ = ["RequestOTPView", "VerifyOTPView", "RefreshTokenView", "ContactFormView"]
