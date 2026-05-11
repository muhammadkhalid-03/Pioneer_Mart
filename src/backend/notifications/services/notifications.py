from __future__ import annotations

import logging

import requests

from core.exceptions import DomainValidationError
from notifications.models import Notification, NotificationType, UserPushToken

logger = logging.getLogger(__name__)


def register_push_token(*, user, token: str) -> UserPushToken:
    if not token:
        raise DomainValidationError("Push token is required")
    if not token.startswith(("ExponentPushToken[", "ExpoPushToken[")):
        raise DomainValidationError("Invalid push token format")

    user_push_token, created = UserPushToken.objects.get_or_create(
        user=user,
        defaults={"token": token, "push_notifications_enabled": True},
    )
    if not created:
        user_push_token.token = token
        user_push_token.save(update_fields=["token", "updated_at"])
    return user_push_token


def set_push_notification_preference(*, user, enabled: bool) -> UserPushToken | None:
    user_push_token = UserPushToken.objects.filter(user=user).first()
    if user_push_token is None:
        if enabled:
            raise DomainValidationError(
                "No push token registered. Please register a push token first."
            )
        return None

    user_push_token.push_notifications_enabled = enabled
    user_push_token.save(update_fields=["push_notifications_enabled", "updated_at"])
    return user_push_token


def get_push_notification_status(*, user) -> dict[str, bool]:
    user_push_token = UserPushToken.objects.filter(user=user).first()
    return {
        "push_notifications_enabled": bool(
            user_push_token and user_push_token.push_notifications_enabled
        ),
        "has_push_token": bool(user_push_token and user_push_token.token),
    }


def mark_notifications_as_read(*, user, notification_ids: list[int]) -> int:
    if not notification_ids:
        raise DomainValidationError("No notification IDs provided")
    return Notification.objects.filter(id__in=notification_ids, recipient=user).update(
        is_read=True
    )


def reset_unread_notifications(*, user) -> int:
    return Notification.objects.filter(recipient=user, is_read=False).update(
        is_read=True
    )


def create_purchase_request_notification(
    *, recipient, item_name: str, requester_name: str
) -> Notification:
    message = f"{requester_name} requested to buy your item '{item_name}'"
    notification = Notification.objects.create(
        recipient=recipient,
        type=NotificationType.PURCHASE,
        message=message,
        related_item=item_name,
    )
    send_expo_push_notification(
        user=recipient,
        title="Purchase Request",
        body=message,
        data={
            "type": "purchase",
            "notification_id": notification.pk,
            "item_name": item_name,
            "requester_name": requester_name,
        },
    )
    return notification


def create_chat_notification(
    *, recipient, item_name: str | None, sender_name: str
) -> Notification:
    if item_name:
        message = f"{sender_name} sent a message about '{item_name}'"
    else:
        message = f"{sender_name} sent you a message"

    notification = Notification.objects.create(
        recipient=recipient,
        type=NotificationType.CHAT,
        message=message,
        related_item=item_name,
    )
    send_expo_push_notification(
        user=recipient,
        title="New Message",
        body=message,
        data={
            "type": "chat",
            "notification_id": notification.pk,
            "item_name": item_name,
            "sender_name": sender_name,
        },
    )
    return notification


def send_expo_push_notification(
    *, user, title: str, body: str, data: dict | None = None
) -> bool:
    token = UserPushToken.objects.filter(user=user).first()
    if not token or not token.token or not token.push_notifications_enabled:
        return False
    if not token.token.startswith(("ExponentPushToken[", "ExpoPushToken[")):
        logger.warning("Invalid push token format for user %s", user.pk)
        return False

    payload = {
        "to": token.token,
        "title": title,
        "body": body,
        "sound": "default",
        "priority": "high",
    }
    if data:
        payload["data"] = data

    try:
        response = requests.post(
            "https://exp.host/--/api/v2/push/send",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate",
            },
            timeout=30,
        )
        if response.status_code != 200:
            logger.error(
                "Expo push request failed for user %s: %s", user.pk, response.text
            )
            return False
        result = response.json()
        return result.get("data", {}).get("status") == "ok"
    except requests.exceptions.RequestException as exc:
        logger.error(
            "Network error sending push notification to user %s: %s", user.pk, exc
        )
        return False
