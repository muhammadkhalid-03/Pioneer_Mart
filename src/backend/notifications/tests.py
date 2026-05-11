from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient

from .models import Notification, NotificationType, UserPushToken


class NotificationModelTests(TestCase):
    """Tests for the nOtification model"""

    def setUp(self):
        # first create the test user
        self.user = User.objects.create_user(username="testuser", password="testpass")

        # create a test notification
        self.notification = Notification.objects.create(
            recipient=self.user,
            type=NotificationType.PURCHASE,
            message="Test notification",
            related_item="Test item",
        )

    def test_notification_creation(self):
        """Test that a notification ncan be created"""
        self.assertEqual(self.notification.recipient, self.user)
        self.assertEqual(self.notification.type, NotificationType.PURCHASE)
        self.assertEqual(self.notification.message, "Test notification")
        self.assertEqual(self.notification.related_item, "Test item")
        self.assertFalse(self.notification.is_read)

    def test_notification_string_representation(self):
        """Test the string representation of a notification"""
        expected_string = f"{NotificationType.PURCHASE} notification for testuser"
        self.assertEqual(str(self.notification), expected_string)

    def test_time_display_just_now(self):
        """Test time_display property which should return 'just now' for recent notifications"""
        self.assertEqual(self.notification.time_display, "Just now")

    def test_time_display_minutes(self):
        """Test time_display property returns minutes ago"""
        # notification created 5 minutes ago
        self.notification.created_at = timezone.now() - timedelta(minutes=5)
        self.notification.save()
        self.assertEqual(self.notification.time_display, "5m ago")

        # test a singular minute
        self.notification.created_at = timezone.now() - timedelta(minutes=1)
        self.notification.save()
        self.assertEqual(self.notification.time_display, "1m ago")


class NotificationPushTokenApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="pushuser", email="push@test.com", password="pass"
        )
        self.client.force_authenticate(user=self.user)

    def test_register_push_token_preserves_disabled_preference(self):
        UserPushToken.objects.create(
            user=self.user,
            token="ExpoPushToken[old-token]",
            push_notifications_enabled=False,
        )

        response = self.client.post(
            "/api/v1/notifications/push-token/",
            {"token": "ExpoPushToken[new-token]"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        push_token = UserPushToken.objects.get(user=self.user)
        self.assertEqual(push_token.token, "ExpoPushToken[new-token]")
        self.assertFalse(push_token.push_notifications_enabled)

    def test_push_status_reports_token_and_preference(self):
        UserPushToken.objects.create(
            user=self.user,
            token="ExpoPushToken[token-value]",
            push_notifications_enabled=True,
        )

        response = self.client.get("/api/v1/notifications/push-status/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "push_notifications_enabled": True,
                "has_push_token": True,
            },
        )

    def test_enabling_push_notifications_without_registered_token_fails(self):
        response = self.client.post(
            "/api/v1/notifications/push-notifications/",
            {"enabled": True},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["error"],
            "No push token registered. Please register a push token first.",
        )
