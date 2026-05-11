from django.contrib.auth.models import User

from core.exceptions import DomainValidationError


def create_basic_user(*, email: str) -> User:
    if not email:
        raise DomainValidationError("The email field is required")
    if User.objects.filter(email=email).exists():
        raise DomainValidationError("User already exists")
    username = email.split("@", 1)[0]
    return User.objects.create_user(username=username, email=email)
