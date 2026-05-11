from __future__ import annotations

import os
import random
import re
import time
from typing import Any, cast

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from rest_framework_simplejwt.tokens import RefreshToken

from core.exceptions import DomainValidationError
from otpauth.models import OTP
from userprofile.models import UserProfile

GRINNELL_EMAIL_RE = re.compile(r"^[a-z]+[0-9]?@grinnell\.edu$")


def request_otp(*, email: str, remote_addr: str | None = None) -> None:
    normalized_email = email.strip().lower()
    if not GRINNELL_EMAIL_RE.fullmatch(normalized_email):
        delay = 3 + random.uniform(0, 1)
        time.sleep(delay)
        return

    OTP.objects.filter(email=normalized_email).delete()
    otp = OTP.objects.create(email=normalized_email)
    send_mail(
        "Your OTP for authentication",
        f"Your OTP is {otp.otp}. It will expire in 10 minutes.",
        settings.DEFAULT_FROM_EMAIL,
        [normalized_email],
    )


def verify_otp(*, email: str, otp_code: str) -> dict[str, str]:
    normalized_email = email.strip().lower()
    if not normalized_email.endswith("@grinnell.edu"):
        raise DomainValidationError("Only grinnell.edu emails are allowed.")

    otp = OTP.objects.filter(email=normalized_email).order_by("-created_at").first()
    if otp is None or otp.otp != otp_code or not otp.is_valid():
        raise DomainValidationError("Invalid or expired OTP")

    username = normalized_email.split("@", 1)[0]
    user, _ = User.objects.get_or_create(
        email=normalized_email,
        defaults={"username": username},
    )
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.is_verified = True
    profile.save(update_fields=["is_verified"])

    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(cast(Any, refresh).access_token),
    }


def send_contact_message(*, description: str, user_email: str) -> None:
    subject = "New contact form from PioneerMart"
    message = (
        f"Message from PioneerMart contact form:\n\nUser: {user_email}\n\n{description}"
    )
    recipient = os.getenv("EMAIL_HOST_USER") or settings.DEFAULT_FROM_EMAIL
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [recipient],
        fail_silently=False,
    )
