from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.api import domain_error_response
from core.exceptions import DomainError
from notifications.selectors.notifications import (
    notifications_for_user,
    unread_notification_count,
)
from notifications.serializers import NotificationSerializer
from notifications.services.notifications import (
    get_push_notification_status,
    mark_notifications_as_read,
    register_push_token,
    reset_unread_notifications,
    set_push_notification_preference,
)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "delete"]

    def get_queryset(self):
        return notifications_for_user(
            self.request.user,
            self.request.query_params.get("type"),
        )

    @action(detail=False, methods=["post"], url_path="mark-read")
    def mark_as_read(self, request):
        try:
            mark_notifications_as_read(
                user=request.user,
                notification_ids=request.data.get("notification_ids", []),
            )
        except DomainError as exc:
            return domain_error_response(exc)
        return Response({"status": "notification marked as read"})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        return Response({"unread_count": unread_notification_count(request.user)})

    @action(detail=False, methods=["post"], url_path="reset-unread-count")
    def reset_unread_count(self, request):
        reset_unread_notifications(user=request.user)
        return Response({"status": "reset unread count"})

    @action(detail=False, methods=["post"], url_path="push-token")
    def register_push_token(self, request):
        try:
            register_push_token(
                user=request.user, token=str(request.data.get("token", ""))
            )
        except DomainError as exc:
            return domain_error_response(exc)
        return Response({"status": "Push token registered successfully"})

    @action(detail=False, methods=["post"], url_path="push-notifications")
    def toggle_push_notifications(self, request):
        enabled = request.data.get("enabled")
        if isinstance(enabled, str):
            enabled = enabled.lower() == "true"
        else:
            enabled = bool(enabled) if enabled is not None else False
        try:
            user_push_token = set_push_notification_preference(
                user=request.user,
                enabled=enabled,
            )
        except DomainError as exc:
            return domain_error_response(exc)
        status_text = "enabled" if enabled else "disabled"
        return Response(
            {
                "status": f"Push notifications {status_text} successfully",
                "push_notifications_enabled": bool(
                    user_push_token.push_notifications_enabled
                    if user_push_token
                    else False
                ),
            }
        )

    @action(detail=False, methods=["get"], url_path="push-status")
    def push_notification_status(self, request):
        return Response(
            get_push_notification_status(user=request.user), status=status.HTTP_200_OK
        )
