from django.db.models import QuerySet

from notifications.models import Notification


def notifications_for_user(
    user, notification_type: str | None = None
) -> QuerySet[Notification]:
    queryset = Notification.objects.filter(recipient=user)
    if notification_type and notification_type != "all":
        queryset = queryset.filter(type=notification_type)
    return queryset


def unread_notification_count(user) -> int:
    return Notification.objects.filter(recipient=user, is_read=False).count()
