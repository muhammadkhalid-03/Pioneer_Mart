from django.contrib.auth.models import User


def current_user_queryset(user):
    return User.objects.filter(pk=user.pk).order_by("pk")
